// src/services/openaiService.js

export async function callOpenAI(apiKeyName, model, messages, temperature, maxTokens) {
  console.log('Calling OpenAI with:', { apiKeyName, model, messages, temperature, maxTokens });
  
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
        maxTokens
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
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
    throw error;
  }
}