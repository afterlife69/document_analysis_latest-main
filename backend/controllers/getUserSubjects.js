import User from '../models/user.js';

export const getUserSubjects = async (req, res) => {
  try {
    // Get user ID from request (assuming authentication middleware sets req.userId)
    // Or use req.params.userId if passing as route parameter
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Find user and populate subjects, then populate questions within each subject
    const user = await User.findById(userId)
      .populate({
        path: 'subjects',
        populate: {
          path: 'questions',
          model: 'Question',
          select: 'content questionNumber marks difficulty occurrenceCount' // Select fields to return
        }
      });
    // Sort questions in each subject by occurrenceCount in descending order
    if (user && user.subjects) {
      user.subjects.forEach(subject => {
        if (subject.questions && subject.questions.length > 0) {
          subject.questions.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
        }
      });
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the subjects array with populated questions
    res.status(200).json({ 
      success: true, 
      subjects: user.subjects 
    });
    
  } catch (error) {
    console.error('Error fetching user subjects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch subjects', 
      error: error.message 
    });
  }
};

export default getUserSubjects;
