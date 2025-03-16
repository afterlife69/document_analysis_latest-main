// src/utils/textProcessing.js

// Chunk text into smaller segments
export const chunkText = (text, chunkSize = 1000) => {
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
  
  // Calculate cosine similarity between two vectors
  export function cosineSimilarity(vecA, vecB) {
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
  