import mongoose from 'mongoose';

const documentEmbeddingSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true, index: true },
    metadata: {
        filename: String,
        startIndex: Number,
        endIndex: Number
    },
    createdAt: { type: Date, default: Date.now, expires: 86400 }
}, { timestamps: true });

// Create standard index for embeddings
documentEmbeddingSchema.index({ embedding: 1 });

const DocumentEmbedding = mongoose.model('DocumentEmbedding', documentEmbeddingSchema);
export default DocumentEmbedding;
