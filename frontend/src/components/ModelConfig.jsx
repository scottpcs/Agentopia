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

const ModelConfig = ({ 
  config, 
  onChange, 
  apiKeys = [], 
  systemInstructions,
  customInstructions,
  error 
}) => {
  const currentModel = MODEL_CONFIGS[config.model || 'gpt-4o'];
  const showInstructionsPreview = Boolean(systemInstructions || customInstructions);

  const handleModelChange = (e) => {
    const modelId = e.target.value;
    const modelConfig = MODEL_CONFIGS[modelId];
    
    onChange({
      ...config,
      model: modelId,
      parameters: {
        ...config.parameters,
        temperature: modelConfig.temperatureRange.min + 
          (modelConfig.temperatureRange.max - modelConfig.temperatureRange.min) / 2,
        maxTokens: modelConfig.defaultMaxTokens
      }
    });
  };

  const handleParameterChange = (param, value) => {
    const modelConfig = MODEL_CONFIGS[config.model || 'gpt-4o'];
    
    if (param === 'temperature') {
      const { min, max } = modelConfig.temperatureRange;
      value = Math.max(min, Math.min(max, value));
    } else if (param === 'maxTokens') {
      value = Math.max(1, Math.min(modelConfig.maxTokens, value));
    }

    onChange({
      ...config,
      parameters: {
        ...config.parameters,
        [param]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label>Model Selection</Label>
          <Select
            value={config.model || 'gpt-4o'}
            onChange={handleModelChange}
            className="mt-1.5"
          >
            {MODEL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <p className="text-sm text-gray-500 mt-1.5">
            {MODEL_OPTIONS.find(m => m.value === config.model)?.description}
          </p>
        </div>

        <div>
          <Label>API Key</Label>
          <Select
            value={config.apiKeyId || ''}
            onChange={(e) => onChange({ ...config, apiKeyId: e.target.value })}
            className="mt-1.5"
          >
            <option value="">Select API Key</option>
            {apiKeys.map(key => (
              <option key={key.id} value={key.name}>
                {key.name}
              </option>
            ))}
          </Select>
          {!config.apiKeyId && (
            <p className="text-sm text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              API key required for model usage
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-gray-500">
                  {config.parameters?.temperature?.toFixed(2) || '0.70'}
                </span>
              </div>
              <Input
                type="range"
                min={currentModel.temperatureRange.min}
                max={currentModel.temperatureRange.max}
                step="0.1"
                value={config.parameters?.temperature || 0.7}
                onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                className="mt-1.5"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More Focused</span>
                <span>More Creative</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between">
                <Label>Max Tokens</Label>
                <span className="text-sm text-gray-500">
                  {config.parameters?.maxTokens || currentModel.defaultMaxTokens}
                </span>
              </div>
              <Input
                type="number"
                min="1"
                max={currentModel.maxTokens}
                value={config.parameters?.maxTokens || currentModel.defaultMaxTokens}
                onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
                className="mt-1.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum available: {currentModel.maxTokens.toLocaleString()} tokens
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 flex items-center gap-1 mt-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {showInstructionsPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Instructions Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemInstructions && (
                <div>
                  <Label>System Instructions</Label>
                  <div className="mt-1.5 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap border border-gray-200">
                    {systemInstructions}
                  </div>
                </div>
              )}
              
              {customInstructions && (
                <div>
                  <Label>Custom Instructions</Label>
                  <div className="mt-1.5 p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap border border-gray-200">
                    {customInstructions}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Estimation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Cost per 1K tokens: ${(currentModel.costPerToken * 1000).toFixed(3)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Estimated cost will vary based on actual usage and token count
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelConfig;