import { extractTextFromBuffer } from '../utils/pdfProcessing.js';
import { getEmbedding, chatModel } from '../utils/ai.js';
import Question from '../models/Question.js';
import Subject from '../models/Subject.js';
import cosineSimilarity from '../utils/cosineSimilarity.js';

// Adjust the similarity threshold to 80%
const SIMILARITY_THRESHOLD = 0.8;

// Extract questions using Gemini LLM instead of regex
async function extractQuestionsWithLLM(text) {
  try {
    // Create prompt for Gemini to extract questions
    const prompt = `
    You are an expert at analyzing question papers. 
    Please identify and extract all questions from the following text.
    
    For each question, provide:
    1. The question number or identifier (e.g., "1a", "2", "Q3")
    2. The complete question text
    3. The marks allocated (if mentioned)
    
    Format your response as a valid JSON array with objects containing:
    - number: numerical question number (e.g., 1, 2)
    - identifier: the full question identifier (e.g., "1a", "Question 2")
    - content: the full text of the question
    - marks: number of marks (null if not mentioned)
    
example input : 1   a   List out the features of Spring Framework .   L 2   CO 1   [ 7 M]  b   Explain in detail about Setter injection with an example .   L 2   CO 1   [ 7 M]  OR  2   a   Discuss about Dependency injection .   L 2   CO 1   [ 7 M]  b   Explain various modules in spring framework   with neat   sketch .   L 2   CO 1   [ 7 M]  UNIT – II  3   a   Illustrate Spring Boot Application using an appropriate example .   L 2   CO 2   [ 7 M]  b   Explain the scope of bean in Spring Boot .   L 2   CO 2   [ 7 M]  OR  4   a   Explain about Auto Wiring.   L2   CO2   [7M]  b   Describe the various types of advises supported by Spring AOP.   L2   CO2   [7M]  UNIT – III  5   a   Justify the use of Spring Data JPA .   L2   CO3   [7M]  b   Describe about spring transactional   in JPA .   L2   CO3   [7M]  OR  6   a   Explain the Update Operation in Spring Data JPA .   L2   CO3   [7M]  b   Describe about Custom Repository Implementation .   L2   CO3   [7M]  UNIT – IV  7   a   Describe the various types of web services.   L2   CO4   [7M]  b   Describe SOAP - based web services .   L2   CO4   [7M]  OR  8   a   Explain about RESTful Web Services .   L2   CO4   [7M]  b   Justify the use of Web services .   L2   CO4   [7M]  UNIT – V  9   a   Discuss the steps for creating a Spring REST controller.   L3   CO5   [7M]  b   Explain the purpose of spring REST.   L2   CO5   [7M]  OR  10   a   Explain the way to use @MatrixVariable in spring REST.   L2   CO5   [7M]  b   Describe how spring REST handles exceptions.   L2   CO5   [7M]  *****  H.T.No:
example output: 
    [
  {
    "number": 1,
    "identifier": "1a",
    "content": "List out the features of Spring Framework.",
    "marks": 7
  },
  {
    "number": 1,
    "identifier": "1b",
    "content": "Explain in detail about Setter injection with an example.",
    "marks": 7
  },
  {
    "number": 2,
    "identifier": "2a",
    "content": "Discuss about Dependency injection.",
    "marks": 7
  },
  {
    "number": 2,
    "identifier": "2b",
    "content": "Explain various modules in Spring Framework with a neat sketch.",
    "marks": 7
  },
  {
    "number": 3,
    "identifier": "3a",
    "content": "Illustrate Spring Boot Application using an appropriate example.",
    "marks": 7
  },
  {
    "number": 3,
    "identifier": "3b",
    "content": "Explain the scope of bean in Spring Boot.",
    "marks": 7
  },
  {
    "number": 4,
    "identifier": "4a",
    "content": "Explain about Auto Wiring.",
    "marks": 7
  },
  {
    "number": 4,
    "identifier": "4b",
    "content": "Describe the various types of advises supported by Spring AOP.",
    "marks": 7
  },
  {
    "number": 5,
    "identifier": "5a",
    "content": "Justify the use of Spring Data JPA.",
    "marks": 7
  },
  {
    "number": 5,
    "identifier": "5b",
    "content": "Describe about Spring Transactional in JPA.",
    "marks": 7
  },
  {
    "number": 6,
    "identifier": "6a",
    "content": "Explain the Update Operation in Spring Data JPA.",
    "marks": 7
  },
  {
    "number": 6,
    "identifier": "6b",
    "content": "Describe about Custom Repository Implementation.",
    "marks": 7
  },
  {
    "number": 7,
    "identifier": "7a",
    "content": "Describe the various types of web services.",
    "marks": 7
  },
  {
    "number": 7,
    "identifier": "7b",
    "content": "Describe SOAP-based web services.",
    "marks": 7
  },
  {
    "number": 8,
    "identifier": "8a",
    "content": "Explain about RESTful Web Services.",
    "marks": 7
  },
  {
    "number": 8,
    "identifier": "8b",
    "content": "Justify the use of Web services.",
    "marks": 7
  },
  {
    "number": 9,
    "identifier": "9a",
    "content": "Discuss the steps for creating a Spring REST controller.",
    "marks": 7
  },
  {
    "number": 9,
    "identifier": "9b",
    "content": "Explain the purpose of Spring REST.",
    "marks": 7
  },
  {
    "number": 10,
    "identifier": "10a",
    "content": "Explain the way to use @MatrixVariable in Spring REST.",
    "marks": 7
  },
  {
    "number": 10,
    "identifier": "10b",
    "content": "Describe how Spring REST handles exceptions.",
    "marks": 7
  }
]

    Here's the text:
    ${text}
    `;

    // Query Gemini
    const result = await chatModel.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Extract JSON from response (in case of any wrapping text)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log("Failed to extract JSON from LLM response");
      return [];
    }
    
    // Parse the JSON
    const extractedQuestions = JSON.parse(jsonMatch[0]);
    console.log(`LLM extracted ${extractedQuestions.length} questions`);
    
    return extractedQuestions;
  } catch (error) {
    console.error("Error extracting questions with LLM:", error);
    // Fallback to empty array if LLM fails
    return [];
  }
}

