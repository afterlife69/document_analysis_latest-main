// src/app.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import leaderboardRoute from './routes/leaderboardRoutes.js';
import SubjectRoute from './routes/subjectRoutes.js';
import PersonalDocRoute from './routes/documentRoutes.js';
import promptRoutes from './routes/promptRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use((req,res,next) =>{
  console.log(`received ${req.method} request from ${req.url}`);
  next();
})
// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/leaderboard', leaderboardRoute);
app.use('/api/subjects', SubjectRoute);
app.use('/api/personal', PersonalDocRoute);
app.use('/api/personal', promptRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
