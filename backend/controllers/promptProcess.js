import { chatModel, getEmbedding } from '../utils/ai.js';
import { decryptData } from '../utils/encryption.js';
import PersonalDocumentEmbedding from '../models/PersonalDocumentEmbedding.js';
import ProcessedDocument from '../models/ProcessedDocument.js';
import mongoose from 'mongoose';

/**
 * Simple encoding/decoding functions for masking sensitive data
 */
const encodeForAI = (text) => {
  // Convert any input type to string first to avoid Buffer errors with numbers
  const stringValue = String(text);
  // Simple encoding: Base64 + reverse
  return Buffer.from(stringValue).toString('base64').split('').reverse().join('');
};

const decodeFromAI = (encoded) => {
  // Simple decoding: Reverse + Base64 decode
  try {
    return Buffer.from(encoded.split('').reverse().join(''), 'base64').toString();
  } catch (e) {
    console.error('Error decoding text:', e);
    return encoded; // Return original if decoding fails
  }
};

/**
 * Find and replace encoded values in text with their decoded versions
 */
const replaceEncodedValues = (text, encodedValueMap) => {
  let result = text;
  Object.entries(encodedValueMap).forEach(([encoded, original]) => {
    // Replace all occurrences of the encoded value with original
    const regex = new RegExp(escapeRegExp(encoded), 'g');
    result = result.replace(regex, original);
  });
  return result;
};

// Helper to escape special regex characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Process a user's natural language query about their documents
 */
export const processPrompt = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.userId;

    if (!query || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query and user authentication are required'
      });
    }

    // Generate embeddings for the search query
    const queryEmbedding = await getEmbedding(query);
    
    // Find relevant documents using vector similarity search
    const results = await PersonalDocumentEmbedding.aggregate([
      {
        $search: {
          index: "default", // Use your actual vector index name
          knnBeta: {
            vector: queryEmbedding,
            path: "embedding",
            k: 5 // Get top 5 matches - reduced from 10 since we now have complete documents
          },
        }
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          fileCategory: 1,
          encryptedDocName: 1,
          docNameIV: 1,
          encryptedFieldKey: 1,
          fieldKeyIV: 1,
          encryptedFieldValue: 1,
          fieldValueIV: 1,
          confidence: 1,
          score: { $meta: "searchScore" }
        }
      }
    ]);
    console.log(results);
    
    // If no results found
    if (!results || results.length === 0) {
      // Generate a response for no results found
      const noResultsResponse = await chatModel.generateContent(
        `The user asked: "${query}". I couldn't find any relevant information in your documents. Please respond politely and suggest they try another query or upload documents if they haven't yet.`
      );
      
      const responseText = noResultsResponse.response?.text() || 
                          "I couldn't find any relevant information in your documents. Please try a different question or consider uploading documents if you haven't done so.";
      
      return res.status(200).json({
        success: true,
        message: responseText,
        hasResults: false
      });
    }

    // Decrypt and process document content from the single-document embeddings
    const decryptedResults = await Promise.all(results.map(async (result) => {
      try {
        // Decrypt document name
        const documentName = decryptData(
          result.encryptedDocName,
          result.docNameIV
        );
        
        // Decrypt field key (should be "complete_document" in the new approach)
        const fieldKey = decryptData(
          result.encryptedFieldKey,
          result.fieldKeyIV
        );
        
        // This now contains the entire structured document data
        const structuredContent = decryptData(
          result.encryptedFieldValue,
          result.fieldValueIV
        );

        // Get additional document metadata
        const document = await ProcessedDocument.findById(result.documentId);
        
        return {
          documentName,
          documentType: document?.documentName || documentName,
          fileCategory: result.fileCategory,
          originalFilename: document?.originalFilename || 'Unknown File',
          // The entire structured content is now available directly
          structuredContent,
          similarity: result.score,
        };
      } catch (error) {
        console.error('Error decrypting document:', error);
        return null;
      }
    }));

    // Filter out any failed decryptions
    const validResults = decryptedResults.filter(r => r !== null);
    
    if (validResults.length === 0) {
      return res.status(200).json({
        success: true,
        message: "I found some information but couldn't process it properly. Please try again.",
        hasResults: false
      });
    }
    
    // Format the data from each document into a more structured representation for the AI
    const formattedDocuments = validResults.map((doc, index) => {
      // Create a summary representation of the document content for the prompt
      let contentSummary;
      
      try {
        if (doc.structuredContent) {
          // For Document type with content property
          if (doc.structuredContent.content) {
            contentSummary = doc.structuredContent.content;
          } 
          // For Document type with old format
          else if (doc.structuredContent.fields) {
            contentSummary = doc.structuredContent.fields;
          }
          // For Timetable type
          else if (doc.fileCategory === 'Timetable' && doc.structuredContent.events) {
            contentSummary = { events: doc.structuredContent.events };
          }
          // Fallback
          else {
            contentSummary = doc.structuredContent;
          }
        } else {
          contentSummary = { note: "No structured content available" };
        }
      } catch (error) {
        console.error('Error formatting document content:', error);
        contentSummary = { error: "Content could not be processed" };
      }
      
      return {
        index: index + 1,
        name: doc.documentName,
        type: doc.documentType,
        category: doc.fileCategory,
        filename: doc.originalFilename,
        relevance: doc.similarity,
        content: contentSummary
      };
    });

    // Construct a prompt for Gemini that handles nested JSON data effectively
    let prompt = `IMPORTANT CONTEXT: You are answering a question about the user's personal documents.
User Query: "${query}"

I've found ${validResults.length} relevant document(s) in the user's secure storage. Here's the structured content:

`;
    
    // Include formatted document content in the prompt
    formattedDocuments.forEach(doc => {
      prompt += `\n--- DOCUMENT ${doc.index}: ${doc.name} (${doc.category}) ---\n`;
      prompt += `Type: ${doc.type}\n`;
      prompt += `Filename: ${doc.filename}\n`;
      prompt += `Content: ${JSON.stringify(doc.content, null, 2)}\n`;
    });
    
    prompt += `\n\nINSTRUCTIONS:
1. Answer the user's query using ONLY the information from these documents.
2. If the documents contain nested data structures (like subject marks with internal/external grades), navigate and explain this data clearly.
3. If the information is organized in tables or hierarchical structures, present it in a readable format.
4. If the query cannot be answered from these documents, say so clearly.
5. This is the user's own securely stored data, so you can share it freely with them.

Provide a clear, helpful response that directly addresses the user's query using the document content.`;
    
    // Get response from Gemini
    let responseText = '';
    try {
      const geminiResponse = await chatModel.generateContent(prompt);
      
      // Extract text from Gemini response
      if (geminiResponse && geminiResponse.response) {
        responseText = geminiResponse.response.text();
      } else {
        throw new Error('Empty response from Gemini');
      }
    } catch (error) {
      console.error('Error with Gemini response:', error);
      responseText = "I found relevant information but had trouble processing it. Please try rephrasing your question.";
    }
    
    // Return the response to the frontend
    return res.status(200).json({
      success: true,
      message: responseText,
      hasResults: true,
      resultCount: validResults.length
    });
    
  } catch (error) {
    console.error('Error processing prompt:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while processing your question'
    });
  }
};

export default {
  processPrompt
};
