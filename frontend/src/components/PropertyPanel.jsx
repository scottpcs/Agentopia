import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Cross2Icon } from '@radix-ui/react-icons';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import { validateModelConfig, MODEL_CONFIGS } from '../utils/modelConfigUtils';
import { estimateTokenUsage } from '../services/openaiService';
import { Clock, X } from 'lucide-react';
import { TIMING_MODES } from "./TimingNode";

const MODEL_OPTIONS = [
  { 
    value: 'gpt-4o-mini', 
    label: 'GPT-4o Mini', 
    description: 'Cost-effective model for most tasks ($0.15/1M tokens)' 
  },
  { 
    value: 'o3-mini', 
    label: 'O3 Mini', 
    description: 'Advanced model with improved capabilities ($1.10/1M tokens)' 
  },
  { 
    value: 'o1-mini', 
    label: 'O1 Mini', 
    description: 'Powerful model for specialized tasks ($1.10/1M tokens)' 
  },
  { 
    value: 'gpt-4o', 
    label: 'GPT-4o', 
    description: 'High-intelligence flagship model for complex tasks ($2.50/1M tokens)' 
  }
];

const PropertyPanel = ({ node, onChange, onClose, apiKeys = [] }) => {
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(node.data?.apiKeyId || '');

  // Add new state for timing node properties
    const [durationValue, setDurationValue] = useState(() => {
      if (node.type === 'timing') {
        const duration = node.data?.config?.duration || 60000;
        const mode = node.data?.config?.mode || 'delay';
        return Math.floor(duration / (mode === 'watchdog' ? 60000 : 1000));
      }
      return 0;
    });
  
    const [durationUnit, setDurationUnit] = useState(() => {
      if (node.type === 'timing') {
        const mode = node.data?.config?.mode || 'delay';
        return mode === 'watchdog' ? 60000 : 1000;
      }
      return 1000;
    });
  
    // Then modify the renderTimingNodeProperties function to use the state from above
    const renderTimingNodeProperties = () => {
      const {
        mode = 'delay',
        duration = 60000,
        resetOnActivity = false,
        cancelOnTimeout = false,
        conditions = []
      } = node.data?.config || {};
  
      const durationUnits = [
        { value: 1000, label: 'Seconds' },
        { value: 60000, label: 'Minutes' },
        { value: 3600000, label: 'Hours' },
        { value: 86400000, label: 'Days' }
      ];
  
      const updateConfig = (updates) => {
        onChange(node.id, {
          config: {
            ...node.data.config,
            ...updates
          }
        });
      };
  
      return (
        <div className="space-y-6">
          <div>
            <Label>Timing Mode</Label>
            <select
              value={mode}
              onChange={(e) => updateConfig({ mode: e.target.value })}
              className="w-full mt-1 p-2 border rounded-md"
            >
              {Object.entries(TIMING_MODES).map(([value, { label, description }]) => (
                <option key={value} value={value} title={description}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {TIMING_MODES[mode].description}
            </p>
          </div>
  
          <div>
            <Label>Duration</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={durationValue}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  setDurationValue(newValue);
                  updateConfig({ duration: newValue * durationUnit });
                }}
                className="w-1/2"
              />
              <select
                value={durationUnit}
                onChange={(e) => {
                  const newUnit = parseInt(e.target.value);
                  setDurationUnit(newUnit);
                  updateConfig({ duration: durationValue * newUnit });
                }}
                className="w-1/2 p-2 border rounded-md"
              >
                {durationUnits.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
  
          {/* Rest of the timing node properties remain the same */}
          {mode === 'watchdog' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="resetOnActivity"
                checked={resetOnActivity}
                onChange={(e) => updateConfig({ resetOnActivity: e.target.checked })}
              />
              <Label htmlFor="resetOnActivity">Reset timer on activity</Label>
            </div>
          )}
  
          {mode === 'coordination' && (
            <div>
              <Label>Required Conditions</Label>
              <div className="space-y-2 mt-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={condition}
                      onChange={(e) => {
                        const newConditions = [...conditions];
                        newConditions[index] = e.target.value;
                        updateConfig({ conditions: newConditions });
                      }}
                      placeholder={`Condition ${index + 1}`}
                      className="flex-grow"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newConditions = conditions.filter((_, i) => i !== index);
                        updateConfig({ conditions: newConditions });
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateConfig({ conditions: [...conditions, ''] });
                  }}
                >
                  Add Condition
                </Button>
              </div>
            </div>
          )}
  
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cancelOnTimeout"
              checked={cancelOnTimeout}
              onChange={(e) => updateConfig({ cancelOnTimeout: e.target.checked })}
            />
            <Label htmlFor="cancelOnTimeout">Cancel on timeout</Label>
          </div>
          {/* Status Display Section */}
          {node.data?.status && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium">Current Status: {node.data.status}</div>
              {node.data.startTime && (
                <div className="text-sm text-gray-500">
                  Started: {new Date(node.data.startTime).toLocaleString()}
                </div>
              )}
              {node.data.lastOutput && (
                <div className="text-sm text-gray-500">
                  Last Output: 
                  {typeof node.data.lastOutput === 'object' ? (
                    <div className="mt-1">
                      <div>Type: {node.data.lastOutput.type}</div>
                      <div>Time: {new Date(node.data.lastOutput.timestamp).toLocaleString()}</div>
                    </div>
                  ) : (
                    node.data.lastOutput
                  )}
                </div>
              )}
              {Array.isArray(node.data.conditionsMet) && (
                <div className="text-sm text-gray-500">
                  Conditions met: {node.data.conditionsMet.length}/{conditions.length}
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

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
      case 'timing':
        return renderTimingNodeProperties(node, onChange);

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

        case 'distill':
          return (
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Node Name</Label>
                <Input
                  id="name"
                  value={node.data?.label || ''}
                  onChange={(e) => onChange(node.id, { 
                    ...node.data,
                    label: e.target.value 
                  })}
                  className="mt-1"
                />
              </div>
        
              <div>
              <Label className="flex justify-between">
          Extraction Fields
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newFields = [
                ...(node.data?.extractionFields || []),
                {
                  id: `field_${Date.now()}`,
                  label: 'New Field',
                  required: false
                }
              ];
              onChange(node.id, { 
                ...node.data,
                extractionFields: newFields
              });
            }}
          >
            Add Field
          </Button>
        </Label>
        
        <div className="space-y-2 mt-2">
          {(node.data?.extractionFields || []).map((field, index) => (
            <Card key={field.id} className="p-3">
              <div className="space-y-2">
                <div>
                  <Label>Field Label</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => {
                      const newFields = [...(node.data?.extractionFields || [])];
                      newFields[index] = {
                        ...newFields[index],
                        label: e.target.value
                      };
                      onChange(node.id, { 
                        ...node.data,
                        extractionFields: newFields
                      });
                    }}
                    placeholder="Enter field label"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`required-${field.id}`}
                    checked={field.required}
                    onChange={(e) => {
                      const newFields = [...(node.data?.extractionFields || [])];
                      newFields[index] = {
                        ...newFields[index],
                        required: e.target.checked
                      };
                      onChange(node.id, { 
                        ...node.data,
                        extractionFields: newFields
                      });
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor={`required-${field.id}`}>Required Field</Label>
                  
                  <div className="flex-grow"></div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const newFields = (node.data?.extractionFields || [])
                        .filter((_, i) => i !== index);
                      onChange(node.id, { 
                        ...node.data,
                        extractionFields: newFields
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {node.data?.lastDistillation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last Extraction Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm bg-gray-50 p-2 rounded">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(node.data.lastDistillation.fields, null, 2)}
              </pre>
            </div>
            {node.data.lastDistillation.missing_required?.length > 0 && (
              <div className="mt-2 text-amber-600 text-sm">
                Missing required fields: {node.data.lastDistillation.missing_required.join(', ')}
              </div>
            )}
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
              {typeof node.data.lastOutput === 'object' ? (
                <>
                  <div>Type: {node.data.lastOutput.type}</div>
                  <div>Time: {new Date(node.data.lastOutput.timestamp).toLocaleString()}</div>
                </>
              ) : (
                node.data.lastOutput
              )}
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