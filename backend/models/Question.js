import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  embedding: {
    type: [Number],
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  questionNumber: {
    type: Number,
    required: true
  },
  occurrenceCount: {
    type: Number,
    default: 1
  },
  marks: {
    type: Number
  },
  difficulty: {
    type: String,
    enum: ['EASY', 'MEDIUM', 'HARD', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  similarQuestions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    similarity: {
      type: Number
    },
    paperYear: Number,
    paperTerm: String
  }],
}, { timestamps: true });

// Create a text index for searching question content
QuestionSchema.index({ content: 'text' });
QuestionSchema.index({ subjectName: 1 }); // Add index for subject name queries

const Question = mongoose.model('Question', QuestionSchema);
export default Question;
