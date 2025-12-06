import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required');
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-1.5-flash for faster responses, or gemini-1.5-pro for better quality
// gemini-1.5-flash is optimized for speed and cost, good for structured outputs
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export const model = genAI.getGenerativeModel({ 
  model: modelName,
  generationConfig: {
    temperature: 0.7, // Balance between creativity and consistency
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  }
}); 