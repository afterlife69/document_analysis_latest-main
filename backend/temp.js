import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import User from './models/user.js';
import Document from './models/document.js';
import DocumentEmbedding from './models/documentEmbedding.js';
import jwt from 'jsonwebtoken';
import { userAuthMiddleware } from './middleware/userAuth.js';
import { JWT_SECRET } from './config/jwt.js';
import AWS from 'aws-sdk';
import multer from 'multer';
import { PDFExtract } from 'pdf.js-extract';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import markdownpdf from 'markdown-pdf';
import MarkdownIt from 'markdown-it';
import markdownItLatex from 'markdown-it-latex';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Modify multer configuration to accept multiple files
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

const pdfExtract = new PDFExtract();

// Initialize Gemini AI models
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chatModel = genAI.getGenerativeModel({ model: "gemini-pro" });
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Initialize markdown-it with latex support
const md = new MarkdownIt();
md.use(markdownItLatex);

// Add helper function for getting embeddings
async function getEmbedding(text) {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
}

// Function to chunk text into smaller segments
const chunkText = (text, chunkSize = 1000) => {
    const chunks = [];
    const sentences = text.split('. ');
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length < chunkSize) {
            currentChunk += sentence + '. ';
        } else {
            chunks.push(currentChunk);
            currentChunk = sentence + '. ';
        }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
};

// Add utility function for cosine similarity
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

mongoose.connect(process.env.MONGO_URL).then(() => {
    app.listen(8080 , () => {
      console.log('Connected');
    })
  })

app.post('/signup', async (req, res) => {
    const {username, firstName, lastName, email, password} = req.body;
    try {
        const user = new User({
            username, 
            firstName, 
            lastName, 
            email, 
            password
        });
        await user.save();
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${user._id}/`,
            Body: ''
        };
        await s3.putObject(params).promise();
        res.status(201).send('User Added');
    } catch(err) {
        res.status(500).send(err);
    }
})

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        const isValidPassword = await user.verifyPassword(password)
        
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token =  jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET
        );
        res.status(200).json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }

});

// Replace the upload endpoint
app.post('/upload', userAuthMiddleware, upload.array('document', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }
    if (req.files.length > 10) {
        return res.status(400).json({ message: 'Maximum 10 files allowed' });
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        // Generate unique session ID for this upload
        const sessionId = crypto.randomUUID();

        // Process all PDFs in parallel
        const processPromises = req.files.map(async (file) => {
            const options = {};
            const data = await pdfExtract.extractBuffer(file.buffer, options);
            return {
                filename: file.originalname,
                text: data.pages.map(page => 
                    page.content.map(item => item.str).join(' ')).join('\n')
            };
        });

        const processedDocs = await Promise.all(processPromises);
        
        // Generate embeddings for all documents
        for (const doc of processedDocs) {
            const textChunks = chunkText(doc.text);
            
            // Process chunks in batches
            const embeddingPromises = textChunks.map(async (chunk, index) => {
                const embedding = await getEmbedding(chunk);
                
                const documentEmbedding = new DocumentEmbedding({
                    sessionId,
                    text: chunk,
                    embedding: embedding,
                    metadata: {
                        filename: doc.filename,
                        startIndex: index * 1000,
                        endIndex: (index + 1) * 1000
                    }
                });
                return documentEmbedding.save();
            });

            await Promise.all(embeddingPromises);
        }

        // Upload files to S3 with userId as folder prefix
        const s3UploadPromises = req.files.map(file => {
            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `${userId}/${file.originalname}`,
                Body: file.buffer,
                ContentType: 'application/pdf'
            };
            return s3.upload(params).promise();
        });

        await Promise.all(s3UploadPromises);

        // Update user's document list

        res.status(200).json({ 
            message: 'Documents processed successfully',
            sessionId: sessionId,
            documentCount: processedDocs.length
        });

    } catch (err) {
        console.error('Error processing documents:', err);
        res.status(500).json({ message: 'Error processing documents' });
    }
});



// Replace the /query endpoint
app.post('/query', userAuthMiddleware, async (req, res) => {
    try {
        const { query } = req.body;
        const queryEmbedding = await getEmbedding(query);

        // Fetch all documents and calculate similarity in memory
        const documents = await DocumentEmbedding.find({});
        const similar = documents
            .map(doc => ({
                ...doc.toObject(),
                similarity: cosineSimilarity(doc.embedding, queryEmbedding)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 5);

        res.status(200).json({ results: similar.map(doc => doc.text) });
    } catch (err) {
        console.error('Error details:', err);
        res.status(500).json({ message: 'Error querying documents' });
    }
});

app.get('/getDocuments', userAuthMiddleware, async (req, res) => {
    try {
        const email = req.headers['user-email'];
        const user = await User.findOne({email});
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // List objects in the user's folder
        const s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Prefix: `${user._id}/`
        };

        const s3Objects = await s3.listObjectsV2(s3Params).promise();
        
        const documentsWithLinks = await Promise.all(
            s3Objects.Contents
            .filter(obj => obj.Key.endsWith('.pdf')) // Only include PDF files
            .map(async (obj) => {
                const presignedParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: obj.Key,
                Expires: 3600,
                ResponseContentDisposition: 'inline',
                ResponseContentType: 'application/pdf'
                };

                const presignedUrl = await s3.getSignedUrlPromise('getObject', presignedParams);
                
                return {
                filename: obj.Key.split('/').pop(), // Get filename from key
                createdAt: obj.LastModified,
                downloadUrl: presignedUrl,
                size: obj.Size
                };
            })
        );

        res.status(200).json({ documents: documentsWithLinks });
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ message: 'Error fetching documents' });
    }
});

// Modify the generatePDF endpoint
app.post('/generatePDF', userAuthMiddleware, async (req, res) => {
    try {
        const { questions, sessionId } = req.body;
        console.log(questions);
        
        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        if (!Array.isArray(questions)) {
            return res.status(400).json({ message: 'Questions must be an array' });
        }

        const responses = [];

        for (const question of questions) {
            if (responses.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const questionEmbedding = await getEmbedding(question);
            const documents = await DocumentEmbedding.find({ sessionId });

            const similarContent = documents
                .map(doc => ({
                    ...doc.toObject(),
                    similarity: cosineSimilarity(doc.embedding, questionEmbedding)
                }))
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3);

            const context = similarContent.map(doc => doc.text).join('\n');
            const prompt = `
            Based on the following context, please answer the question in a structured manner.
            
            Context:
            ${context}
            
            Question: ${question}
            
            Please provide a detailed, well-structured response with relevant information from the context.
            Don't just answer the question directly, explain the concepts and provide examples where necessary.
            Include section headings where appropriate and organize the information logically. Add descriptions, examples, and explanations as needed.`;

            if (responses.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            const result = await chatModel.generateContent(prompt);
            const markdownResponse = result.response.text();
            
            // Convert markdown to LaTeX
            const latexResponse = md.render(markdownResponse)
                // Clean up the LaTeX output
                .replace(/<p>/g, '\n')
                .replace(/<\/p>/g, '\n')
                .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
                .trim();
            
            responses.push({
                question,
                answer: markdownResponse,
                latex: latexResponse
            });
        }
        res.status(200).json({ responses });

    } catch (err) {
        console.error('Error details:', err);
        res.status(500).json({ message: 'Error generating responses' });
    }
});

