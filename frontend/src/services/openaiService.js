// src/services/openaiService.js

/**
 * Makes a call to the OpenAI API with properly formatted agent configurations
 */
async function callOpenAI(apiKeyId, model, messages, temperature, maxTokens, customInstructions) {
  if (!apiKeyId) {
    throw new Error('API key name is required');
  }

  console.log('OpenAI call configuration:', {
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

    const response = await fetch('http://localhost:3000/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKeyId,
        model,
        messages: preparedMessages,
        temperature,
        maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error response:', errorData);
      throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received:', {
      status: response.status,
      hasChoices: !!data.choices,
      messageLength: data.choices?.[0]?.message?.content?.length
    });

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error in OpenAI call:', error);
    throw error;
  }
}

/**
 * Helper function to validate OpenAI API key
 */
async function validateApiKey(apiKey) {
// In openaiService.js - Update error handling in callOpenAI
try {
  const response = await fetch('http://localhost:3000/api/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKeyId,
      model,
      messages,
      temperature,
      maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error response:', errorData);
    let errorMessage = errorData.details || errorData.error || `HTTP error! status: ${response.status}`;
    if (errorData.type === 'timeout') {
      errorMessage = 'The request timed out. Please try again.';
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  console.log('OpenAI API response received:', {
    status: response.status,
    hasChoices: !!data.choices,
    messageLength: data.choices?.[0]?.message?.content?.length
  });

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response format from OpenAI API');
  }

  return data.choices[0].message.content;
} catch (error) {
  console.error('Error in OpenAI call:', error);
  throw error;
}
}

/**
 * Estimates token usage for a set of messages
 */
function estimateTokenUsage(messages) {
  return messages.reduce((total, message) => {
    // Rough estimate: 4 characters ≈ 1 token
    const contentLength = (message.content || '').length;
    const roleLength = (message.role || '').length;
    return total + Math.ceil((contentLength + roleLength) / 4);
  }, 0);
}

/**
 * Formats OpenAI API response
 */
function formatOpenAIResponse(response) {
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content.trim();
  }
  return 'No response generated.';
}

/**
 * Gets the cost estimate for an API call
 */
function getCostEstimate(model, tokens) {
  const costPerToken = {
    'gpt-4o': 0.01,
    'gpt-4o-mini': 0.005,
    'gpt-4-turbo': 0.01,
    'gpt-4': 0.03,
    'gpt-3.5-turbo': 0.002,
    'gpt-3.5-turbo-16k': 0.003
  };

  return (tokens * (costPerToken[model] || 0.01)).toFixed(4);
}

/**
 * Validates and prepares messages for the API call
 */
function prepareMessages(messages, customInstructions) {
  const preparedMessages = [...messages];

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

  return preparedMessages;
}

/**
 * Validates model configuration parameters
 */
function validateModelConfig(model, temperature, maxTokens) {
  const modelConfig = {
    'gpt-4o': { maxTokens: 4096, tempRange: { min: 0.1, max: 1.0 } },
    'gpt-4o-mini': { maxTokens: 2048, tempRange: { min: 0.1, max: 1.0 } },
    'gpt-4-turbo': { maxTokens: 4096, tempRange: { min: 0.0, max: 2.0 } },
    'gpt-4': { maxTokens: 8192, tempRange: { min: 0.0, max: 2.0 } },
    'gpt-3.5-turbo': { maxTokens: 4096, tempRange: { min: 0.0, max: 2.0 } },
    'gpt-3.5-turbo-16k': { maxTokens: 16384, tempRange: { min: 0.0, max: 2.0 } }
  };

  const config = modelConfig[model] || modelConfig['gpt-4o'];

  return {
    model,
    temperature: Math.max(config.tempRange.min, 
                 Math.min(config.tempRange.max, temperature || 0.7)),
    maxTokens: Math.min(config.maxTokens, maxTokens || config.maxTokens / 2)
  };
}

/**
 * Handles errors from the OpenAI API
 */
function handleOpenAIError(error) {
  const errorMessages = {
    'invalid_api_key': 'Invalid API key. Please check your API key configuration.',
    'model_not_found': 'The specified model is not available. Please check your model configuration.',
    'context_length_exceeded': 'The input is too long for the model. Please reduce the input length.',
    'rate_limit_exceeded': 'Rate limit exceeded. Please try again later.'
  };

  const errorType = error.message?.toLowerCase().includes('api key') ? 'invalid_api_key' :
                   error.message?.toLowerCase().includes('model') ? 'model_not_found' :
                   error.message?.toLowerCase().includes('context length') ? 'context_length_exceeded' :
                   error.message?.toLowerCase().includes('rate limit') ? 'rate_limit_exceeded' :
                   'unknown_error';

  return {
    error: true,
    message: errorMessages[errorType] || error.message,
    type: errorType,
    original: error
  };
}

// Export all functions as a default object
export {
  callOpenAI,
  validateApiKey,
  estimateTokenUsage,
  formatOpenAIResponse,
  getCostEstimate,
  prepareMessages,
  validateModelConfig,
  handleOpenAIError
};