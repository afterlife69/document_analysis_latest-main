import Subject from '../models/Subject.js';
import User from '../models/user.js';

export const addSubject = async (req, res) => {
  try {
    // Get the user ID from the authenticated request
    const userId = req.userId;
    
    // Extract subject details from request body
    const { name } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }
    
    // Create the new subject
    const newSubject = new Subject({
      name,
      pdfs: [],
      questions: []  // Initialize with empty questions array
    });
    
    // Save the new subject to the database
    const savedSubject = await newSubject.save();
    
    // Add the subject to the user's subjects array
    await User.findByIdAndUpdate(
      userId,
      { $push: { subjects: savedSubject._id } },
      { new: true }
    );
    
    // Return success response with the created subject
    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      subject: savedSubject
    });
    
  } catch (error) {
    console.error('Error creating subject:', error);
    
    // Handle duplicate key error (unique constraint violation)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A subject with this name already exists',
        error: error.message
      });
    }
    
    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Failed to create subject',
      error: error.message
    });
  }
};

export default addSubject;
