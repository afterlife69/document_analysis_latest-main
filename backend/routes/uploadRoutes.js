// src/routes/uploadRoutes.js
import express from 'express';
import multer from 'multer';
import { userAuthMiddleware } from '../middleware/userAuth.js';
import { processQP } from '../controllers/processQPController.js';
import { uploadMiddleware, uploadDocuments } from '../controllers/uploadController.js';

const router = express.Router();

// Configure multer storage for question paper uploads
const storage = multer.memoryStorage(); // Store files in memory to access as buffer

const questionPaperUpload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Add file upload middleware to the question-paper route
router.post('/question-paper', 
  userAuthMiddleware, 
  questionPaperUpload.single('questionPaper'), // This must match the field name in FormData
  processQP
);

// Existing documents upload route
router.post('/', userAuthMiddleware, uploadMiddleware, uploadDocuments);

export default router;
