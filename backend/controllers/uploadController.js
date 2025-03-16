// src/controllers/uploadController.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import DocumentEmbedding from '../models/documentEmbedding.js';
import { getEmbedding } from '../utils/ai.js';
import { chunkText } from '../utils/textProcessing.js';
import { extractTextFromBuffer } from '../utils/pdfProcessing.js';

// Configure multer (10MB limit per file)
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
});
export const uploadMiddleware = upload.array('document', 10);

export const uploadDocuments = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }
  if (req.files.length > 10) {
    return res.status(400).json({ message: 'Maximum 10 files allowed' });
  }
  try {
    const userId = req.userId;
    
    if (!userId) return res.status(401).json({ message: 'Invalid token' });

    // Generate a unique session ID for this upload
    const sessionId = crypto.randomUUID();

    // Process each PDF: extract text from file buffer
    const processedDocs = await Promise.all(
      req.files.map(async (file) => {
        const text = await extractTextFromBuffer(file.buffer);
        return { filename: file.originalname, text };
      })
    );

    // Generate embeddings for each document's text chunks
    for (const doc of processedDocs) {
      const textChunks = chunkText(doc.text);
      const embeddingPromises = textChunks.map(async (chunk, index) => {
        const embedding = await getEmbedding(chunk);
        const documentEmbedding = new DocumentEmbedding({
          sessionId,
          text: chunk,
          embedding,
          metadata: {
            filename: doc.filename,
            startIndex: index * 1000,
            endIndex: (index + 1) * 1000,
          }
        });
        return documentEmbedding.save();
      });
      await Promise.all(embeddingPromises);
    }
    
    res.status(200).json({
      message: 'Documents processed successfully',
      sessionId,
      documentCount: processedDocs.length,
    });
  } catch (err) {
    console.error('Error processing documents:', err);
    res.status(500).json({ message: 'Error processing documents' });
  }
};
