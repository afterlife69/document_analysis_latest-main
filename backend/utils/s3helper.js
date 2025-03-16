import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { s3 } from '../config/s3.js';

// Upload a file to S3
export const uploadFileToS3 = async (file, category = 'documents') => {
  try {
    // Generate unique filename to avoid collisions
    const fileExtension = file.originalname.split('.').pop();
    const key = `${category}/${uuidv4()}.${fileExtension}`;
    
    // Create upload params
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype
    };
    
    // Upload to S3 using aws-sdk
    const result = await new Promise((resolve, reject) => {
      s3.upload(uploadParams, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    
    // Clean up temp file
    fs.unlinkSync(file.path);
    
    return { key, filename: file.originalname };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// Generate a pre-signed URL for accessing a file
export const getSignedFileUrl = async (key) => {
  try {
    // Generate signed URL using aws-sdk
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Expires: 3600 // 1 hour
    };
    
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate file access URL');
  }
};
