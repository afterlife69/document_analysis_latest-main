// src/routes/authRoutes.js
import express from 'express';
import { signup, login } from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', login);

export default router;
