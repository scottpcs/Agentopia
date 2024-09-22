/**
 * PropertyPanel.jsx
 * 
 * This component displays and allows editing of a selected node's properties.
 * It appears as a side panel when a node is selected in the workflow.
 * 
 * Props:
 * - node: Object representing the selected node
 * - onChange: Function to handle changes to node properties
 * - onClose: Function to close the property panel
 * 
 * @component
 */

import React from 'react';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const modelOptions = [
  { value: 'gpt-4', label: 'GPT-4', description: 'High-intelligence flagship model for complex, multi-step tasks' },
  { value: 'gpt-4-mini', label: 'GPT-4o mini', description: 'Affordable and intelligent small model for fast, lightweight tasks' },
  { value: 'gpt-4-1-preview', label: 'GPT-4 1-Preview', description: 'Language model trained with reinforcement learning for complex reasoning' },
  { value: 'gpt-4-1-mini', label: 'GPT-4 1-Mini', description: 'Smaller version of 1-Preview for complex reasoning' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Previous set of high-intelligence models' },
  { value: 'gpt-4-0613', label: 'GPT-4 (June 13 Version)', description: 'Previous set of high-intelligence models' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, inexpensive model for simple tasks' },
];

const PropertyPanel = ({ node, onChange, onClose }) => {
  if (!node) return null;

  const handleChange = (key, value) => {
    onChange(node.id, { [key]: value });
  };

  return (
    <div className="property-panel fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4 overflow-y-auto text-xs">
      <h3 className="text-sm font-bold mb-4">Node Properties</h3>
      <Button className="absolute top-2 right-2 text-xxs py-1 px-2" onClick={onClose}>X</Button>
      
      <div className="space-y-2">
        <div>
          <Label htmlFor="label" className="text-xxs">Label</Label>
          <Input
            id="label"
            value={node.data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="mt-1 text-xxs w-full"
          />
        </div>
        
        <div>
          <Label htmlFor="model" className="text-xxs">Model</Label>
          <select
            id="model"
            value={node.data.model || 'gpt-4-mini'}
            onChange={(e) => handleChange('model', e.target.value)}
            className="w-full p-1 border rounded text-xxs mt-1"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {node.data.model && (
            <p className="text-xxs text-gray-600 mt-1 break-words">
              {modelOptions.find(o => o.value === node.data.model)?.description}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="systemMessage" className="text-xxs">System Message</Label>
          <textarea
            id="systemMessage"
            value={node.data.systemMessage || ''}
            onChange={(e) => handleChange('systemMessage', e.target.value)}
            className="w-full p-1 border rounded text-xxs mt-1"
            rows={3}
          />
        </div>
        
        <div>
          <Label htmlFor="temperature" className="text-xxs">Temperature</Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={node.data.temperature || 0.7}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className="mt-1 text-xxs w-full"
          />
        </div>
        
        <div>
          <Label htmlFor="maxTokens" className="text-xxs">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            step="1"
            min="1"
            value={node.data.maxTokens || 150}
            onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
            className="mt-1 text-xxs w-full"
          />
        </div>
        
        <div>
          <Label htmlFor="apiKey" className="text-xxs">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={node.data.apiKey || ''}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            placeholder="Enter your OpenAI API key"
            className="mt-1 text-xxs w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default PropertyPanel;