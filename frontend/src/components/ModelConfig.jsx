import React from 'react';
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { AlertCircle } from 'lucide-react';

// Using the existing model configurations from modelConfigUtils.js
const MODEL_CONFIGS = {
  'gpt-4o': {
    description: 'High-intelligence flagship model for complex, multi-step tasks',
    maxTokens: 4096,
    temperatureRange: { min: 0.1, max: 1.0 },
    costPerToken: 0.01,
    defaultMaxTokens: 2048
  },
  'gpt-4o-mini': {
    description: 'Affordable and intelligent small model for fast, lightweight tasks',
    maxTokens: 2048,
    temperatureRange: { min: 0.1, max: 1.0 },
    costPerToken: 0.005,
    defaultMaxTokens: 1024
  },
  'gpt-4-turbo': {
    description: 'The latest GPT-4 Turbo model with vision capabilities',
    maxTokens: 4096,
    temperatureRange: { min: 0.0, max: 2.0 },
    costPerToken: 0.01,
    defaultMaxTokens: 2048
  },
  'gpt-4': {
    description: 'Powerful model for complex tasks, 8k context window',
    maxTokens: 8192,
    temperatureRange: { min: 0.0, max: 2.0 },
    costPerToken: 0.03,
    defaultMaxTokens: 2048
  },
  'gpt-3.5-turbo': {
    description: 'Fast, inexpensive model for many tasks',
    maxTokens: 4096,
    temperatureRange: { min: 0.0, max: 2.0 },
    costPerToken: 0.002,
    defaultMaxTokens: 1024
  },
  'gpt-3.5-turbo-16k': {
    description: 'GPT-3.5 Turbo with extended 16k token context',
    maxTokens: 16384,
    temperatureRange: { min: 0.0, max: 2.0 },
    costPerToken: 0.003,
    defaultMaxTokens: 2048
  }
};

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'High-intelligence flagship model for complex, multi-step tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Affordable and intelligent small model for fast, lightweight tasks' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Latest GPT-4 model with improved capabilities' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Advanced model for complex tasks' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient for most tasks' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K', description: 'Extended context version of GPT-3.5' }
];

const ModelConfig = ({ config, onChange, apiKeys = [], error }) => {
  const handleApiKeyChange = (e) => {
    const apiKeyId = e.target.value;
    console.log('Updating API key:', apiKeyId);
    onChange({
      ...config,
      apiKeyId, // Ensure we're setting the apiKeyId in the modelConfig
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="apiKeyName">API Key</Label>
        <Select
          id="apiKeyName"
          value={config.apiKeyId || ''}
          onChange={handleApiKeyChange}
          className="mt-1"
        >
          <option value="">Select API Key</option>
          {apiKeys.map((key) => (
            <option key={key.id} value={key.name}>
              {key.name}
            </option>
          ))}
        </Select>
        {!config.apiKeyId && (
          <p className="text-sm text-amber-600 mt-1">
            Please select an API key to enable this agent
          </p>
        )}
      </div>
      {/* Rest of the component... */}
    </div>
  );
};

export default ModelConfig;