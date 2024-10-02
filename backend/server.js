const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Ensure the necessary directories exist
const workflowsDir = path.join(__dirname, 'workflows');
const keysDir = path.join(__dirname, 'keys');
const assistantsDir = path.join(__dirname, 'assistants');
const threadsDir = path.join(__dirname, 'threads');

Promise.all([
  fs.mkdir(workflowsDir, { recursive: true }),
  fs.mkdir(keysDir, { recursive: true }),
  fs.mkdir(assistantsDir, { recursive: true }),
  fs.mkdir(threadsDir, { recursive: true })
]).catch(console.error);

// Encryption functions
const algorithm = 'aes-256-ctr';
const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex')
  };
};

const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
  return decrypted.toString();
};

// API Key Management
app.post('/api/keys', async (req, res) => {
  try {
    const { name, value } = req.body;
    const encrypted = encrypt(value);
    await fs.writeFile(path.join(keysDir, `${name}.json`), JSON.stringify(encrypted));
    res.json({ message: 'API key saved successfully' });
  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({ error: 'Error saving API key' });
  }
});

app.get('/api/keys', async (req, res) => {
  try {
    const files = await fs.readdir(keysDir);
    const keys = files.map(file => path.basename(file, '.json'));
    res.json(keys);
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Error listing API keys' });
  }
});

app.get('/api/keys/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(path.join(keysDir, `${name}.json`), 'utf8');
    const decrypted = decrypt(JSON.parse(data));
    res.json({ value: decrypted });
  } catch (error) {
    console.error('Error retrieving API key:', error);
    res.status(500).json({ error: 'Error retrieving API key' });
  }
});

// Assistant Management
app.post('/api/assistants', async (req, res) => {
  try {
    const { name, id } = req.body;
    await fs.writeFile(path.join(assistantsDir, `${name}.json`), JSON.stringify({ id }));
    res.json({ message: 'Assistant saved successfully' });
  } catch (error) {
    console.error('Error saving assistant:', error);
    res.status(500).json({ error: 'Error saving assistant' });
  }
});

app.get('/api/assistants', async (req, res) => {
  try {
    const files = await fs.readdir(assistantsDir);
    const assistants = files.map(file => path.basename(file, '.json'));
    res.json(assistants);
  } catch (error) {
    console.error('Error listing assistants:', error);
    res.status(500).json({ error: 'Error listing assistants' });
  }
});

app.get('/api/assistants/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(path.join(assistantsDir, `${name}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error retrieving assistant:', error);
    res.status(500).json({ error: 'Error retrieving assistant' });
  }
});

// Thread Management
app.post('/api/threads', async (req, res) => {
  try {
    const { name, id } = req.body;
    await fs.writeFile(path.join(threadsDir, `${name}.json`), JSON.stringify({ id }));
    res.json({ message: 'Thread saved successfully' });
  } catch (error) {
    console.error('Error saving thread:', error);
    res.status(500).json({ error: 'Error saving thread' });
  }
});

app.get('/api/threads', async (req, res) => {
  try {
    const files = await fs.readdir(threadsDir);
    const threads = files.map(file => path.basename(file, '.json'));
    res.json(threads);
  } catch (error) {
    console.error('Error listing threads:', error);
    res.status(500).json({ error: 'Error listing threads' });
  }
});

app.get('/api/threads/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(path.join(threadsDir, `${name}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error retrieving thread:', error);
    res.status(500).json({ error: 'Error retrieving thread' });
  }
});

// OpenAI API endpoint
app.post('/api/openai', async (req, res) => {
  try {
    const { keyId, model, messages, temperature, maxTokens } = req.body;

    const keyData = await fs.readFile(path.join(keysDir, `${keyId}.json`), 'utf8');
    const decrypted = decrypt(JSON.parse(keyData));

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    }, {
      headers: {
        'Authorization': `Bearer ${decrypted.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error in OpenAI API call:', error.message);
    res.status(500).json({ error: 'Error calling OpenAI API', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});