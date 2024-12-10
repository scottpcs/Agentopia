import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, AlertCircle, Settings2, ChevronDown, ChevronUp, Grip } from 'lucide-react';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import { callOpenAI } from '../services/openaiService';

const DecisionNode = ({ id, data, isConnectable }) => {
  // State declarations
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastDecision, setLastDecision] = useState(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const dropZoneRef = useRef(null);

  // Local state for output paths and decision instruction
  const [decisionInstruction, setDecisionInstruction] = useState(
    data?.decisionInstruction || 'Make a decision based on the input provided.'
  );
  const [outputLabels, setOutputLabels] = useState({
    output1: data?.outputs?.output1 || 'Yes',
    output2: data?.outputs?.output2 || 'No'
  });

  // Memoized values
  const agent = useMemo(() => data?.agent, [data?.agent]);

  // Process input through the decision agent
  const processDecision = useCallback(async (input) => {
    console.log('Processing decision:', {
      input,
      hasAgent: !!agent,
      agentConfig: agent,
      apiKeyId: agent?.apiKeyId,
      model: agent?.modelConfig?.model
    });

    if (!agent?.apiKeyId) {
      throw new Error('No API key configured for decision agent');
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

      // Add decision-specific instructions
      const decisionContext = `
        ${baseConfig.systemPrompt}
        
        Your specific task is to: ${decisionInstruction}
        
        Provide your response in this format:
        {
          "decision": "${outputLabels.output1}" or "${outputLabels.output2}",
          "explanation": "Brief explanation of your decision",
          "output": "The content to pass to the next node"
        }
      `;

      const response = await callOpenAI(
        agent.apiKeyId,
        agent.modelConfig?.model || 'gpt-4o',
        [
          { role: 'system', content: decisionContext },
          { role: 'user', content: input }
        ],
        agent.modelConfig?.parameters?.temperature || 0.3,
        agent.modelConfig?.parameters?.maxTokens || 1000
      );

      let decision;
      try {
        decision = JSON.parse(response);
      } catch (error) {
        throw new Error('Failed to parse decision response');
      }

      // Validate decision output
      if (!decision.decision || !Object.values(outputLabels).includes(decision.decision)) {
        throw new Error(`Invalid decision output: ${decision.decision}`);
      }

      setLastDecision(decision);
      
      // Update node data with decision
      if (data?.onChange) {
        data.onChange(id, {
          lastInput: input,
          lastOutput: decision.output,
          lastDecision: decision,
          error: null
        });
      }

      return decision;

    } catch (error) {
      const errorMessage = `Decision processing failed: ${error.message}`;
      setError(errorMessage);
      if (data?.onChange) {
        data.onChange(id, { error: errorMessage });
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [agent, decisionInstruction, outputLabels, data, id]);

  // Effect to handle incoming data
  useEffect(() => {
    if (data?.input && !isProcessing) {
      console.log('DecisionNode received input:', {
        nodeId: id,
        input: data.input,
        hasAgent: !!agent,
        agentConfig: agent
      });
      processDecision(data.input).catch(console.error);
    }
  }, [data?.input, isProcessing, processDecision, id, agent]);

  // Update parent data when settings change
  useEffect(() => {
    if (data?.onChange) {
      data.onChange(id, {
        ...data,
        decisionInstruction,
        outputs: outputLabels
      });
    }
  }, [decisionInstruction, outputLabels, id, data]);

  // In DecisionNode.jsx, add a validation effect:
  useEffect(() => {
    if (agent && !agent.apiKeyId) {
      console.warn('Agent missing API key:', agent);
      setError('Agent is missing API key configuration');
    } else {
      setError(null);
    }
  }, [agent]);

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
      console.log('Agent drop data:', dragData); // Add this log
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
          console.log('Configuring decision agent:', agentConfig); // Add this log
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

  // Render the agent drop zone when no agent is assigned
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
          <span>Drag an AI agent here to make decisions</span>
        )}
      </div>
    </div>
  );

  // Settings panel with instructions and output configuration
  const renderSettings = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Decision Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Decision Instructions</Label>
            <textarea
              value={decisionInstruction}
              onChange={(e) => setDecisionInstruction(e.target.value)}
              className="w-full mt-1 p-2 text-sm border rounded-md min-h-[100px]"
              placeholder="Describe what decision needs to be made..."
            />
          </div>

          <div>
            <Label>Output Labels</Label>
            <div className="space-y-2 mt-2">
              <div>
                <Label>First Output</Label>
                <Input
                  value={outputLabels.output1}
                  onChange={(e) => setOutputLabels(prev => ({
                    ...prev,
                    output1: e.target.value
                  }))}
                  placeholder="e.g., Yes, Approve, Continue..."
                />
              </div>
              <div>
                <Label>Second Output</Label>
                <Input
                  value={outputLabels.output2}
                  onChange={(e) => setOutputLabels(prev => ({
                    ...prev,
                    output2: e.target.value
                  }))}
                  placeholder="e.g., No, Reject, Stop..."
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="decision-node bg-white border-2 border-gray-200 rounded-lg shadow-lg w-64">
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
              {data?.label || 'Decision Node'}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
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

        {/* Settings Panel */}
        {showSettings && renderSettings()}

        {/* Agent Assignment Area */}
        <div className="mb-4">
          <Label>Decision Agent</Label>
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

        {/* Last Decision Display */}
        {expanded && lastDecision && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label>Last Decision:</Label>
                  <div className="font-medium text-blue-600">
                    {lastDecision.decision}
                  </div>
                </div>
                <div>
                  <Label>Explanation:</Label>
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    {lastDecision.explanation}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
        id="output1"
        style={{
          background: '#555',
          left: '25%'
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output2"
        style={{
          background: '#555',
          left: '75%'
        }}
        isConnectable={isConnectable}
      />

      {/* Handle Labels */}
      <div className="text-xs text-gray-500 absolute -bottom-6 left-[25%] transform -translate-x-1/2">
        {outputLabels.output1}
      </div>
      <div className="text-xs text-gray-500 absolute -bottom-6 left-[75%] transform -translate-x-1/2">
        {outputLabels.output2}
      </div>
    </div>
  );
};

export default DecisionNode;