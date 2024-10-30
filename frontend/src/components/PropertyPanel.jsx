import React, { useState, useEffect } from 'react';
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Cross2Icon } from '@radix-ui/react-icons';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import { validateModelConfig, MODEL_CONFIGS, estimateCost } from '../utils/modelConfigUtils';
import { estimateTokenUsage } from '../services/openaiService';

const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'High-intelligence flagship model for complex, multi-step tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini', description: 'Affordable and intelligent small model for fast, lightweight tasks' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'The latest GPT-4 Turbo model with vision capabilities' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Powerful model for complex tasks, 8k context window' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast, inexpensive model for many tasks' },
  { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16k', description: 'GPT-3.5 Turbo with extended 16k token context' },
];

const PropertyPanel = ({ node, onChange, onClose, apiKeys = [] }) => {
  const [localNode, setLocalNode] = useState(node);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    setLocalNode(node);
  }, [node]);

  const handleChange = (key, value) => {
    const updatedNode = {
      ...localNode,
      data: {
        ...localNode.data,
        [key]: value
      }
    };
    setLocalNode(updatedNode);
    
    // If this is an AI agent, regenerate instructions when relevant settings change
    if (localNode.type === 'aiAgent' && 
        ['personality', 'role', 'expertise'].some(k => k === key)) {
      const config = generateAgentConfiguration(updatedNode.data);
      updatedNode.data.systemPrompt = config.systemPrompt;
      updatedNode.data.modelSettings = config.modelSettings;
    }
    
    onChange(localNode.id, { [key]: value });
  };

// Update this section in PropertyPanel.jsx

const renderInstructions = () => {
  if (!localNode.data) return null;

  const config = generateAgentConfiguration({
    personality: localNode.data.personality || {},
    role: localNode.data.role || {},
    expertise: localNode.data.expertise || {}
  });

  // Default to gpt-3.5-turbo if no model is selected
  const currentModel = localNode.data.model || 'gpt-3.5-turbo';
  
  // Get validated configuration with safe defaults
  const modelConfig = validateModelConfig(
    currentModel,
    config.modelSettings?.temperature,
    localNode.data.maxTokens
  );

  const messages = [
    { role: 'system', content: config.systemPrompt },
    { role: 'user', content: 'Sample message for token estimation' }
  ];

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
          <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700 max-h-96 overflow-y-auto">
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
                <span>{config.modelSettings.presencePenalty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frequency Penalty:</span>
                <span>{config.modelSettings.frequencyPenalty.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Only show cost estimation if we have a valid system prompt */}
      {config.systemPrompt && (
        <div className="text-sm text-gray-500">
          Estimated cost per interaction: ${estimateCost(
            modelConfig.model,
            estimateTokenUsage(messages)
          )?.toFixed(4) || '0.0000'}
        </div>
      )}
    </div>
  );
};

  if (!localNode) return null;

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
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={localNode.data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="mt-1"
          />
        </div>
        
        {localNode.type === 'aiAgent' && (
          <>
            <div>
              <Label htmlFor="apiKeyId">API Key</Label>
              <Select
                id="apiKeyId"
                value={localNode.data.apiKeyId || ''}
                onChange={(e) => handleChange('apiKeyId', e.target.value)}
                className="mt-1"
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
              <Label htmlFor="model">Model</Label>
              <Select
                id="model"
                value={localNode.data.model || ''}
                onChange={(e) => handleChange('model', e.target.value)}
                className="mt-1"
              >
                <option value="">Select Model</option>
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

            {/* Display System Instructions and Model Settings */}
            {renderInstructions()}
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
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="instructions">Instructions</Label>
              <textarea
                id="instructions"
                value={localNode.data.instructions || ''}
                onChange={(e) => handleChange('instructions', e.target.value)}
                className="w-full p-2 border rounded mt-1"
                rows={4}
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

        {/* Display execution status if available */}
        {localNode.data.lastOutput && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <Label>Last Output</Label>
              <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                {localNode.data.lastOutput}
              </div>
            </CardContent>
          </Card>
        )}

        {localNode.data.error && (
          <Card className="mt-4 border-red-200">
            <CardContent className="pt-4">
              <Label className="text-red-600">Error</Label>
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                {localNode.data.error}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;