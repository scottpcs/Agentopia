const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const encryptedKeyService = require('./encryptedKeyService');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize the database
encryptedKeyService.init().catch(console.error);

// Middleware to check authentication (placeholder - implement proper JWT verification)
const authMiddleware = (req, res, next) => {
  // TODO: Implement proper JWT verification
  req.userId = 1; // Placeholder user ID
  next();
};

// API Key Management
app.post('/api/keys', authMiddleware, async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    const keyId = await encryptedKeyService.saveApiKey(req.userId, name, value);
    res.json({ message: 'API key saved successfully', id: keyId });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ error: 'Error saving API key' });
  }
});

app.get('/api/keys', authMiddleware, async (req, res) => {
  try {
    const keys = await encryptedKeyService.listApiKeys(req.userId);
    res.json(keys);
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Error listing API keys' });
  }
});

app.get('/api/keys/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const value = await encryptedKeyService.getApiKey(req.userId, name);
    if (value) {
      res.json({ value });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }
  } catch (error) {
    console.error('Error retrieving API key:', error);
    res.status(500).json({ error: 'Error retrieving API key' });
  }
});

app.delete('/api/keys/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    await encryptedKeyService.deleteApiKey(req.userId, name);
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Error deleting API key' });
  }
});

// OpenAI API endpoint
app.post('/api/openai', authMiddleware, async (req, res) => {
  try {
    const { keyName, model, messages, temperature, maxTokens, customInstructions } = req.body;

    console.log('Received request:', { keyName, model, messages, temperature, maxTokens, customInstructions });

    const apiKey = await encryptedKeyService.getApiKey(req.userId, keyName);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    // Append custom instructions to the system message
    const preparedMessages = messages.map((msg, index) => {
      if (index === 0 && msg.role === 'system') {
        return {
          ...msg,
          content: `${msg.content}\n\n${customInstructions}`
        };
      }
      return msg;
    });

    console.log('Prepared messages:', preparedMessages);

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages: preparedMessages,
      temperature,
      max_tokens: maxTokens
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('OpenAI API response:', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error in OpenAI API call:', error.message);
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
    }
    res.status(500).json({ error: 'Error calling OpenAI API', details: error.message });
  }
});

// Workflow Management
app.post('/api/workflows', async (req, res) => {
  try {
    const { name, data } = req.body;
    await fs.writeFile(path.join(__dirname, 'workflows', `${name}.json`), JSON.stringify(data));
    res.json({ message: 'Workflow saved successfully' });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({ error: 'Error saving workflow' });
  }
});

app.get('/api/workflows', async (req, res) => {
  try {
    const files = await fs.readdir(path.join(__dirname, 'workflows'));
    const workflows = files.map(file => path.basename(file, '.json'));
    res.json(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ error: 'Error listing workflows' });
  }
});

app.get('/api/workflows/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(path.join(__dirname, 'workflows', `${name}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error retrieving workflow:', error);
    res.status(500).json({ error: 'Error retrieving workflow' });
  }
});

app.get('/api/workflows/:name/download', async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(__dirname, 'workflows', `${name}.json`);
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading workflow:', error);
    res.status(500).json({ error: 'Error downloading workflow' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});