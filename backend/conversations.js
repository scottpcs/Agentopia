// Add to server.js or create a new conversations.js if you prefer separation

const express = require('express');
const { Pool } = require('pg');
const encryptedKeyService = require('./encryptedKeyService');
require('dotenv').config();

// Initialize database table for conversations
async function initializeConversationTables(pool) {
  try {
    // Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        mode VARCHAR(50) DEFAULT 'free-form',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    // Create conversation_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        agent_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        join_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        settings JSONB DEFAULT '{}'::jsonb
      );
    `);

    // Create conversation_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        role VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);

    console.log('Conversation tables initialized successfully');
  } catch (error) {
    console.error('Error initializing conversation tables:', error);
    throw error;
  }
}

// Initialize database tables when the server starts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Add to your server initialization
app.use(express.json());

// Create a new conversation
app.post('/api/conversations', authMiddleware, async (req, res) => {
  const { workflowId, name, mode, agents } = req.body;

  try {
    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the conversation
      const conversationResult = await client.query(
        `INSERT INTO conversations (workflow_id, name, mode)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [workflowId, name, mode]
      );
      
      const conversationId = conversationResult.rows[0].id;

      // Add participants
      if (agents && agents.length > 0) {
        const participantValues = agents.map((agent, index) => 
          `($1, $${index * 2 + 2}, $${index * 2 + 3})`
        ).join(', ');
        
        const participantParams = [conversationId];
        agents.forEach(agent => {
          participantParams.push(agent.id, agent.role);
        });

        await client.query(
          `INSERT INTO conversation_participants (conversation_id, agent_id, role)
           VALUES ${participantValues}`,
          participantParams
        );
      }

      await client.query('COMMIT');
      res.json({ id: conversationId, message: 'Conversation created successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation details
app.get('/api/conversations/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Get conversation details
    const conversationResult = await pool.query(
      `SELECT c.*, 
              json_agg(DISTINCT cp.*) as participants,
              json_agg(DISTINCT cm.* ORDER BY cm.timestamp) as messages
       FROM conversations c
       LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversationResult.rows[0]);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Add a message to a conversation
app.post('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { senderId, content, role, metadata } = req.body;

  try {
    // Verify sender is a participant
    const participantCheck = await pool.query(
      `SELECT 1 FROM conversation_participants
       WHERE conversation_id = $1 AND agent_id = $2`,
      [id, senderId]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Sender is not a participant in this conversation' });
    }

    // Add the message
    const messageResult = await pool.query(
      `INSERT INTO conversation_messages (conversation_id, sender_id, content, role, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, senderId, content, role, metadata || {}]
    );

    // Update conversation's updated_at timestamp
    await pool.query(
      `UPDATE conversations
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    res.json(messageResult.rows[0]);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Add or remove participants
app.patch('/api/conversations/:id/participants', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { add = [], remove = [] } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove participants
      if (remove.length > 0) {
        await client.query(
          `DELETE FROM conversation_participants
           WHERE conversation_id = $1 AND agent_id = ANY($2)`,
          [id, remove]
        );
      }

      // Add new participants
      if (add.length > 0) {
        const participantValues = add.map((_, index) => 
          `($1, $${index * 2 + 2}, $${index * 2 + 3})`
        ).join(', ');
        
        const participantParams = [id];
        add.forEach(agent => {
          participantParams.push(agent.id, agent.role);
        });

        await client.query(
          `INSERT INTO conversation_participants (conversation_id, agent_id, role)
           VALUES ${participantValues}`,
          participantParams
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Participants updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating participants:', error);
    res.status(500).json({ error: 'Failed to update participants' });
  }
});

// Get conversation history for a workflow
app.get('/api/workflows/:workflowId/conversations', authMiddleware, async (req, res) => {
  const { workflowId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*, 
              json_agg(DISTINCT cp.*) as participants,
              COUNT(DISTINCT cm.id) as message_count
       FROM conversations c
       LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
       LEFT JOIN conversation_messages cm ON c.id = cm.conversation_id
       WHERE c.workflow_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [workflowId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workflow conversations:', error);
    res.status(500).json({ error: 'Failed to fetch workflow conversations' });
  }
});

// Update conversation settings
app.patch('/api/conversations/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, mode, metadata } = req.body;

  try {
    const result = await pool.query(
      `UPDATE conversations
       SET name = COALESCE($1, name),
           mode = COALESCE($2, mode),
           metadata = COALESCE($3, metadata),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, mode, metadata, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete a conversation
app.delete('/api/conversations/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});