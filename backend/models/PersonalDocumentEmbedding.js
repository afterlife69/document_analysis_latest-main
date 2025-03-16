import mongoose from 'mongoose';

const PersonalDocumentEmbeddingSchema = new mongoose.Schema({
  documentId: { 
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'ProcessedDocument'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  // Replace plaintext document name with encrypted version
  encryptedDocName: {
    type: String,
    required: true
  },
  docNameIV: {
    type: String,
    required: true
  },
  fileCategory: {
    type: String,
    enum: ['Document', 'Timetable'],
    required: true
  },
  // Encrypted field key and value (already implemented)
  encryptedFieldKey: {
    type: String,
    required: true
  },
  fieldKeyIV: {
    type: String,
    required: true
  },
  encryptedFieldValue: {
    type: String,
    required: true
  },
  fieldValueIV: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true,
    index: true
  },
  confidence: {
    type: Number,
    default: 1.0
  }
}, { timestamps: true });

// Create index for vector search
PersonalDocumentEmbeddingSchema.index({ userId: 1, fileCategory: 1 });
PersonalDocumentEmbeddingSchema.index({ embedding: 1 });

const PersonalDocumentEmbedding = mongoose.model('PersonalDocumentEmbedding', PersonalDocumentEmbeddingSchema);
export default PersonalDocumentEmbedding;
