const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//app.use(cors());
app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Ensure the workflows directory exists
const workflowsDir = path.join(__dirname, 'workflows');
fs.mkdir(workflowsDir, { recursive: true }).catch(console.error);

// Existing endpoints...

// New endpoints for workflow management
app.post('/api/workflows', async (req, res) => {
  try {
    const { name, data } = req.body;
    const filename = `${name}.json`;
    await fs.writeFile(path.join(workflowsDir, filename), JSON.stringify(data));
    res.json({ message: 'Workflow saved successfully', filename });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({ error: 'Error saving workflow' });
  }
});

app.get('/api/workflows', async (req, res) => {
  try {
    const files = await fs.readdir(workflowsDir);
    const workflows = files.filter(file => path.extname(file) === '.json');
    res.json(workflows);
  } catch (error) {
    console.error('Error listing workflows:', error);
    res.status(500).json({ error: 'Error listing workflows' });
  }
});

app.get('/api/workflows/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = await fs.readFile(path.join(workflowsDir, `${name}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error loading workflow:', error);
    res.status(500).json({ error: 'Error loading workflow' });
  }
});

app.get('/api/workflows/:name/download', async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(workflowsDir, `${name}.json`);
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading workflow:', error);
    res.status(500).json({ error: 'Error downloading workflow' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});