// server.js
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

// Startup diagnostics
console.log('Server starting up...', {
  port,
  hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
  encryptionKeyLength: process.env.ENCRYPTION_KEY?.length,
  databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
});

// Ensure required directories exist
const ensureDirectories = async () => {
  const dirs = ['workflows'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    try {
      await fs.access(dirPath);
      console.log(`Directory exists: ${dir}`);
    } catch {
      console.log(`Creating directory: ${dir}`);
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
};

// Initialize the server
const initializeServer = async () => {
  try {
    await ensureDirectories();
    console.log('Directories initialized');
    
    await encryptedKeyService.init();
    console.log('Encrypted key service initialized');
  } catch (error) {
    console.error('Error during server initialization:', error);
    process.exit(1);
  }
};

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// CORS configuration
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

// Auth middleware (placeholder)
const authMiddleware = (req, res, next) => {
  req.userId = 1;
  next();
};

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(apiLimiter);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Agentopia Backend Server',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-db', authMiddleware, async (req, res) => {
  try {
    const result = await encryptedKeyService.pool.query('SELECT NOW()');
    res.json({ 
      status: 'success',
      message: 'Database connection successful',
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error.message
    });
  }
});

app.get('/api/key-service-status', authMiddleware, async (req, res) => {
  try {
    const keys = await encryptedKeyService.listApiKeys(req.userId);
    res.json({
      status: 'operational',
      keysCount: keys.length,
      encryption: {
        available: !!encryptedKeyService.encryptionKey,
        keyLength: encryptedKeyService.encryptionKey?.length
      }
    });
  } catch (error) {
    console.error('Key service status check failed:', error);
    res.status(500).json({
      error: 'Key service check failed',
      details: error.message
    });
  }
});

// API Key Management
app.post('/api/keys', authMiddleware, async (req, res) => {
  try {
    console.log('Creating new API key:', { name: req.body.name });
    const { name, value, expiresAt, usageLimit } = req.body;
    if (!name || !value) {
      return res.status(400).json({ error: 'Name and value are required' });
    }
    
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    const usageLimitNum = usageLimit ? parseInt(usageLimit) : null;

    const keyId = await encryptedKeyService.saveApiKey(
      req.userId, 
      name, 
      value, 
      expiresAtDate, 
      usageLimitNum
    );
    
    console.log('API key created successfully:', { keyId, name });
    res.json({ message: 'API key saved successfully', id: keyId });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ 
      error: 'Error saving API key', 
      details: error.message 
    });
  }
});

app.get('/api/keys', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching API keys list');
    const keys = await encryptedKeyService.listApiKeys(req.userId);
    console.log(`Found ${keys.length} API keys`);
    res.json(keys);
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Error listing API keys' });
  }
});

app.get('/api/debug-key/:keyName', authMiddleware, async (req, res) => {
  console.log('Debug key endpoint hit:', req.params.keyName);
  try {
    const { keyName } = req.params;
    const apiKey = await encryptedKeyService.getApiKey(req.userId, keyName);
    if (!apiKey) {
      console.log('API key not found:', keyName);
      return res.status(404).json({ error: 'API key not found' });
    }
    
    const debugInfo = {
      name: apiKey.name,
      exists: true,
      length: apiKey.value?.length || 0,
      prefix: apiKey.value ? apiKey.value.substring(0, 3) + '...' : null,
      expiresAt: apiKey.expiresAt,
      usageLimit: apiKey.usageLimit,
      usageCount: apiKey.usageCount,
      created: apiKey.created_at
    };

    console.log('Debug info:', debugInfo);
    res.json(debugInfo);
  } catch (error) {
    console.error('Error in debug-key endpoint:', error);
    res.status(500).json({ 
      error: 'Error accessing API key',
      details: error.message
    });
  }
});

app.get('/api/test-openai-key/:keyName', authMiddleware, async (req, res) => {
  try {
    const { keyName } = req.params;
    console.log('Testing OpenAI key:', keyName);
    
    const apiKey = await encryptedKeyService.getApiKey(req.userId, keyName);
    if (!apiKey) {
      console.log('API key not found:', keyName);
      return res.status(404).json({ error: 'API key not found' });
    }

    console.log('Testing API key with OpenAI');
    const response = await axios({
      method: 'get',
      url: 'https://api.openai.com/v1/models',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`
      }
    });

    console.log('OpenAI API test successful');
    res.json({ 
      status: 'success',
      message: 'API key is valid',
      models: response.data.data.map(m => m.id)
    });
  } catch (error) {
    console.error('Error testing OpenAI key:', {
      message: error.message,
      response: error.response?.data
    });
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'Invalid API key',
        details: 'The API key was rejected by OpenAI'
      });
    }
    
    res.status(500).json({
      error: 'Failed to verify API key',
      details: error.message,
      response: error.response?.data
    });
  }
});

// OpenAI API endpoint
app.post('/api/openai', authMiddleware, async (req, res) => {
  let stage = 'init';
  try {
    stage = 'request validation';
    const { 
      apiKeyId, 
      model, 
      messages, 
      temperature, 
      maxTokens 
    } = req.body;

    console.log('OpenAI request validation:', {
      apiKeyId,
      model,
      messageCount: messages?.length,
      temperature,
      maxTokens
    });

    if (!apiKeyId) {
      console.error('Missing apiKeyId in backend request');
      return res.status(400).json({ error: 'API key name is required' });
    }

    stage = 'api key retrieval';
    const apiKey = await encryptedKeyService.getApiKey(req.userId, apiKeyId);
    if (!apiKey) {
      console.error(`API key not found: ${apiKeyId}`);
      return res.status(404).json({ error: 'API key not found' });
    }

    const modelMap = {
      'gpt-4o': 'gpt-4o-2024-08-06',
      'gpt-4o-mini': 'gpt-4o-mini-2024-07-18',
      'o3-mini': 'o3-mini-2025-01-31',
      'o1-mini': 'o1-mini-2024-09-12'
    };

    stage = 'model mapping';
    const actualModel = modelMap[model] || model;
    console.log('Using model:', { 
      originalModel: model, 
      mappedModel: actualModel 
    });

    stage = 'openai api call';
    console.log('Making OpenAI API call with configuration:', {
      model: actualModel,
      messageCount: messages.length,
      apiKeyLength: apiKey.value.length
    });

    const openaiResponse = await axios({
      method: 'post',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${apiKey.value}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: actualModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      },
      timeout: 30000
    });

    stage = 'response processing';
    console.log('OpenAI API response received:', {
      status: openaiResponse.status,
      hasChoices: !!openaiResponse.data.choices,
      messageLength: openaiResponse.data.choices?.[0]?.message?.content?.length
    });

    res.json(openaiResponse.data);
  } catch (error) {
    console.error(`Error in OpenAI API call (stage: ${stage}):`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'OpenAI API Error',
        details: error.response.data.error?.message || error.message,
        type: 'api_error',
        stage
      });
    } else if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request Timeout',
        details: 'The request to OpenAI API timed out',
        type: 'timeout',
        stage
      });
    } else {
      return res.status(500).json({
        error: 'Internal Server Error',
        details: error.message,
        type: 'server_error',
        stage
      });
    }
  }
});

// Add these route handlers to server.js just before the server startup code

// Workflow Management
app.get('/api/workflows', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching workflows');
    const workflowsDir = path.join(__dirname, 'workflows');
    
    // Ensure workflows directory exists
    try {
      await fs.access(workflowsDir);
    } catch {
      await fs.mkdir(workflowsDir, { recursive: true });
    }

    const files = await fs.readdir(workflowsDir);
    const workflows = files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
    
    console.log(`Found ${workflows.length} workflows`);
    res.json(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ error: 'Error listing workflows' });
  }
});

app.post('/api/workflows', authMiddleware, async (req, res) => {
  try {
    const { name, data } = req.body;
    console.log(`Saving workflow: ${name}`);
    
    if (!name || !data) {
      return res.status(400).json({ error: 'Name and data are required' });
    }

    const workflowPath = path.join(__dirname, 'workflows', `${name}.json`);
    await fs.writeFile(workflowPath, JSON.stringify(data, null, 2));
    
    console.log(`Workflow saved: ${name}`);
    res.json({ message: 'Workflow saved successfully' });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({ error: 'Error saving workflow' });
  }
});

app.get('/api/workflows/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    console.log(`Fetching workflow: ${name}`);
    
    const workflowPath = path.join(__dirname, 'workflows', `${name}.json`);
    const data = await fs.readFile(workflowPath, 'utf8');
    
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error retrieving workflow:', error);
    res.status(500).json({ error: 'Error retrieving workflow' });
  }
});

// Agent Management
app.get('/api/agents', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching agents list');
    // Return a list of predefined agents
    const agents = [
      {
        id: 'ai-agent-1',
        name: 'General AI Assistant',
        type: 'ai',
        role: { type: 'assistant' },
        model: 'gpt-4',
        description: 'General-purpose AI assistant for various tasks'
      },
      {
        id: 'ai-agent-2',
        name: 'Code Review AI',
        type: 'ai',
        role: { type: 'reviewer' },
        model: 'gpt-4',
        description: 'Specialized AI for code review and analysis'
      },
      {
        id: 'human-agent-1',
        name: 'Project Manager',
        type: 'human',
        role: { type: 'manager' },
        description: 'Human project manager for workflow oversight'
      },
      {
        id: 'human-agent-2',
        name: 'Software Developer',
        type: 'human',
        role: { type: 'developer' },
        description: 'Human software developer for implementation tasks'
      }
    ];
    
    console.log(`Returning ${agents.length} predefined agents`);
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Error fetching agents' });
  }
});

// Optional: Add an endpoint to save custom agents
app.post('/api/agents', authMiddleware, async (req, res) => {
  try {
    const agent = req.body;
    console.log('Creating new agent:', { name: agent.name, type: agent.type });
    
    // Here you would typically save the agent to a database
    // For now, we'll just return success
    res.json({ 
      message: 'Agent created successfully',
      agent: {
        ...agent,
        id: `custom-agent-${Date.now()}`
      }
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Error creating agent' });
  }
});

// Start the server
initializeServer()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });