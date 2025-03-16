// src/controllers/documentController.js
import { s3 } from '../config/s3.js';

export const getDocuments = async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({ 
        success: false, 
        message: 'S3 key is required' 
      });
    }

    try {
      // First check if the object exists
      await s3.headObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      }).promise();

      // Generate signed URL with content-type enforcement
      const url = s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Expires: 3600, // 1 hour
        ResponseContentType: 'application/pdf'
      });
      
      return res.json({ 
        success: true, 
        url,
        contentType: 'application/pdf'
      });

    } catch (err) {
      if (err.code === 'NotFound') {
        return res.status(404).json({ 
          success: false, 
          message: 'PDF file not found' 
        });
      }
      throw err; // Re-throw other errors to be caught by outer catch block
    }
    
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to generate URL',
      error: error.message 
    });
  }
};