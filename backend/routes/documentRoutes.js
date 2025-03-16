import express from 'express';
import { userAuthMiddleware } from '../middleware/userAuth.js';
import { processDocument } from '../controllers/processDocController.js';
import { 
  getUserDocuments, 
  getDocumentViewUrl, 
  deleteUserDocument 
} from '../controllers/getDocs.js';

const router = express.Router();

// Process document route
router.post('/process', userAuthMiddleware, processDocument);

// Get all documents for a user
router.get('/documents', userAuthMiddleware, getUserDocuments);

// Get presigned URL to view a document
router.get('/documents/:documentId/view', userAuthMiddleware, getDocumentViewUrl);

// Delete a document
router.delete('/documents/:documentId', userAuthMiddleware, deleteUserDocument);

export default router;
