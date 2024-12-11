import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Handle, Position } from 'reactflow';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, AlertCircle, Settings2, ChevronDown, ChevronUp, Grip } from 'lucide-react';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import { callOpenAI } from '../services/openaiService';

const DistillNode = ({ id, data, isConnectable }) => {
  // State declarations
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastDistillation, setLastDistillation] = useState(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const dropZoneRef = useRef(null);

  // Memoized values
  const agent = useMemo(() => data?.agent, [data?.agent]);
  const extractionFields = useMemo(() => data?.extractionFields || [], [data?.extractionFields]);

  // Process input through the AI agent
  const processDistillation = useCallback(async (input) => {
    console.log('Processing distillation:', {
      input,
      hasAgent: !!agent,
      agentConfig: agent,
      fields: extractionFields
    });

    if (!agent?.apiKeyId) {
      throw new Error('No API key configured for distillation agent');
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Generate base configuration
      const baseConfig = generateAgentConfiguration({
        personality: agent.personality || {},
        role: agent.role || {},
        expertise: agent.expertise || {}
      });

      // Create field requirements string
      const fieldRequirements = extractionFields
        .map(field => `${field.label}${field.required ? ' (Required)' : ' (Optional)'}`)
        .join('\n- ');

      // Add distillation-specific instructions
      const distillationContext = `
        ${baseConfig.systemPrompt}
        
        Your task is to extract and structure key information from the input provided.
        Extract information for the following fields:
        - ${fieldRequirements}

        Provide your response in this format:
        {
          "fields": {
            // One entry per field, matching the exact field IDs provided
          },
          "confidence": {
            // Confidence score (0-1) for each field
          },
          "missing_required": [
            // List of any required fields that couldn't be found
          ],
          "summary": "Brief summary of extracted information"
        }

        Important:
        - Structure fields appropriately (arrays for lists, objects for complex data)
        - Assign confidence scores based on information clarity and completeness
        - Always include all specified fields in the response
        - Provide "null" for fields where no information could be found
      `;

      const response = await callOpenAI(
        agent.apiKeyId,
        agent.modelConfig?.model || 'gpt-4o',
        [
          { role: 'system', content: distillationContext },
          { role: 'user', content: input }
        ],
        agent.modelConfig?.parameters?.temperature || 0.3,
        agent.modelConfig?.parameters?.maxTokens || 1000
      );

      console.log('Raw AI response:', response);

      let distillation;
      try {
        // Handle both string and object responses
        distillation = typeof response === 'string' ? JSON.parse(response) : response;
      } catch (error) {
        console.error('Failed to parse AI response:', error);
        throw new Error('Invalid response format from AI');
      }

      // Validate the response structure
      if (!distillation.fields || !distillation.confidence) {
        throw new Error('Invalid response structure from AI');
      }

      // Check for missing required fields
      const missingRequired = extractionFields
        .filter(field => field.required && !distillation.fields[field.id])
        .map(field => field.label);

      if (missingRequired.length > 0) {
        console.warn('Missing required fields:', missingRequired);
        distillation.missing_required = missingRequired;
      }

      setLastDistillation(distillation);
      
      // Update node data
      if (data?.onChange) {
        data.onChange(id, {
          lastInput: input,
          lastOutput: distillation.fields,  // Structured output
          lastSummary: distillation.summary,  // Human-readable summary
          lastDistillation: distillation,
          error: null
        });
      }

      return {
        structured: distillation.fields,
        summary: distillation.summary
      };

    } catch (error) {
      const errorMessage = `Distillation failed: ${error.message}`;
      console.error(errorMessage);
      setError(errorMessage);
      if (data?.onChange) {
        data.onChange(id, { error: errorMessage });
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [agent, extractionFields, data, id]);


// Effect to handle incoming data
useEffect(() => {
    if (data?.input && !isProcessing) {
      console.log('DistillNode received input:', {
        nodeId: id,
        input: data.input,
        hasAgent: !!agent,
        agentConfig: agent
      });
  
      // Start processing - this sets isProcessing to true
      processDistillation(data.input)
        .then(result => {
          // result should contain both structured data and summary from the API call
          console.log('Distillation result:', result);
          
          if (data?.onChange) {
            data.onChange(id, {
              lastInput: data.input,
              lastOutput: result.structured, // For the structured output handle
              summary: result.summary,       // For the summary output handle
              lastDistillation: result
            });
          }
        })
        .catch(error => {
          console.error('Distillation error:', error);
          setError(error.message);
        });
    }
  }, [data?.input, isProcessing, processDistillation, id, agent]);

  // Handle drag and drop for agent assignment
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const dragData = event.dataTransfer.getData('application/reactflow');
      if (dragData) {
        const parsedData = JSON.parse(dragData);
        if (parsedData.type === 'aiAgent') {
          setIsDropZoneActive(true);
          event.dataTransfer.dropEffect = 'move';
        }
      }
    } catch (error) {
      console.log('Not a valid drag');
    }
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropZoneActive(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropZoneActive(false);
  
    try {
      const dragData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      if (dragData.type === 'aiAgent') {
        if (data?.onChange) {
          const agentConfig = {
            ...dragData.data,
            id: `${dragData.type}-${Date.now()}`,
            apiKeyId: dragData.data.apiKeyId || dragData.data.modelConfig?.apiKeyId,
            modelConfig: {
              ...dragData.data.modelConfig,
              apiKeyId: dragData.data.apiKeyId || dragData.data.modelConfig?.apiKeyId
            }
          };
          console.log('Configuring distillation agent:', agentConfig);
          data.onChange(id, {
            ...data,
            agent: agentConfig
          });
        }
      }
    } catch (error) {
      console.error('Error handling agent drop:', error);
    }
  }, [data, id]);

  // Render the agent drop zone
  const renderAgentDropZone = () => (
    <div
      ref={dropZoneRef}
      className={`drop-zone ${isDropZoneActive ? 'active-drop-target' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-sm text-gray-500 text-center">
        {isDropZoneActive ? (
          <span className="text-blue-500 font-medium">Drop agent here</span>
        ) : (
          <span>Drag an AI agent here to process information extraction</span>
        )}
      </div>
    </div>
  );

  // Render results
  const renderResults = () => {
    if (!lastDistillation) return null;

    return (
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {Object.entries(lastDistillation.fields).map(([fieldId, value]) => {
              const fieldConfig = extractionFields.find(f => f.id === fieldId);
              if (!fieldConfig) return null;

              const confidence = lastDistillation.confidence[fieldId] || 0;
              const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';

              return (
                <div key={fieldId}>
                  <div className="flex justify-between items-center">
                    <Label>{fieldConfig.label}</Label>
                    <span className={`text-xs ${
                      confidenceLevel === 'high' ? 'text-green-500' :
                      confidenceLevel === 'medium' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {Math.round(confidence * 100)}% confident
                    </span>
                  </div>
                  <div className="mt-1 text-sm bg-gray-50 p-2 rounded">
                    {Array.isArray(value) ? (
                      <ul className="list-disc pl-4">
                        {value.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : typeof value === 'object' ? (
                      <pre className="whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : (
                      value?.toString() || 'No data extracted'
                    )}
                  </div>
                </div>
              );
            })}

            {lastDistillation.missing_required?.length > 0 && (
              <div className="text-amber-600 text-sm mt-2">
                Missing required fields: {lastDistillation.missing_required.join(', ')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="distill-node bg-white border-2 border-gray-200 rounded-lg shadow-lg w-64">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">
              {data?.label || 'Information Extraction'}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Agent Assignment Area */}
        <div className="mb-4">
          <Label>Extraction Agent</Label>
          {agent ? (
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md mt-1">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (data?.onChange) {
                    data.onChange(id, { ...data, agent: null });
                  }
                }}
                className="hover:bg-red-100 hover:text-red-500"
              >
                Remove
              </Button>
            </div>
          ) : (
            renderAgentDropZone()
          )}
        </div>

        {/* Results Display */}
        {expanded && renderResults()}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </div>

    {/* Output Handles */}
    <Handle
    type="source"
    position={Position.Bottom}
    id="structured"
    style={{
        background: '#555',
        left: '25%'
    }}
    isConnectable={isConnectable}
    />
    <Handle
    type="source"
    position={Position.Bottom}
    id="summary"
    style={{
        background: '#555',
        left: '75%'
    }}
    isConnectable={isConnectable}
    />

    {/* Handle Labels */}
    <div className="text-xs text-gray-500 absolute -bottom-6 left-[25%] transform -translate-x-1/2">
    Structured Data
    </div>
    <div className="text-xs text-gray-500 absolute -bottom-6 left-[75%] transform -translate-x-1/2">
    Summary
    </div>
    </div>
  );
};

export default DistillNode;