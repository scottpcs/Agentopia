export async function callOpenAI(keyId, model, messages, temperature, maxTokens, customInstructions) {
  console.log('callOpenAI function called with:', { keyId, model, messages, temperature, maxTokens, customInstructions });
  
  try {
    console.log('Sending request to /api/openai');
    const response = await fetch('http://localhost:3000/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyId,
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