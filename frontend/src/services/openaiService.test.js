// src/services/openaiService.test.js
import { callOpenAI } from './openaiService.js';

// Replace with your actual API key
const API_KEY = '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';

async function testOpenAIService() {
  try {
    const response = await callOpenAI(
      API_KEY,
      'gpt-3.5-turbo',
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, how are you?' }
      ],
      0.7,
      50
    );
    console.log('OpenAI API Response:', response);
  } catch (error) {
    console.error('Error testing OpenAI service:', error);
  }
}

testOpenAIService();