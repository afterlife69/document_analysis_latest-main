import { chatModel } from '../utils/ai.js';

export const debugGeminiResponse = async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const response = await chatModel.generateContent(prompt);
    
    // Return the full structure for debugging
    return res.status(200).json({
      success: true,
      rawResponse: response,
      responseType: typeof response,
      hasText: !!response.text,
      hasResponse: !!response.response,
      responseKeys: Object.keys(response),
      candidates: response.candidates || null
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export default {
  debugGeminiResponse
};
