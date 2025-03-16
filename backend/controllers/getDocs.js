import AWS from 'aws-sdk';
import ProcessedDocument from '../models/ProcessedDocument.js';
import { decryptData } from '../utils/encryption.js';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create S3 service object
const s3 = new AWS.S3();

// Get all documents for a user
export const getUserDocuments = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    // Get all documents for this user
    const documents = await ProcessedDocument.find({ userId }).sort({ createdAt: -1 });
    
    // Format the documents for client response
    const formattedDocs = documents.map(doc => {
      // Decrypt the document data
      let structuredData = {};
      try {
        structuredData = decryptData(doc.encryptedData, doc.encryptionIV);
      } catch (error) {
        console.error(`Error decrypting document ${doc._id}:`, error);
        structuredData = { error: 'Could not decrypt document data' };
      }
      
      // Return formatted document
      return {
        id: doc._id,
        type: doc.documentName,
        name: doc.originalFilename,
        size: doc.fileSize,
        uploadDate: doc.uploadDate || doc.createdAt,
        fileType: doc.fileType,
        fileCategory: doc.fileCategory,
        s3Key: doc.s3Key,
        details: structuredData.fields || {}
      };
    });
    
    return res.status(200).json({
      success: true,
      documents: formattedDocs
    });
  } catch (error) {
    console.error('Error getting user documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents'
    });
  }
};

// Get presigned URL for document viewing
export const getDocumentViewUrl = async (req, res) => {
  try {
    const userId = req.userId;
    const { documentId } = req.params;
    
    if (!userId || !documentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters' 
      });
    }
    
    // Find the document and verify ownership
    const document = await ProcessedDocument.findOne({
      _id: documentId,
      userId
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied'
      });
    }
    
    // Generate a presigned URL
    const s3Params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: document.s3Key,
      Expires: 3600 // URL valid for 1 hour
    };
    
    const presignedUrl = await s3.getSignedUrlPromise('getObject', s3Params);
    
    return res.status(200).json({
      success: true,
      documentUrl: presignedUrl,
      documentName: document.originalFilename,
      documentType: document.documentName,
      fileType: document.fileType
    });
  } catch (error) {
    console.error('Error getting document URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate document view URL'
    });
  }
};

// Delete a document
export const deleteUserDocument = async (req, res) => {
  try {
    const userId = req.userId;
    const { documentId } = req.params;
    
    if (!userId || !documentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters' 
      });
    }
    
    // Find the document and verify ownership
    const document = await ProcessedDocument.findOne({
      _id: documentId,
      userId
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or access denied'
      });
    }
    
    // Delete from S3 if key exists
    if (document.s3Key) {
      try {
        await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: document.s3Key
        }).promise();
      } catch (s3Error) {
        console.error('Error deleting file from S3:', s3Error);
        // Continue with document deletion even if S3 delete fails
      }
    }
    
    // Delete document from database
    await ProcessedDocument.deleteOne({ _id: documentId });
    
    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
};

export default {
  getUserDocuments,
  getDocumentViewUrl,
  deleteUserDocument
};
