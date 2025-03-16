
import express from 'express';
import { debugGeminiResponse } from '../controllers/debugController.js';

const router = express.Router();

// Debug route for testing Gemini responses
router.post('/test-gemini', debugGeminiResponse);

export default router;