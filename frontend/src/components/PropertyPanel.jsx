import React, { useState, useEffect } from 'react';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import CreativityAxes from './CreativityAxes';
import { convertCreativityToModelSettings, generateCustomInstructions } from '../utils/creativityConverter';

const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'High-intelligence flagship model for complex, multi-step tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Affordable and intelligent small model for fast, lightweight tasks' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'The latest GPT-4 Turbo model with vision capabilities' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Powerful model for complex tasks, 8k context window' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, inexpensive model for many tasks' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k', description: 'GPT-3.5 Turbo with extended 16k token context' },
];

const PropertyPanel = ({ node, onChange, onClose }) => {
  const [localNode, setLocalNode] = useState(node);
  const [apiKeys, setApiKeys] = useState([]);
  const [creativity, setCreativity] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setLocalNode(node);
    fetchApiKeys();
  }, [node]);

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
    setLocalNode(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [key]: value
      }
    }));
    onChange(localNode.id, { [key]: value });
  };

  const handleCreativityChange = (newCreativity) => {
    setCreativity(newCreativity);
    const modelSettings = convertCreativityToModelSettings(newCreativity);
    const customInstructions = generateCustomInstructions(newCreativity);
    handleChange('temperature', modelSettings.temperature);
    handleChange('maxTokens', modelSettings.maxTokens);
    handleChange('customInstructions', customInstructions);
  };

  if (!localNode) return null;

  return (
    <div className="property-panel fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4 overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">Node Properties</h3>
      <Button className="absolute top-2 right-2" onClick={onClose}>X</Button>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={localNode.data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>
        
        {localNode.type === 'aiAgent' && (
          <>
            <div>
              <Label htmlFor="model">Model</Label>
              <Select
                id="model"
                value={localNode.data.model || 'gpt-3.5-turbo'}
                onChange={(e) => handleChange('model', e.target.value)}
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {localNode.data.model && (
                <p className="text-sm text-gray-600 mt-1">
                  {modelOptions.find(o => o.value === localNode.data.model)?.description}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Select
                id="apiKey"
                value={localNode.data.apiKeyId || ''}
                onChange={(e) => handleChange('apiKeyId', e.target.value)}
              >
                <option value="">Select API Key</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.name}>
                    {key.name}
                  </option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={localNode.data.temperature || 0.7}
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
                value={localNode.data.maxTokens || 150}
                onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="systemInstructions">System Instructions</Label>
              <textarea
                id="systemInstructions"
                value={localNode.data.systemInstructions || ''}
                onChange={(e) => handleChange('systemInstructions', e.target.value)}
                className="w-full p-2 border rounded mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="customInstructions">Custom Instructions</Label>
              <textarea
                id="customInstructions"
                value={localNode.data.customInstructions || ''}
                onChange={(e) => handleChange('customInstructions', e.target.value)}
                className="w-full p-2 border rounded mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>Creativity Setting</Label>
              <CreativityAxes value={creativity} onChange={handleCreativityChange} />
            </div>
          </>
        )}
        
        {localNode.type === 'humanAgent' && (
          <>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={localNode.data.role || ''}
                onChange={(e) => handleChange('role', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={localNode.data.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={localNode.data.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </>
        )}
        
        {localNode.type === 'textInput' && (
          <div>
            <Label htmlFor="inputText">Input Text</Label>
            <textarea
              id="inputText"
              value={localNode.data.inputText || ''}
              onChange={(e) => handleChange('inputText', e.target.value)}
              className="w-full p-2 border rounded mt-1"
              rows={4}
            />
          </div>
        )}
        
        {localNode.type === 'textOutput' && (
          <div>
            <Label htmlFor="outputText">Output Text (Read Only)</Label>
            <textarea
              id="outputText"
              value={localNode.data.text || ''}
              readOnly
              className="w-full p-2 border rounded mt-1 bg-gray-100"
              rows={4}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;