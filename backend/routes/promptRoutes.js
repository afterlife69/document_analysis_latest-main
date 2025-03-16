import express from 'express';
import { processPrompt } from '../controllers/promptProcess.js';
import { userAuthMiddleware } from '../middleware/userAuth.js';

const router = express.Router();

// Route for processing natural language queries about user's documents
router.post('/query', userAuthMiddleware, processPrompt);

export default router;
