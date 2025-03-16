import Question from '../models/Question.js';
import Subject from '../models/Subject.js';
// Get questions sorted by occurrence count (descending)
export const getQuestionLeaderboard = async (req, res) => {
  try {
    console.log('Fetching question leaderboard...');
    
    const limit = parseInt(req.query.limit) || 50; // Default to top 50 questions
    
    const subject = req.params.subject;
    console.log(subject);
    

    if (!subject) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }

    const sub = await Subject.findOne({ name: subject });

    // If subject doesn't exist, return error
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Get the subject with populated questions, limit and sort them
    const populatedSubject = await Subject.findById(sub._id).lean();

    // Get all question IDs from the subject
    const questionIds = populatedSubject.questions;
    
    
    console.log('question id',questionIds);
    
    // Fetch all questions from the Question collection
    const questions = questionIds.map(async (questionId) => {
      return await Question.findById(questionId).lean();
    });

    console.log(questions);
    
    // Replace the question IDs with actual question documents
    populatedSubject.questions = questions;

    const leaderboard = questions;

    // If no questions found
    if (!leaderboard.length) {
      return res.status(404).json({ success: false, message: 'No questions found for this subject' });
    }
    
    
    res.status(200).json({ 
      success: true, 
      count: leaderboard.length,
      data: leaderboard 
    });
  } catch (error) {
    console.error('Error fetching question leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching question leaderboard',
      error: error.message
    });
  }
};