// Enhanced function to find similar questions and handle recurrence
const findSimilarQuestionsAndHandleRecurrence = async (questionContent, embedding, subjectId) => {
  // Get all questions for the same subject
  const existingQuestions = await Question.find({
    subjectId: subjectId
  }).select('_id embedding content occurrenceCount');
  
  let highestSimilarity = 0;
  let mostSimilarQuestion = null;
  
  for (const question of existingQuestions) {
    const similarity = cosineSimilarity(embedding, question.embedding);
    
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      mostSimilarQuestion = question;
    }
  }
  
  // If we found a question with similarity >= threshold
  if (highestSimilarity >= SIMILARITY_THRESHOLD && mostSimilarQuestion) {
    console.log(`Found similar question with ${highestSimilarity.toFixed(2)} similarity`);
    
    // Increment the occurrence counter
    mostSimilarQuestion.occurrenceCount = (mostSimilarQuestion.occurrenceCount || 1) + 1;
    await mostSimilarQuestion.save();
    
    return {
      isNewQuestion: false,
      existingQuestion: mostSimilarQuestion,
      similarity: highestSimilarity
    };
  }
  
  // No similar question found
  return { 
    isNewQuestion: true,
    similarity: highestSimilarity
  };
};

export const processQP = async (req, res) => {
  try {
    // Debugging information
    console.log('Request received:');
    console.log('Files:', req.file ? 'File uploaded' : 'No file');
    console.log('File details:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? 'Buffer present' : 'No buffer'
    } : 'No file');
    console.log('Body:', req.body);
    
    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract metadata from request body (not from req.file)
    const { title, year, term, subject } = req.body;
    
    if (!title || !year || !term || !subject) {
      return res.status(400).json({ 
        message: 'Missing required metadata: title, year, term, and subject are required' 
      });
    }

    // Find or create the subject
    let subjectDoc = await Subject.findOne({ name: subject });
    

    // Read the PDF file - use buffer if available, otherwise read from path
    const pdfBuffer = req.file.buffer;
    
    // Extract text from PDF using the shared utility function
    const extractedText = await extractTextFromBuffer(pdfBuffer);
  
    // Extract questions using Gemini LLM instead of regex
    const extractedQuestions = await extractQuestionsWithLLM(extractedText);
    
    // Log the number of questions extracted
    console.log(`Processed ${extractedQuestions.length} questions from the document.`);
    
    // Create the question paper record
    
    // Process each question
    const savedQuestions = [];
    const reusedQuestions = [];
    
    for (const extractedQuestion of extractedQuestions) {
      try {
        // Generate embedding for the question
        const embedding = await getEmbedding(extractedQuestion.content);
        
        // Check if a similar question exists and handle recurrence
        const result = await findSimilarQuestionsAndHandleRecurrence(
          extractedQuestion.content, 
          embedding,
          subjectDoc._id
        );
        
        if (result.isNewQuestion) {
          // Create a new question record if no similar question found
          const question = new Question({
            content: extractedQuestion.content,
            embedding,
            questionNumber: extractedQuestion.number,
            marks: extractedQuestion.marks,
            occurrenceCount: 1, // First occurrence
            subjectId: subjectDoc._id,
            subjectName: subjectDoc.name
          });
          
          await question.save();
          savedQuestions.push(question);
          
          // Add just the question ID to the subject's questions array
          subjectDoc.questions.push(question._id);
        } else {
          // Record the reused question for statistics
          reusedQuestions.push({
            originalId: result.existingQuestion._id,
            content: extractedQuestion.content,
            similarity: result.similarity,
            occurrenceCount: result.existingQuestion.occurrenceCount
          });
          
          // Check if this question ID is already in the subject's questions array
          const existingQuestionRef = subjectDoc.questions.find(
            q => q.toString() === result.existingQuestion._id.toString()
          );
          
          if (!existingQuestionRef) {
            // Only add the question ID if it's not already in the subject
            subjectDoc.questions.push(result.existingQuestion._id);
          }
        }
      } catch (questionError) {
        console.error('Error processing individual question:', questionError);
        // Continue with other questions even if one fails
      }
    }
    
    // Save the updated subject document
    await subjectDoc.save();
    
    // Calculate statistics about question reuse
    const repetitionStats = {
      totalQuestions: extractedQuestions.length,
      newQuestions: savedQuestions.length,
      reusedQuestions: reusedQuestions.length,
      subject: subjectDoc.name,
      reusedQuestionsDetails: reusedQuestions.map(q => ({
        occurrenceCount: q.occurrenceCount,
        similarity: q.similarity.toFixed(2)
      }))
    };
    
    // Return success with data
    return res.status(200).json({
      message: 'Question paper processed successfully',
      statistics: repetitionStats,
      subjectId: subjectDoc._id
    });
    
  } catch (error) {
    console.error('Error processing question paper:', error);
    return res.status(500).json({ 
      message: 'Failed to process question paper', 
      error: error.message 
    });
  }
};
