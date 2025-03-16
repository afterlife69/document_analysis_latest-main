// src/controllers/pdfController.js
import DocumentEmbedding from '../models/documentEmbedding.js';
import { getEmbedding, chatModel } from '../utils/ai.js';
import { cosineSimilarity, chunkText } from '../utils/textProcessing.js';
import Subject from '../models/Subject.js';  // Add this import
import AWS from 'aws-sdk'

export const generatePDF = async (req, res) => {
  try {
    const { questions, sessionId, contentLength, complexity, subject, title} = req.body;
    console.log(questions, contentLength, complexity);
    
    const userId = req.userId;
    if (!sessionId) return res.status(400).json({ message: 'Session ID is required' });
    if (!Array.isArray(questions)) return res.status(400).json({ message: 'Questions must be an array' });

    // Configure length based on setting
    const lengthConfig = {
      short: "Keep the answer brief and concise, around 100-150 words.",
      medium: "Provide a moderately detailed answer with about 200-300 words.",
      long: "Give an in-depth comprehensive answer with 400-600 words."
    };

    // Configure complexity based on setting
    const complexityConfig = {
      simple: "Use simple language and explain concepts in an easy-to-understand manner, avoiding jargon where possible.",
      technical: "Use technical language appropriate for the domain, including specific terminology and detailed explanations of complex concepts."
    };

    const responses = [];

    for (const question of questions) {
      if (responses.length > 0) await new Promise(resolve => setTimeout(resolve, 2000));

      const questionEmbedding = await getEmbedding(question);
      const documents = await DocumentEmbedding.find({ sessionId });

      const similarContent = documents
      .map(doc => ({
        ...doc.toObject(),
        similarity: cosineSimilarity(doc.embedding, questionEmbedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
      
      // Reset expiry timer for the accessed documents (LRU cache behavior)
      const accessedDocIds = similarContent.map(doc => doc._id);
      if (accessedDocIds.length > 0) {
        await DocumentEmbedding.updateMany(
          { _id: { $in: accessedDocIds } },
          { $set: { createdAt: new Date() } }
        );
        console.log(`Reset expiry for ${accessedDocIds.length} documents`);
      }

      const context = similarContent.map(doc => doc.text).join('\n');
      const prompt = `
  Based on the following context, please answer the question in a structured manner.

  Context:
  ${context}

  Question: ${question}

  ${lengthConfig[contentLength]}
  ${complexityConfig[complexity]}
  
  Please provide a well-structured response with relevant information from the context.
  Don't just answer the question directly, explain the concepts and provide examples where necessary.
  Include section headings where appropriate and organize the information logically.`;
      const result = await chatModel.generateContent(prompt);
      const ele = result.response.text();
      responses.push(`**Q${responses.length + 1}.** ${question}?\n\n**Answer:**\n\n${ele}`);
    }

    // Convert responses to markdown and generate PDF
    const markdownContent = responses.join('\n\n---\n\n');
    const pdfResponse = await fetch('http://localhost:8000', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `markdown=${encodeURIComponent(markdownContent)}&css=${encodeURIComponent(`
      body { font-family: Arial, sans-serif; }
      h1, h2 { color: #333; }
      ul, ol { margin-left: 15px; }
      li { margin-bottom: 5px; }
      `)}`,
    });

    if (!pdfResponse.ok) {
      throw new Error('PDF generation failed');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const s3 = new AWS.S3();
    const pdfKey = `${userId}/${subject}/${title}.pdf`;

    await s3.putObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: pdfKey,
      Body: Buffer.from(pdfBuffer),
      ContentType: 'application/pdf'
    }).promise();

    const pdfUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: pdfKey,
      Expires: 3600 // URL expires in 1 hour
    });

    // Find the subject and add the PDF to its pdfs array
    await Subject.findOneAndUpdate(
      { name: subject },
      { 
        $push: { 
          pdfs: {
            title: title,
            url: pdfKey  // Store the S3 key instead of the signed URL
          }
        }
      }
    );

    res.json({ 
      message: 'PDF generated successfully',
      url: pdfUrl
    });
  } catch (err) {
    console.error('Error generating responses:', err);
    res.status(500).json({ message: 'Error generating responses' });
  }
};
