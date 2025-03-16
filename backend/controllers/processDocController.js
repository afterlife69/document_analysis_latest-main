import AWS from 'aws-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { chatModel, getEmbedding } from '../utils/ai.js';
import { encryptData } from '../utils/encryption.js';
import { uploadFileToS3 } from '../utils/s3helper.js';
import ProcessedDocument from '../models/ProcessedDocument.js';
import DocumentEmbedding from '../models/PersonalDocumentEmbedding.js';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Set up file filter for allowed extensions
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PNG, JPEG files are allowed.'), false);
  }
};

// Create multer uploader
const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Create AWS Textract client
const textract = new AWS.Textract();

// Helper function to extract text using AWS Textract with enhanced table processing
const extractTextFromDocument = async (filePath) => {
  try {
    const fileData = fs.readFileSync(filePath);
    
    // Request all possible data types from Textract
    const params = {
      Document: {
        Bytes: fileData
      },
      FeatureTypes: ['TABLES', 'FORMS'] // Request core extraction features
    };
    
    const response = await textract.analyzeDocument(params).promise();
    
    // Extract plain text
    let extractedText = '';
    let tables = [];
    let forms = {};
    
    if (response.Blocks) {
      // Extract plain text
      const textBlocks = response.Blocks.filter(block => block.BlockType === 'LINE');
      extractedText = textBlocks.map(block => block.Text).join('\n');
      
      // Process tables into structured JSON
      const tableBlocks = response.Blocks.filter(block => block.BlockType === 'TABLE');
      
      for (const tableBlock of tableBlocks) {
        const tableId = tableBlock.Id;
        
        // Get all cells belonging to this table
        const cellBlocks = response.Blocks.filter(
          block => block.BlockType === 'CELL' && 
          block.TableId === tableId
        );
        
        // Safety check - make sure we have cells to process
        if (cellBlocks.length === 0) continue;
        
        // Find table dimensions with validation
        const rowIndices = cellBlocks.map(cell => cell.RowIndex || 0).filter(idx => idx > 0);
        const colIndices = cellBlocks.map(cell => cell.ColumnIndex || 0).filter(idx => idx > 0);
        
        // Handle empty arrays or invalid indices
        if (rowIndices.length === 0 || colIndices.length === 0) continue;
        
        const maxRow = Math.min(Math.max(...rowIndices), 100); // Limit to reasonable size
        const maxCol = Math.min(Math.max(...colIndices), 50);  // Limit to reasonable size
        
        try {
          // Create a more comprehensive table representation
          const tableData = {
            id: tableId,
            rowCount: maxRow,
            columnCount: maxCol,
            cells: {},
            cellMatrix: [],
            headerRow: [],
            dataRows: [],
            tableJson: {} // Will hold a JSON representation where headers are keys
          };
          
          // Create matrix (2D array) representation
          for (let i = 0; i < maxRow; i++) {
            tableData.cellMatrix.push(new Array(maxCol).fill(''));
          }
          
          // Process each cell into both positional and structural representations
          for (const cell of cellBlocks) {
            if (!cell.RowIndex || !cell.ColumnIndex) continue;
            
            const rowIndex = cell.RowIndex - 1; // 0-indexed
            const colIndex = cell.ColumnIndex - 1; // 0-indexed
            
            // Valid index check
            if (rowIndex < 0 || rowIndex >= maxRow || colIndex < 0 || colIndex >= maxCol) continue;
            
            // Extract cell text
            let cellText = '';
            if (cell.Relationships && cell.Relationships.some(rel => rel.Type === 'CHILD')) {
              const childIds = cell.Relationships.find(rel => rel.Type === 'CHILD').Ids;
              for (const childId of childIds) {
                const wordBlock = response.Blocks.find(block => block.Id === childId);
                if (wordBlock && wordBlock.Text) {
                  cellText += wordBlock.Text + ' ';
                }
              }
              cellText = cellText.trim();
            }
            
            // Store in cell matrix
            tableData.cellMatrix[rowIndex][colIndex] = cellText;
            
            // Store in cells object with position as key
            tableData.cells[`${rowIndex},${colIndex}`] = {
              text: cellText,
              rowSpan: cell.RowSpan || 1,
              columnSpan: cell.ColumnSpan || 1,
              confidence: cell.Confidence
            };
          }
          
          // Determine if first row is a header
          const isFirstRowHeader = cellBlocks.some(cell => 
            cell.RowIndex === 1 && 
            (cell.EntityTypes?.includes('COLUMN_HEADER') || 
             // Alternative heuristic: first row is typically bold or has different styling
             cell.TextType === 'PRINTED' && cellBlocks.some(c => c.RowIndex > 1 && c.TextType !== 'PRINTED'))
          );
          
          // Process first row as header if applicable
          if (isFirstRowHeader && tableData.cellMatrix.length > 0) {
            tableData.headerRow = tableData.cellMatrix[0].map(cell => cell || '');
            
            // Process data rows into objects using headers as keys
            if (tableData.cellMatrix.length > 1) {
              // For each data row (skipping header)
              for (let i = 1; i < tableData.cellMatrix.length; i++) {
                const rowObject = {};
                const row = tableData.cellMatrix[i];
                
                // Map each cell to its header
                for (let j = 0; j < row.length; j++) {
                  const header = tableData.headerRow[j];
                  if (header) {
                    // Clean header text for use as property name
                    const cleanHeader = header.trim()
                      .replace(/[^\w\s]/g, '') // Remove special chars
                      .replace(/\s+/g, '_')    // Replace spaces with underscores
                      .toLowerCase();           
                      
                    rowObject[cleanHeader] = row[j];
                    // Also keep original header text as key
                    rowObject[header] = row[j];
                  }
                }
                
                tableData.dataRows.push(rowObject);
              }
              
              // Create table JSON representation
              tableData.tableJson = {
                headers: tableData.headerRow,
                rows: tableData.dataRows
              };
            }
          } else {
            // No header row detected, but still create JSON representation
            tableData.tableJson = {
              data: tableData.cellMatrix.map(row => 
                row.reduce((obj, cell, idx) => {
                  obj[`column_${idx + 1}`] = cell;
                  return obj;
                }, {})
              )
            };
          }
          
          // Generate a plain text version for fallback
          tableData.plainText = tableData.cellMatrix.map(row => row.join(' | ')).join('\n');
          
          // Add table to collection
          tables.push(tableData);
        } catch (tableErr) {
          console.error('Error processing table:', tableErr);
          // Continue with other tables even if one fails
        }
      }
      
      // Process form fields into key-value pairs
      const keyBlocks = response.Blocks.filter(block => 
        block.BlockType === 'KEY_VALUE_SET' && 
        block.EntityTypes && 
        block.EntityTypes.includes('KEY')
      );
      
      for (const keyBlock of keyBlocks) {
        try {
          // Find the key text
          let keyText = '';
          if (keyBlock.Relationships) {
            const keyWordIds = keyBlock.Relationships.find(rel => rel.Type === 'CHILD')?.Ids || [];
            keyText = extractTextFromWordIds(keyWordIds, response.Blocks);
            
            // Find the value associated with this key
            const valueRelationship = keyBlock.Relationships.find(rel => rel.Type === 'VALUE');
            if (valueRelationship && valueRelationship.Ids.length > 0) {
              const valueBlockId = valueRelationship.Ids[0];
              const valueBlock = response.Blocks.find(block => block.Id === valueBlockId);
              
              if (valueBlock && valueBlock.Relationships) {
                const valueWordIds = valueBlock.Relationships.find(rel => rel.Type === 'CHILD')?.Ids || [];
                const valueText = extractTextFromWordIds(valueWordIds, response.Blocks);
                
                // Add to forms object
                if (keyText && valueText) {
                  forms[keyText] = valueText;
                }
              }
            }
          }
        } catch (formErr) {
          console.error('Error processing form field:', formErr);
          // Continue with other fields even if one fails
        }
      }
    }
    
    return {
      extractedText,
      tables,
      forms,
      pageCount: countPages(response.Blocks),
      documentMetadata: response.DocumentMetadata || {}
    };
  } catch (error) {
    console.error('Textract error:', error);
    throw new Error('Failed to extract text from document');
  }
};

