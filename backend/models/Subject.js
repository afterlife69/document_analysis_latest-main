import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  pdfs: [{
    title: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
  }],
  // Questions for this subject (denormalized for quick access)
  questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
  }],
}, { timestamps: true });

// Text index for searching by name and description
SubjectSchema.index({ name: 'text', description: 'text' });

const Subject = mongoose.model('Subject', SubjectSchema);
export default Subject;
