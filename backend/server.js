const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const encryptedKeyService = require('./encryptedKeyService');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Agentopia Backend Server');
});

// Updated CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// API Key Management
app.post('/api/keys', authMiddleware, async (req, res) => {
  try {
    const { name, value, expiresAt, usageLimit } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    const usageLimitNum = usageLimit ? parseInt(usageLimit) : null;

    const keyId = await encryptedKeyService.saveApiKey(req.userId, name, value, expiresAtDate, usageLimitNum);
    res.json({ message: 'API key saved successfully', id: keyId });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ error: 'Error saving API key', details: error.message });
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
    const key = await encryptedKeyService.getApiKey(req.userId, name);
    if (key) {
      res.json(key);
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

app.post('/api/keys/:name/rotate', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const newValue = await encryptedKeyService.rotateApiKey(req.userId, name);
    if (newValue) {
      res.json({ message: 'API key rotated successfully', newValue });
    } else {
      res.status(404).json({ error: 'API key not found' });
    }
  } catch (error) {
    console.error('Error rotating API key:', error);
    res.status(500).json({ error: 'Error rotating API key' });
  }
});

// OpenAI API endpoint
app.post('/api/openai', authMiddleware, async (req, res) => {
  try {
    const { apiKeyName, model, messages, temperature, maxTokens, customInstructions } = req.body;

    console.log('Received request:', { apiKeyName, model, messages, temperature, maxTokens, customInstructions });

    if (!apiKeyName) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    const apiKey = await encryptedKeyService.getApiKey(req.userId, apiKeyName);
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const canUseKey = await encryptedKeyService.updateApiKeyUsage(req.userId, apiKeyName);
    if (!canUseKey) {
      return res.status(403).json({ error: 'API key usage limit reached or key expired' });
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
        'Authorization': `Bearer ${apiKey.value}`,
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
app.post('/api/workflows', authMiddleware, async (req, res) => {
  try {
    const { name, data } = req.body;
    await fs.writeFile(path.join(__dirname, 'workflows', `${name}.json`), JSON.stringify(data));
    res.json({ message: 'Workflow saved successfully' });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({ error: 'Error saving workflow' });
  }
});

app.get('/api/workflows', authMiddleware, async (req, res) => {
  try {
    const files = await fs.readdir(path.join(__dirname, 'workflows'));
    const workflows = files.map(file => path.basename(file, '.json'));
    res.json(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ error: 'Error listing workflows' });
  }
});

app.get('/api/workflows/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(path.join(__dirname, 'workflows', `${name}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error retrieving workflow:', error);
    res.status(500).json({ error: 'Error retrieving workflow' });
  }
});

app.get('/api/workflows/:name/download', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(__dirname, 'workflows', `${name}.json`);
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading workflow:', error);
    res.status(500).json({ error: 'Error downloading workflow' });
  }
});

// New route for fetching agents
app.get('/api/agents', authMiddleware, async (req, res) => {
  try {
    // For now, we'll return a static list of agents
    // In the future, this could be fetched from a database
    const agents = [
      { id: 'ai-agent-1', name: 'General AI Assistant', type: 'ai' },
      { id: 'ai-agent-2', name: 'Code Review AI', type: 'ai' },
      { id: 'human-agent-1', name: 'Project Manager', type: 'human' },
      { id: 'human-agent-2', name: 'Software Developer', type: 'human' },
    ];
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Error fetching agents' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});