// Helper to extract text from word IDs - add safety checks
function extractTextFromWordIds(wordIds, blocks) {
  if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) return '';
  
  let text = '';
  for (const wordId of wordIds) {
    const wordBlock = blocks.find(block => block.Id === wordId && block.BlockType === 'WORD');
    if (wordBlock && wordBlock.Text) {
      text += wordBlock.Text + ' ';
    }
  }
  return text.trim();
}

// Helper to count pages in document
function countPages(blocks) {
  if (!blocks || !Array.isArray(blocks)) return 0;
  const pageBlocks = blocks.filter(block => block.BlockType === 'PAGE');
  return pageBlocks.length;
}

// Simplified recursive function to process nested data objects for the prompt
function processObjectForPrompt(obj, indent = '', depth = 0) {
  // Add depth limit to prevent stack overflow
  if (depth > 5) return "{ ... }";
  
  if (!obj) return 'null';
  
  if (typeof obj !== 'object') {
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    
    // For large arrays, show just first few elements
    if (obj.length > 10) {
      const sample = obj.slice(0, 5);
      let result = '[\n';
      for (let i = 0; i < sample.length; i++) {
        result += `${indent}  ${processObjectForPrompt(sample[i], indent + '  ', depth + 1)}${i < sample.length - 1 ? ',' : ''}\n`;
      }
      result += `${indent}  ... ${obj.length - 5} more items\n`;
      return result + indent + ']';
    }
    
    let result = '[\n';
    for (let i = 0; i < obj.length; i++) {
      result += `${indent}  ${processObjectForPrompt(obj[i], indent + '  ', depth + 1)}${i < obj.length - 1 ? ',' : ''}\n`;
    }
    return result + indent + ']';
  }
  
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  
  let result = '{\n';
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result += `${indent}  "${key}": ${processObjectForPrompt(obj[key], indent + '  ', depth + 1)}${i < keys.length - 1 ? ',' : ''}\n`;
  }
  return result + indent + '}';
}

