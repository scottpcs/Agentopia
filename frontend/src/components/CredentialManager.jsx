import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const CredentialManager = ({ onClose }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/keys');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Failed to fetch API keys. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('http://localhost:3000/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newKeyName, 
          value: newKeyValue,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to save API key');
      }
      setNewKeyName('');
      setNewKeyValue('');
      setSuccess('API key saved successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error saving API key:', error);
      setError(`Failed to save API key: ${error.message}`);
    }
  };

  const handleDelete = async (name) => {
    try {
      const response = await fetch(`http://localhost:3000/api/keys/${name}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setSuccess('API key deleted successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError(`Failed to delete API key: ${error.message}`);
    }
  };

  return (
    <div className="credential-manager p-4 bg-white shadow-lg rounded-lg max-w-md w-full">
      <h2 className="text-xl font-bold mb-4">API Key Manager</h2>
      
      {error && <div className="error-message mb-4 text-red-500">{error}</div>}
      {success && <div className="success-message mb-4 text-green-500">{success}</div>}

      <form onSubmit={handleSubmit} className="mb-4 space-y-4">
        <div>
          <Label htmlFor="keyName">Key Name:</Label>
          <Input
            id="keyName"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="keyValue">API Key:</Label>
          <Input
            id="keyValue"
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            required
            type="password"
          />
        </div>
        <Button type="submit">Save API Key</Button>
      </form>

      <div className="api-keys-list">
        <h3 className="font-semibold mb-2">Saved API Keys:</h3>
        {apiKeys.length > 0 ? (
          <ul className="space-y-2">
            {apiKeys.map((key) => (
              <li key={key.id} className="flex justify-between items-center">
                <span>{key.name}</span>
                <Button onClick={() => handleDelete(key.name)} variant="destructive">Delete</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No API keys saved yet.</p>
        )}
      </div>
      <Button onClick={onClose} className="mt-4">Close</Button>
    </div>
  );
};

export default CredentialManager;