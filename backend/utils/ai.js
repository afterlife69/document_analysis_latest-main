// src/utils/ai.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Generative AI models
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
export const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

// Helper function for getting embeddings
export async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}