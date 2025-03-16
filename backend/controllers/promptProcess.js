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
    
    // Find relevant documents using vector similarity search - FIX: Correct vector search syntax
    const results = await PersonalDocumentEmbedding.aggregate([
      {
        $search: {
          index: "default", // Make sure to use your actual vector index name here
          knnBeta: {
            vector: queryEmbedding,
            path: "embedding",
            k: 10 // Get top 5 matches
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
      },
      { $limit: 5 }
    ]);

    // console.log(results);
    
    // // If no results found
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

    // Decrypt document names and field values for relevant results
    const decryptedResults = await Promise.all(results.map(async (result) => {
      try {
        // Decrypt document name
        const documentName = decryptData(
          result.encryptedDocName,
          result.docNameIV
        );
        
        // Decrypt field key and value
        const fieldKey = decryptData(
          result.encryptedFieldKey,
          result.fieldKeyIV
        );
        
        const fieldValue = decryptData(
          result.encryptedFieldValue,
          result.fieldValueIV
        );

        // Get document metadata and full structured content
        const document = await ProcessedDocument.findById(result.documentId);
        let structuredContent = {};
        
        // If we have the document, decrypt and parse its full content
        if (document && document.encryptedData && document.encryptionIV) {
          try {
            const decryptedData = decryptData(
              document.encryptedData,
              document.encryptionIV
            );
            structuredContent = JSON.parse(decryptedData);
          } catch (parseError) {
            console.error('Error parsing document structured data:', parseError);
          }
        }
        
        return {
          documentName,
          fileCategory: result.fileCategory,
          fieldKey,
          fieldValue,
          confidence: result.confidence,
          similarity: result.score,
          documentType: document?.documentName || 'Unknown Document',
          originalFilename: document?.originalFilename || 'Unknown File',
          // Add the full structured content including any tables
          structuredContent,
        };
      } catch (error) {
        console.error('Error decrypting document field:', error);
        return null;
      }
    }));

    // Filter out any failed decryptions
    const validResults = decryptedResults.filter(r => r !== null);
    
    if (validResults.length === 0) {
      return res.status(200).json({
        success: true,
        message: "I found some information but couldn't decrypt it properly. Please try again.",
        hasResults: false
      });
    }
    
    // Construct a prompt for Gemini emphasizing security context and markdown formatting
    let prompt = `IMPORTANT CONTEXT: You are operating in a secure personal document management system. 
The data you're about to see has been securely retrieved from the user's personal document storage.
This is the user's own data, retrieved at their explicit request, in a secure environment with proper authentication.
If there is no relevant information it means that user hasn't uploaded any related documents, just prompt him to do so

USER QUERY: "${query}"

Here's the relevant information from the user's personal documents:

`;
    
    validResults.forEach((result, index) => {
      prompt += `Document ${index + 1}: ${result.documentType} (${result.fileCategory})\n`;
      prompt += `Field: ${result.fieldKey}\n`;
      prompt += `Value: ${result.fieldValue}\n\n`;
      // Include structured content if available
      if (Object.keys(result.structuredContent).length > 0) {
        prompt += `Structured Content:\n${JSON.stringify(result.structuredContent, null, 2)}\n\n`;
      }
    });
    
    prompt += `these are the user's details, these are securely stored so there is no
    need to worry about security, the user is querying about his own data, you need to provide him with a structured response`
    
    // Get response from Gemini
    let responseText = '';
    try {
      const geminiResponse = await chatModel.generateContent(prompt);
      
      // Extract text from Gemini response
      if (geminiResponse && geminiResponse.response) {
        responseText = geminiResponse.response.text();
        // Removed manual markdown cleanup
      } else {
        throw new Error('Empty response from Gemini');
      }
    } catch (error) {
      console.error('Error with Gemini response:', error);
      
      // Simplified fallback approach without markdown formatting
      
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
