// src/services/openaiService.js

export async function callOpenAI(keyId, model, messages, temperature, maxTokens) {
  try {
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
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}