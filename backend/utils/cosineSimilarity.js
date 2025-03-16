/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} Cosine similarity (between -1 and 1)
 */
const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be of the same length');
  }
  
  // Compute dot product
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  // Handle zero vectors
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  // Compute cosine similarity
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export default cosineSimilarity;
