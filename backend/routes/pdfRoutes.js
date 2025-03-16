// src/routes/pdfRoutes.js
import express from 'express';
import { userAuthMiddleware } from '../middleware/userAuth.js';
import { generatePDF } from '../controllers/pdfController.js';

const router = express.Router();

router.post('/', userAuthMiddleware, generatePDF);

export default router;
