import React, { useState, useEffect } from 'react';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cross2Icon } from '@radix-ui/react-icons';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import { validateModelConfig, MODEL_CONFIGS } from '../utils/modelConfigUtils';
import { estimateTokenUsage } from '../services/openaiService';

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'High-intelligence flagship model for complex, multi-step tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Affordable and intelligent small model for fast, lightweight tasks' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'The latest GPT-4 Turbo model with vision capabilities' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Powerful model for complex tasks, 8k context window' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, inexpensive model for many tasks' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k', description: 'GPT-3.5 Turbo with extended 16k token context' }
];

const PropertyPanel = ({ node, onChange, onClose, apiKeys = [] }) => {
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(node.data?.apiKeyId || '');

  // Sync local state with node data
  useEffect(() => {
    setLocalApiKey(node.data?.apiKeyId || '');
  }, [node.data?.apiKeyId]);

  const handleChange = (key, value) => {
    try {
      setError('');
      if (key === 'apiKeyId') {
        // Update local state immediately
        setLocalApiKey(value);
        
        // Create the complete updated data object
        const updatedData = {
          ...node.data,
          apiKeyId: value,
          modelConfig: {
            ...node.data.modelConfig,
            apiKeyId: value
          }
        };
        
        console.log('Updating node with API key:', {
          nodeId: node.id,
          apiKeyId: value,
          fullData: updatedData
        });
        
        onChange(node.id, updatedData);
      } else if (key === 'modelConfig') {
        // Handle model configuration updates
        onChange(node.id, {
          ...node.data,
          modelConfig: {
            ...node.data.modelConfig,
            ...value
          }
        });
      } else {
        // Handle other property updates
        onChange(node.id, {
          ...node.data,
          [key]: value
        });
      }
    } catch (error) {
      console.error('Error updating node:', error);
      setError(`Failed to update: ${error.message}`);
    }
  };

  const renderInstructions = () => {
    if (!node.data) return null;

    const config = generateAgentConfiguration({
      personality: node.data.personality || {},
      role: node.data.role || {},
      expertise: node.data.expertise || {}
    });

    const modelConfig = validateModelConfig(
      node.data.modelConfig?.model,
      node.data.modelConfig?.parameters?.temperature,
      node.data.modelConfig?.parameters?.maxTokens
    );

    const messages = [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: 'Sample message for token estimation' }
    ];

    return (
      <div className="mt-4 space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <Label>System Instructions</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                {showInstructions ? 'Hide' : 'Show'}
              </Button>
            </div>
            
            {showInstructions && (
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700 max-h-96 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                {config.systemPrompt}
              </pre>
            )}

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span>{modelConfig.temperature.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max Tokens:</span>
                <span>{modelConfig.maxTokens}</span>
              </div>
              <div className="flex justify-between">
                <span>Model:</span>
                <span>{modelConfig.model}</span>
              </div>
              {config.modelSettings && (
                <>
                  <div className="flex justify-between">
                    <span>Presence Penalty:</span>
                    <span>{config.modelSettings.presencePenalty?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frequency Penalty:</span>
                    <span>{config.modelSettings.frequencyPenalty?.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-gray-500">
          Estimated cost per interaction: ${(MODEL_CONFIGS[modelConfig.model]?.costPerToken * estimateTokenUsage(messages))?.toFixed(4) || '0.0000'}
        </div>
      </div>
    );
  };

  return (
    <div className="property-panel fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Node Properties</h3>
        <Button 
          variant="ghost" 
          onClick={onClose}
          className="p-1 h-auto"
        >
          <Cross2Icon className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={node.data?.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="mt-1"
          />
        </div>
        
        {(node.type === 'aiAgent' || node.data?.type === 'ai') && (
          <>
            <div>
              <Label htmlFor="apiKeyName">API Key</Label>
              <select
                id="apiKeyName"
                value={localApiKey}
                onChange={(e) => handleChange('apiKeyId', e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Select API Key</option>
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.name}>
                    {key.name}
                  </option>
                ))}
              </select>
              {!localApiKey && (
                <p className="text-sm text-amber-600 mt-1">
                  Please select an API key to enable this agent
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                value={node.data?.modelConfig?.model || ''}
                onChange={(e) => handleChange('modelConfig', {
                  ...node.data.modelConfig,
                  model: e.target.value
                })}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Select Model</option>
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
              {node.data?.modelConfig?.model && (
                <p className="text-sm text-gray-600 mt-1">
                  {MODEL_OPTIONS.find(o => o.value === node.data.modelConfig?.model)?.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={node.data?.modelConfig?.parameters?.temperature || 0.7}
                onChange={(e) => handleChange('modelConfig', {
                  ...node.data.modelConfig,
                  parameters: {
                    ...node.data.modelConfig?.parameters,
                    temperature: parseFloat(e.target.value)
                  }
                })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Controls randomness: 0 is focused, 1 is balanced, 2 is more creative
              </p>
            </div>

            <div>
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="1"
                max={MODEL_CONFIGS[node.data?.modelConfig?.model || 'gpt-4o-mini']?.maxTokens || 4096}
                value={node.data?.modelConfig?.parameters?.maxTokens || 2048}
                onChange={(e) => handleChange('modelConfig', {
                  ...node.data.modelConfig,
                  parameters: {
                    ...node.data.modelConfig?.parameters,
                    maxTokens: parseInt(e.target.value)
                  }
                })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum length of generated response
              </p>
            </div>

            {renderInstructions()}
          </>
        )}
        
        {(node.type === 'humanAgent' || node.data?.type === 'human') && (
          <>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={node.data?.role || ''}
                onChange={(e) => handleChange('role', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <textarea
                id="instructions"
                value={node.data?.instructions || ''}
                onChange={(e) => handleChange('instructions', e.target.value)}
                className="w-full p-2 border rounded mt-1"
                rows={4}
              />
            </div>
          </>
        )}

        {node.type === 'textInput' && (
          <div>
            <Label htmlFor="inputText">Input Text</Label>
            <textarea
              id="inputText"
              value={node.data?.inputText || ''}
              onChange={(e) => handleChange('inputText', e.target.value)}
              className="w-full p-2 border rounded mt-1"
              rows={4}
            />
          </div>
        )}
        
        {node.type === 'textOutput' && (
          <div>
            <Label htmlFor="outputText">Output Text (Read Only)</Label>
            <textarea
              id="outputText"
              value={node.data?.text || ''}
              readOnly
              className="w-full p-2 border rounded mt-1 bg-gray-100"
              rows={4}
            />
          </div>
        )}

        {node.data?.lastOutput && (
          <Card>
            <CardContent className="pt-4">
              <Label>Last Output</Label>
              <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                {node.data.lastOutput}
              </div>
            </CardContent>
          </Card>
        )}

        {node.data?.error && (
          <Card className="border-red-200">
            <CardContent className="pt-4">
              <Label className="text-red-600">Error</Label>
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {node.data.error}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;