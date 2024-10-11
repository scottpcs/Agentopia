// src/services/openaiService.js

export async function callOpenAI(apiKeyName, model, messages, temperature, maxTokens, customInstructions) {
  console.log('callOpenAI function called with:', { apiKeyName, model, messages, temperature, maxTokens, customInstructions });
  
  try {
    console.log('Sending request to /api/openai');
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

    console.log('Response received from /api/openai');

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error response from /api/openai:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successful response from /api/openai:', data);

    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected response structure:', data);
      throw new Error('Unexpected response structure from OpenAI API');
    }
  } catch (error) {
    console.error('Error in callOpenAI:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Helper function to validate OpenAI API key
export async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/engines', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return true;
    } else {
      console.error('API key validation failed:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

// Function to get available models (this would need to be implemented on your backend)
export async function getAvailableModels(apiKeyName) {
  try {
    const response = await fetch(`http://localhost:3000/api/models?apiKeyName=${apiKeyName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error('Error fetching available models:', error);
    throw error;
  }
}

// Function to estimate token usage
export function estimateTokenUsage(messages) {
  // This is a very rough estimate. OpenAI's tokenization is more complex.
  return messages.reduce((total, message) => {
    return total + message.content.split(' ').length;
  }, 0);
}

// Function to format OpenAI API response
export function formatOpenAIResponse(response) {
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content.trim();
  }
  return 'No response generated.';
}

// Error handling wrapper
export async function safeOpenAICall(apiCall) {
  try {
    return await apiCall();
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    throw new Error('Failed to call OpenAI API: ' + error.message);
  }
}