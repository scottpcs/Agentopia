import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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

  const renderContent = () => {
    switch (node.type) {
      case 'aiAgent':
        return (
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
            </div>
          </>
        );

        // Updates to the renderContent() method in PropertyPanel.jsx, textInput case:

        // Update to the renderContent() method in PropertyPanel.jsx, textInput case:

        case 'textInput': {
          const [localInputText, setLocalInputText] = React.useState(node.data?.inputText || '');

          React.useEffect(() => {
            if (node.data?.inputText !== undefined && node.data.inputText !== localInputText) {
              setLocalInputText(node.data.inputText);
            }
          }, [node.data?.inputText]);

          const updateNodeData = (newValue) => {
            // Use the same data structure as TextInputNode
            onChange(node.id, {
              ...node.data,
              inputText: newValue,
              text: newValue,
              value: newValue,
              lastOutput: newValue,
              input: newValue,
              output: newValue,
              contextInput: newValue,
              contextOutput: newValue
            });

            console.log('PropertyPanel text input updated:', {
              id: node.id,
              newValue,
              fullData: node.data
            });
          };

          const handleTextChange = (e) => {
            const newValue = e.target.value;
            setLocalInputText(newValue);
            updateNodeData(newValue);
          };

          return (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={node.data?.name || ''}
                  onChange={(e) => onChange(node.id, { 
                    ...node.data,
                    name: e.target.value 
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="propertyInputText">Input Text</Label>
                <textarea 
                  id="propertyInputText"
                  value={localInputText}
                  onChange={handleTextChange}
                  placeholder="Enter text..."
                  className="w-full p-2 border rounded mt-1 min-h-[100px]"
                />
              </div>
            </div>
          );
        }

      case 'textOutput':
        return (
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
        );

      default:
        return null;
    }
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
        {renderContent()}
      </div>

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

      {(node.type === 'aiAgent' || node.data?.type === 'ai') && renderInstructions()}
    </div>
  );
};

export default PropertyPanel;