// Enhanced prompt construction with improved JSON handling for tables
const constructPrompt = (fileCategory, documentType, extractionResult, filename) => {
  const { extractedText, tables, forms, pageCount } = extractionResult;
  
  // Format tables as Markdown tables for human-readable representation only
  let tablesMarkdown = '';
  if (tables && tables.length > 0) {
    tablesMarkdown = '\n\nTABLES:\n';
    
    tables.forEach((table, tableIndex) => {
      tablesMarkdown += `Table ${tableIndex + 1}:\n`;
      
      if (table.headerRow && table.headerRow.length > 0) {
        // Table with headers
        tablesMarkdown += '| ' + table.headerRow.join(' | ') + ' |\n';
        tablesMarkdown += '|' + table.headerRow.map(() => '---').join('|') + '|\n';
        
        // Data rows
        if (table.cellMatrix && table.cellMatrix.length > 1) {
          // Skip header row (index 0), and limit rows to avoid token limits
          const maxRows = Math.min(table.cellMatrix.length, 10); // Show max 10 rows
          for (let i = 1; i < maxRows; i++) {
            tablesMarkdown += '| ' + table.cellMatrix[i].join(' | ') + ' |\n';
          }
          if (table.cellMatrix.length > maxRows) {
            tablesMarkdown += '| ... and more rows ... |\n';
          }
        }
      } 
      else if (table.cellMatrix && table.cellMatrix.length > 0) {
        // Table without explicit headers
        const maxRows = Math.min(table.cellMatrix.length, 10); // Show max 10 rows
        for (let i = 0; i < maxRows; i++) {
          tablesMarkdown += '| ' + table.cellMatrix[i].join(' | ') + ' |\n';
        }
        if (table.cellMatrix.length > maxRows) {
          tablesMarkdown += '| ... and more rows ... |\n';
        }
      }
      else if (table.plainText) {
        // Fallback to plain text representation
        tablesMarkdown += table.plainText + '\n';
      }
      
      tablesMarkdown += '\n';
    });
  }
  
  // Format forms
  let formsText = '';
  if (forms && Object.keys(forms).length > 0) {
    formsText = '\n\nFORM_FIELDS:\n';
    for (const [key, value] of Object.entries(forms)) {
      formsText += `${key}: ${value}\n`;
    }
  }
  
  // Create a prompt that focuses on text content and simplified table format
  if (fileCategory === 'Document') {
    return `Analyze this ${documentType} document and extract ALL important information:

TEXT CONTENT:
${extractedText}

${tablesMarkdown}

${formsText || ''}

INSTRUCTIONS:
1. Process the text, visible tables, and form fields to extract ALL important information
2. Create structured fields with appropriate values for this document type
3. Identify key information like dates, names, numbers, and categories
4. Use descriptive field names that reflect the document's content

Output format:
{
  "document_type": "${documentType}",
  "fields": {
    "Field1": {"value": "extracted value", "confidence": 0.95},
    "Field2": {"value": "extracted value", "confidence": 0.90}
  },
  "metadata": {
    "source_file": "${filename}",
    "extraction_date": "${new Date().toISOString()}",
    "page_count": ${pageCount || 1}
  }
}

Return ONLY valid JSON with no markdown or explanations.`;
  }
  
  // Default prompt for other categories
  return `Extract information from this document:

TEXT:
${extractedText}
${tablesMarkdown}
${formsText}

Return JSON with extracted data.`;
};

