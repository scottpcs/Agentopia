// server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory store for API keys (replace with a database in production)
const apiKeys = new Map();

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Agentopia API' });
});

// New endpoint for storing API keys
app.post('/api/keys', (req, res) => {
  const { key, value } = req.body;
  const keyId = `key_${Date.now()}`;
  apiKeys.set(keyId, value);
  res.json({ keyId });
});

// Existing OpenAI endpoint
app.post('/api/openai', async (req, res) => {
  const { keyId, model, messages, temperature, maxTokens } = req.body;
  const apiKey = apiKeys.get(keyId);

  if (!apiKey) {
    return res.status(400).json({ error: 'Invalid API key' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});