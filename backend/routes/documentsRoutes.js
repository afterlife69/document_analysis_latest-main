// src/routes/documentRoutes.js
import express from 'express';
import { userAuthMiddleware } from '../middleware/userAuth.js';
import { getDocuments } from '../controllers/documentController.js';

const router = express.Router();

router.get('/url', userAuthMiddleware, getDocuments);

export default router;