// For backward compatibility, keep the original function name using the new implementation
const constructPromptForGemini = constructPrompt;

// Helper to generate embeddings for document fields
const generateFieldEmbeddings = async (docId, userId, documentName, fileCategory, structuredData) => {
  try {
    const embeddings = [];
    
    // Encrypt the document name once for all embeddings
    const { encryptedData: encryptedDocName, iv: docNameIV } = encryptData(documentName);
    
    if (fileCategory === 'Document' && structuredData.fields) {
      // For documents, generate embedding for each field
      for (const [key, data] of Object.entries(structuredData.fields)) {
        // We still need the plaintext for generating the embedding
        const textToEmbed = `[${documentName}] ${key}: ${data.value}`;
        const embedding = await getEmbedding(textToEmbed);
        console.log(textToEmbed);
        
        // Encrypt fieldKey and fieldValue
        const { encryptedData: encryptedFieldKey, iv: fieldKeyIV } = encryptData(key);
        const { encryptedData: encryptedFieldValue, iv: fieldValueIV } = encryptData(data.value);
        
        embeddings.push({
          documentId: docId,
          userId,
          // Replace documentName with encrypted version
          encryptedDocName,
          docNameIV,
          fileCategory,
          // Encrypted field data (already implemented)
          encryptedFieldKey,
          fieldKeyIV,
          encryptedFieldValue,
          fieldValueIV,
          embedding,
          confidence: data.confidence
        });
      }
    } else if (fileCategory === 'Timetable' && structuredData.events) {
      // For timetables, generate embedding for each event
      for (let i = 0; i < structuredData.events.length; i++) {
        const event = structuredData.events[i];
        const textToEmbed = `[${documentName}] ${event.day} ${event.start_time}-${event.end_time}: ${event.subject} ${event.location || ''}`;
        const embedding = await getEmbedding(textToEmbed);
        console.log(textToEmbed);
        
        // Generate a fieldKey for this event
        const fieldKey = `event_${i}`;
        
        // Encrypt fieldKey and fieldValue
        const { encryptedData: encryptedFieldKey, iv: fieldKeyIV } = encryptData(fieldKey);
        const { encryptedData: encryptedFieldValue, iv: fieldValueIV } = encryptData(textToEmbed);
        
        embeddings.push({
          documentId: docId,
          userId,
          // Replace documentName with encrypted version
          encryptedDocName,
          docNameIV,
          fileCategory,
          // Encrypted field data (already implemented)
          encryptedFieldKey,
          fieldKeyIV,
          encryptedFieldValue,
          fieldValueIV,
          embedding,
          confidence: event.confidence || 1.0
        });
      }
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
};

// Process document controller
export const processDocument = [
  // Use multer middleware to handle file uploads
  upload.array('files', 4), // Max 4 files
  
  // Main controller function
  async (req, res) => {
    try {
      // Get data from request
      const { documentType, fileCategory } = req.body;
      const files = req.files;
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded' });
      }
      
      if (!documentType) {
        return res.status(400).json({ success: false, message: 'Document name is required' });
      }
      
      if (!fileCategory || !['Document', 'Timetable'].includes(fileCategory)) {
        return res.status(400).json({ success: false, message: 'Valid file category is required' });
      }
      
      // Process results for response
      const processedResults = [];
      
      // Process each file
      for (const file of files) {
        // Extract text from document using AWS Textract with enhanced extraction
        const extractionResult = await extractTextFromDocument(file.path);
        
        if (!extractionResult.extractedText || extractionResult.extractedText.trim() === '') {
          console.warn(`No text extracted from file: ${file.originalname}`);
          continue;
        }
        
        // Upload file to S3
        const s3Result = await uploadFileToS3(file, fileCategory.toLowerCase());
        
        // Use Gemini to structure the extracted text with enhanced data
        const prompt = constructPromptForGemini(fileCategory, documentType, extractionResult, file.originalname);
        
        // Fix: Add proper error handling for Gemini API call
        let geminiResponse;
        try {
          geminiResponse = await chatModel.generateContent(prompt);
        } catch (error) {
          console.error('Gemini API error:', error);
          return res.status(500).json({ 
            success: false, 
            message: 'Error generating structured data from document content' 
          });
        }
        
        // Fix: Handle Gemini response structure correctly
        let geminiText = '';
        try {
          // Access the response correctly based on the Gemini API structure
          if (geminiResponse && geminiResponse.response) {
            geminiText = geminiResponse.response.text();
          } else if (geminiResponse && geminiResponse.text) {
            geminiText = geminiResponse.text;
          } else if (geminiResponse && typeof geminiResponse === 'object') {
            // Try to get the first candidate's content if available
            const candidates = geminiResponse.candidates || 
                              (geminiResponse.candidates && geminiResponse.candidates[0].content) ||
                              [];
            
            if (candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
              geminiText = candidates[0].content.parts[0].text || JSON.stringify(candidates[0].content.parts[0]);
            } else {
              // Fallback: try to stringify the entire response
              geminiText = JSON.stringify(geminiResponse);
            }
          }
          
          if (!geminiText) {
            throw new Error('Empty response from Gemini API');
          }
        } catch (error) {
          console.error('Error parsing Gemini response:', error);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to process AI response' 
          });
        }
        
        // Extract JSON from Gemini response
        let structuredData;
        try {
          // Find JSON in the response - look for pattern that looks like JSON
          // First check if we already have JSON
          if (geminiText.startsWith('{') && geminiText.endsWith('}')) {
            structuredData = JSON.parse(geminiText);
          } else {
            // Look for JSON code blocks
            const jsonMatch = geminiText.match(/```json\s*([\s\S]*?)\s*```/) || 
                            geminiText.match(/{[\s\S]*?}/);
            
            if (!jsonMatch) {
              throw new Error('No valid JSON found in the response');
            }
            
            const jsonString = jsonMatch[1] || jsonMatch[0];
            structuredData = JSON.parse(jsonString.replace(/```json|```/g, '').trim());
          }
          
          if (!structuredData) {
            throw new Error('Failed to parse structured data');
          }

          // Add the full table JSON data to the structured data for storage
          // This doesn't affect the LLM processing, but ensures we store the complete data
          if (structuredData && extractionResult.tables && extractionResult.tables.length > 0) {
            const tablesData = extractionResult.tables.map(table => ({
              rowCount: table.rowCount,
              columnCount: table.columnCount,
              headers: table.headerRow || [],
              data: table.tableJson || { rows: table.dataRows || [] }
            }));
            
            // Add tables to the structured data
            structuredData.tables = tablesData;
          }
          
        } catch (error) {
          console.error('Error parsing structured data:', error, 'Response:', geminiText);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to structure extracted data' 
          });
        }
        
        // Encrypt the structured data
        const { encryptedData, iv } = encryptData(structuredData);
        
        // Create document record in database
        const processedDoc = new ProcessedDocument({
          userId,
          documentName: documentType,
          originalFilename: file.originalname,
          fileCategory,
          fileType: file.mimetype,
          fileSize: file.size,
          encryptedData,
          encryptionIV: iv,
          s3Key: s3Result.key
        });
        
        await processedDoc.save();
        
        // Generate embeddings for the document fields
        const embeddings = await generateFieldEmbeddings(
          processedDoc._id,
          userId,
          documentType,
          fileCategory,
          structuredData
        );
        
        // Save embeddings to database
        if (embeddings.length > 0) {
          await DocumentEmbedding.insertMany(embeddings);
        }
        
        // Add to results
        processedResults.push({
          filename: file.originalname,
          documentId: processedDoc._id,
          success: true
        });
      }
      
      // Return results
      return res.status(200).json({
        success: true,
        message: 'Documents processed successfully',
        results: processedResults
      });
      
    } catch (error) {
      console.error('Process document error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while processing the documents'
      });
    }
  }
];

// Export the controller
export default {
  processDocument
};