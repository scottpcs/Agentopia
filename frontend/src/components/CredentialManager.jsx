import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CredentialManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('keys');
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/${activeTab}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      setError(`Failed to fetch ${activeTab}. Please try again.`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`http://localhost:3000/api/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newItemName, 
          value: newItemValue,
          expiresAt: expiresAt || null,
          usageLimit: usageLimit ? parseInt(usageLimit) : null
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `Failed to save ${activeTab.slice(0, -1)}`);
      }
      setNewItemName('');
      setNewItemValue('');
      setExpiresAt('');
      setUsageLimit('');
      setSuccess(`${activeTab.slice(0, -1)} saved successfully`);
      fetchItems();
    } catch (error) {
      console.error(`Error saving ${activeTab.slice(0, -1)}:`, error);
      setError(`Failed to save ${activeTab.slice(0, -1)}: ${error.message}`);
    }
  };

  const handleDelete = async (name) => {
    try {
      const response = await fetch(`http://localhost:3000/api/${activeTab}/${name}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setSuccess(`${activeTab.slice(0, -1)} deleted successfully`);
      fetchItems();
    } catch (error) {
      console.error(`Error deleting ${activeTab.slice(0, -1)}:`, error);
      setError(`Failed to delete ${activeTab.slice(0, -1)}: ${error.message}`);
    }
  };

  return (
    <div className="credential-manager p-4 bg-white shadow-lg rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Credential Manager</h2>
        <Button onClick={onClose} variant="outline">Close</Button>
      </div>
      
      <div className="tabs mb-4 flex space-x-2">
        <Button 
          onClick={() => setActiveTab('keys')} 
          variant={activeTab === 'keys' ? 'default' : 'outline'}
        >
          API Keys
        </Button>
        <Button 
          onClick={() => setActiveTab('assistants')} 
          variant={activeTab === 'assistants' ? 'default' : 'outline'}
        >
          Assistants
        </Button>
        <Button 
          onClick={() => setActiveTab('threads')} 
          variant={activeTab === 'threads' ? 'default' : 'outline'}
        >
          Threads
        </Button>
      </div>

      {error && <div className="error-message mb-4 text-red-500">{error}</div>}
      {success && <div className="success-message mb-4 text-green-500">{success}</div>}

      <form onSubmit={handleSubmit} className="mb-4 space-y-4">
        <div>
          <Label htmlFor="itemName">Name:</Label>
          <Input
            id="itemName"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="itemValue">{activeTab === 'keys' ? 'API Key' : 'ID'}:</Label>
          <Input
            id="itemValue"
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            required
            type={activeTab === 'keys' ? 'password' : 'text'}
          />
        </div>
        {activeTab === 'keys' && (
          <>
            <div>
              <Label htmlFor="expiresAt">Expires At (optional):</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="usageLimit">Usage Limit (optional):</Label>
              <Input
                id="usageLimit"
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                min="1"
              />
            </div>
          </>
        )}
        <Button type="submit">Save {activeTab.slice(0, -1)}</Button>
      </form>

      <div className="items-list">
        <h3 className="font-semibold mb-2">Saved {activeTab}:</h3>
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex justify-between items-center">
                <span>{item.name || item}</span>
                <Button onClick={() => handleDelete(item.name || item)} variant="destructive">Delete</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No {activeTab} saved yet.</p>
        )}
      </div>
    </div>
  );
};

export default CredentialManager;