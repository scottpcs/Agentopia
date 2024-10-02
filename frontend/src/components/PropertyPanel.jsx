import React, { useState, useEffect } from 'react';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'High-intelligence flagship model for complex, multi-step tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Affordable and intelligent small model for fast, lightweight tasks' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'The latest GPT-4 Turbo model with vision capabilities' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Powerful model for complex tasks, 8k context window' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, inexpensive model for many tasks' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k', description: 'GPT-3.5 Turbo with extended 16k token context' },
];

const PropertyPanel = ({ node, onChange, onClose }) => {
  const [apiKeys, setApiKeys] = useState([]);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const keys = await response.json();
      setApiKeys(keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const handleChange = (key, value) => {
    onChange(node.id, { [key]: value });
  };

  if (!node) return null;

  return (
    <div className="property-panel fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4 overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">Node Properties</h3>
      <Button className="absolute top-2 right-2" onClick={onClose}>X</Button>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={node.data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </div>
        
        {node.type === 'agent' && (
          <>
            <div>
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                value={node.data.model || 'gpt-3.5-turbo'}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full p-2 border rounded"
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {node.data.model && (
                <p className="text-sm text-gray-600 mt-1">
                  {modelOptions.find(o => o.value === node.data.model)?.description}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <select
                id="apiKey"
                value={node.data.apiKeyId || ''}
                onChange={(e) => handleChange('apiKeyId', e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select API Key</option>
                {apiKeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label htmlFor="systemMessage">System Message</Label>
              <textarea
                id="systemMessage"
                value={node.data.systemMessage || ''}
                onChange={(e) => handleChange('systemMessage', e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={node.data.temperature || 0.7}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                step="1"
                min="1"
                value={node.data.maxTokens || 150}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              />
            </div>
          </>
        )}
        
        {node.type === 'textInput' && (
          <div>
            <Label htmlFor="inputText">Input Text</Label>
            <textarea
              id="inputText"
              value={node.data.inputText || ''}
              onChange={(e) => handleChange('inputText', e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
        )}
        
        {node.type === 'textOutput' && (
          <div>
            <Label htmlFor="outputText">Output Text</Label>
            <textarea
              id="outputText"
              value={node.data.text || ''}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;