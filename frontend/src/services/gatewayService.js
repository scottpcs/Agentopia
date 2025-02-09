// src/services/gatewayService.js
import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001';

/**
 * Makes a call to the AI Gateway with properly formatted agent configurations
 */
export async function callGateway(apiKeyId, model, messages, temperature, maxTokens, customInstructions) {
  if (!apiKeyId) {
    throw new Error('API key name is required');
  }

  console.log('AI Gateway call configuration:', {
    apiKeyId,
    model,
    temperature,
    maxTokens,
    messageCount: messages.length,
    hasSystemMessage: messages.some(m => m.role === 'system'),
    customInstructions: Boolean(customInstructions)
  });

  try {
    // Prepare message array with custom instructions if provided
    let preparedMessages = [...messages];
    if (customInstructions) {
      const systemMessageIndex = preparedMessages.findIndex(m => m.role === 'system');
      if (systemMessageIndex >= 0) {
        preparedMessages[systemMessageIndex].content = 
          `${preparedMessages[systemMessageIndex].content}\n\n${customInstructions}`;
      } else {
        preparedMessages.unshift({
          role: 'system',
          content: customInstructions
        });
      }
    }

    // Map Agentopia models to Gateway models
    const modelMap = {
      'gpt-4o': 'openai/gpt-4',
      'gpt-4o-mini': 'openai/gpt-4',
      'gpt-4-turbo': 'openai/gpt-4-1106-preview',
      'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
      'gpt-3.5-turbo-16k': 'openai/gpt-3.5-turbo-16k',
      'claude-3': 'anthropic/claude-3',
      'groq-mixtral': 'groq/mixtral-8x7b'
    };

    const gatewayModel = modelMap[model] || model;

    const response = await axios.post(`${GATEWAY_URL}/v1/completions`, {
      apiKeyId,
      model: gatewayModel,
      messages: preparedMessages,
      parameters: {
        temperature,
        max_tokens: maxTokens,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('AI Gateway response received:', {
      status: response.status,
      hasChoices: !!response.data.choices,
      messageLength: response.data.choices?.[0]?.message?.content?.length
    });

    if (!response.data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from AI Gateway');
    }

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Error in Gateway call:', error);
    
    // Map Gateway errors to appropriate user messages
    if (error.response) {
      const statusCode = error.response.status;
      const errorData = error.response.data;
      
      switch (statusCode) {
        case 401:
          throw new Error('Invalid API key or authentication failed');
        case 404:
          throw new Error('Selected model not available');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('AI Gateway service error. Please try again.');
        default:
          throw new Error(errorData.error || 'Unknown error occurred');
      }
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. Please try again.');
    }

    throw error;
  }
}

/**
 * Get available models from the Gateway
 */
export async function getAvailableModels() {
  try {
    const response = await axios.get(`${GATEWAY_URL}/v1/models`);
    return response.data.models;
  } catch (error) {
    console.error('Error fetching available models:', error);
    throw new Error('Failed to fetch available models');
  }
}

/**
 * Validate Gateway API key
 */
export async function validateGatewayKey(apiKey) {
  try {
    const response = await axios.post(`${GATEWAY_URL}/v1/validate-key`, {
      apiKey
    });
    return response.data.valid;
  } catch (error) {
    console.error('Error validating Gateway API key:', error);
    return false;
  }
}

export default {
  callGateway,
  getAvailableModels,
  validateGatewayKey
};