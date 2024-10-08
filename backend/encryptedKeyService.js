const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

class EncryptedKeyService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  async init() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          encrypted_value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async saveApiKey(userId, name, value) {
    const encryptedValue = this.encrypt(value);
    const query = 'INSERT INTO api_keys(user_id, name, encrypted_value) VALUES($1, $2, $3) RETURNING id';
    try {
      const result = await this.pool.query(query, [userId, name, encryptedValue]);
      console.log('API key saved successfully');
      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  }

  async getApiKey(userId, name) {
    const query = 'SELECT encrypted_value FROM api_keys WHERE user_id = $1 AND name = $2';
    try {
      const result = await this.pool.query(query, [userId, name]);
      if (result.rows.length === 0) {
        console.log('API key not found');
        return null;
      }
      const decryptedValue = this.decrypt(result.rows[0].encrypted_value);
      console.log('API key retrieved successfully');
      return decryptedValue;
    } catch (error) {
      console.error('Error retrieving API key:', error);
      throw error;
    }
  }

  async listApiKeys(userId) {
    const query = 'SELECT id, name, created_at FROM api_keys WHERE user_id = $1';
    try {
      const result = await this.pool.query(query, [userId]);
      console.log('API keys listed successfully');
      return result.rows;
    } catch (error) {
      console.error('Error listing API keys:', error);
      throw error;
    }
  }

  async deleteApiKey(userId, name) {
    const query = 'DELETE FROM api_keys WHERE user_id = $1 AND name = $2';
    try {
      await this.pool.query(query, [userId, name]);
      console.log('API key deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  }
}

module.exports = new EncryptedKeyService();