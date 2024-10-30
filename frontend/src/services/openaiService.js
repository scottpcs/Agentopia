// src/services/openaiService.js

/**
 * Makes a call to the OpenAI API with properly formatted agent configurations
 * @param {string} apiKeyName - Name of the API key to use
 * @param {string} model - The model to use (e.g., 'gpt-4o-mini')
 * @param {Array} messages - Array of message objects
 * @param {number} temperature - Model temperature setting
 * @param {number} maxTokens - Maximum tokens to generate
 * @param {Object} customInstructions - Additional custom instructions
 * @returns {Promise<string>} The model's response
 */
export async function callOpenAI(apiKeyName, model, messages, temperature, maxTokens, customInstructions) {
  console.log('OpenAI call configuration:', {
    model,
    temperature,
    maxTokens,
    messageCount: messages.length,
    hasSystemMessage: messages.some(m => m.role === 'system')
  });

  try {
    const response = await fetch('http://localhost:3000/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKeyName,
        model,
        messages,
        temperature,
        maxTokens,
        customInstructions
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI API response structure:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length,
      hasMessage: !!data.choices?.[0]?.message
    });

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected response structure:', data);
      throw new Error('Unexpected response structure from OpenAI API');
    }
  } catch (error) {
    console.error('Error in OpenAI call:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Helper function to validate OpenAI API key
 */
export async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

/**
 * Estimates token usage for a set of messages
 */
export function estimateTokenUsage(messages) {
  // Rough estimate: 4 chars ≈ 1 token
  return messages.reduce((total, message) => {
    return total + Math.ceil(message.content.length / 4);
  }, 0);
}

/**
 * Formats OpenAI API response
 */
export function formatOpenAIResponse(response) {
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content.trim();
  }
  return 'No response generated.';
}