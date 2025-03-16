import mongoose from 'mongoose';

const ProcessedDocumentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  documentName: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  fileCategory: {
    type: String,
    enum: ['Document', 'Timetable'],
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  encryptedData: {
    type: String,
    required: true
  },
  encryptionIV: {
    type: String,
    required: true
  },
  s3Key: {
    type: String
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const ProcessedDocument = mongoose.model('ProcessedDocument', ProcessedDocumentSchema);
export default ProcessedDocument;
