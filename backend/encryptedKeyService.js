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
      // Create the table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          encrypted_value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
  
      // Add new columns if they don't exist
      await this.pool.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE api_keys ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column expires_at already exists in api_keys.';
          END;
  
          BEGIN
            ALTER TABLE api_keys ADD COLUMN usage_limit INTEGER;
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column usage_limit already exists in api_keys.';
          END;
  
          BEGIN
            ALTER TABLE api_keys ADD COLUMN usage_count INTEGER DEFAULT 0;
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column usage_count already exists in api_keys.';
          END;
        END $$;
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

  async saveApiKey(userId, name, value, expiresAt, usageLimit) {
    const encryptedValue = this.encrypt(value);
    const query = `
      INSERT INTO api_keys(user_id, name, encrypted_value, expires_at, usage_limit)
      VALUES($1, $2, $3, $4, $5)
      RETURNING id
    `;
    try {
      const result = await this.pool.query(query, [userId, name, encryptedValue, expiresAt, usageLimit]);
      console.log('API key saved successfully');
      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  }

// encryptedKeyService.js
async getApiKey(userId, name) {
  const query = 'SELECT * FROM api_keys WHERE user_id = $1 AND name = $2';
  try {
    const result = await this.pool.query(query, [userId, name]);
    if (result.rows.length === 0) {
      console.log('API key not found');
      return null;
    }
    const row = result.rows[0];
    const decryptedValue = this.decrypt(row.encrypted_value);
    console.log('API key retrieved successfully');
    return {
      id: row.id,
      name: row.name,
      value: decryptedValue,
      expiresAt: row.expires_at,
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      createdAt: row.created_at
    };
  } catch (error) {
    console.error('Error retrieving API key:', error);
    throw error;
  }
}

  async listApiKeys(userId) {
    const query = 'SELECT id, name, expires_at, usage_limit, usage_count, created_at FROM api_keys WHERE user_id = $1';
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

  async updateApiKeyUsage(userId, name) {
    const query = `
      UPDATE api_keys
      SET usage_count = usage_count + 1
      WHERE user_id = $1 AND name = $2
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
      RETURNING usage_count, usage_limit
    `;
    try {
      const result = await this.pool.query(query, [userId, name]);
      if (result.rows.length === 0) {
        console.log('API key not found, expired, or usage limit reached');
        return false;
      }
      console.log('API key usage updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating API key usage:', error);
      throw error;
    }
  }

  async rotateApiKey(userId, name) {
    const newValue = crypto.randomBytes(32).toString('hex');
    const encryptedValue = this.encrypt(newValue);
    const query = `
      UPDATE api_keys
      SET encrypted_value = $3, usage_count = 0
      WHERE user_id = $1 AND name = $2
      RETURNING id
    `;
    try {
      const result = await this.pool.query(query, [userId, name, encryptedValue]);
      if (result.rows.length === 0) {
        console.log('API key not found');
        return null;
      }
      console.log('API key rotated successfully');
      return newValue;
    } catch (error) {
      console.error('Error rotating API key:', error);
      throw error;
    }
  }
}

module.exports = new EncryptedKeyService();