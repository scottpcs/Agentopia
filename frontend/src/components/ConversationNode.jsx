import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { 
  Settings2, 
  MessageCircle, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Bot,
  User,
  Loader,
  AlertCircle,
  X,
  Plus,
  Grip
} from 'lucide-react';
import PropertyPanel from './PropertyPanel';

// Helper function to handle role display
const getRoleDisplay = (role) => {
  if (!role) return 'No role defined';
  if (typeof role === 'string') return role;
  if (typeof role === 'object') {
    if (role.type === 'custom' && role.customRole) {
      return role.customRole;
    }
    return role.type || 'Custom Role';
  }
  return 'Unknown Role';
};

const ConversationNode = ({ id, data, isConnectable }) => {
  // React Flow instance and refs
  const reactFlowInstance = useReactFlow();
  const nodeRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  // State declarations
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantMenu, setShowParticipantMenu] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showParticipantConfig, setShowParticipantConfig] = useState(false);
  const [error, setError] = useState(null);
  const [draggedNodeType, setDraggedNodeType] = useState(null);
  const [dragSourceType, setDragSourceType] = useState(null);

  // Memoized values
  const participants = useMemo(() => data?.agents || [], [data?.agents]);
  const conversationMode = useMemo(() => data?.mode || 'free-form', [data?.mode]);
  const allowHumanParticipation = useMemo(() => data?.allowHumanParticipation !== false, [data?.allowHumanParticipation]);
  const turnManagement = useMemo(() => data?.turnManagement || 'dynamic', [data?.turnManagement]);
  const contextHandling = useMemo(() => data?.contextHandling || 'cumulative', [data?.contextHandling]);

  // Add a participant to the conversation
  const handleAddParticipant = useCallback((agent) => {
    if (data?.onChange && !participants.some(p => p.id === agent.id)) {
      const availableApiKeys = data.apiKeys || [];
      const defaultApiKey = availableApiKeys.length > 0 ? availableApiKeys[0].name : null;

      const agentWithDefaults = {
        ...agent,
        id: `${agent.id || 'agent'}-${Date.now()}`,
        apiKeyId: agent.apiKeyId || data.apiKeyId || defaultApiKey,
        modelConfig: agent.modelConfig || {
          model: 'gpt-4o',
          provider: 'openai',
          parameters: {
            temperature: 0.7,
            maxTokens: 2048
          }
        },
        type: agent.type || 'ai',
        name: agent.name || 'New Agent',
        instructions: agent.instructions || 'You are a helpful assistant.'
      };

      console.log('Adding participant with config:', {
        id: agentWithDefaults.id,
        name: agentWithDefaults.name,
        apiKeyId: agentWithDefaults.apiKeyId,
        model: agentWithDefaults.modelConfig.model
      });

      if (!agentWithDefaults.apiKeyId) {
        console.warn('No API key configured for agent:', agentWithDefaults.name);
      }

      const newAgents = [...participants, agentWithDefaults];
      data.onChange(id, { agents: newAgents });
    }
  }, [data, id, participants]);

  // Remove a participant from the conversation
  const handleRemoveParticipant = useCallback((event, agentId) => {
    event.stopPropagation();
    if (data?.onChange) {
      const updatedParticipants = participants.filter(p => p.id !== agentId);
      data.onChange(id, { agents: updatedParticipants });

      if (selectedParticipant?.id === agentId) {
        setSelectedParticipant(null);
        setShowParticipantConfig(false);
      }
    }
  }, [data, participants, selectedParticipant]);

  // Update participant configuration
  const handleParticipantChange = useCallback((participantId, changes) => {
    if (data?.onChange) {
      const updatedParticipants = participants.map(p => {
        if (p.id === participantId) {
          return {
            ...p,
            ...changes,
            apiKeyId: changes.apiKeyId || p.apiKeyId || data.apiKeyId,
            modelConfig: {
              ...p.modelConfig,
              ...changes.modelConfig
            }
          };
        }
        return p;
      });

      data.onChange(id, { agents: updatedParticipants });
    }
  }, [data?.onChange, id, participants, data.apiKeyId]);

  // Message handling
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isProcessing) return;

    const configuredAgents = participants.filter(agent => 
      agent.type === 'ai' ? (agent.apiKeyId && agent.modelConfig?.model) : true
    );

    if (configuredAgents.length === 0) {
      setError('No properly configured agents. Please configure API keys and models for the AI agents.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Add user message
      const userMessage = {
        id: Date.now(),
        content: inputMessage.trim(),
        sender: 'User',
        role: 'user',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');

      // Process with active agents based on conversation mode
      const aiAgents = configuredAgents.filter(agent => agent.type === 'ai');

      switch (conversationMode) {
        case 'round-robin':
          for (const agent of aiAgents) {
            await processAgentResponse(agent, [...messages, userMessage]);
          }
          break;

        case 'moderated':
          if (aiAgents.length > 0) {
            const moderator = aiAgents[0];
            const decision = await processModeratorDecision(moderator, [...messages, userMessage]);
            for (const agentId of decision) {
              const agent = aiAgents.find(a => a.id === agentId);
              if (agent) {
                await processAgentResponse(agent, [...messages, userMessage]);
              }
            }
          }
          break;

        case 'free-form':
        default:
          await Promise.all(aiAgents.map(agent => 
            processAgentResponse(agent, [...messages, userMessage])
          ));
          break;
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  }, [inputMessage, isProcessing, messages, participants, conversationMode]);

  // Process agent responses
  const processAgentResponse = async (agent, messageHistory) => {
    try {
      if (!agent.apiKeyId) {
        throw new Error(`No API key configured for agent: ${agent.name}`);
      }

      const response = await fetch('http://localhost:3000/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyId: agent.apiKeyId,
          model: agent.modelConfig?.model || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: generateAgentInstructions(agent)
            },
            ...messageHistory.map(m => ({
              role: m.role,
              content: m.content
            }))
          ],
          temperature: agent.modelConfig?.parameters?.temperature || 0.7,
          maxTokens: agent.modelConfig?.parameters?.maxTokens || 2048
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to get agent response');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      const agentMessage = {
        id: Date.now(),
        content,
        sender: agent.name,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, agentMessage]);
      return content;
    } catch (error) {
      console.error(`Error processing agent ${agent.name}:`, error);
      setError(`Error with agent ${agent.name}: ${error.message}`);
      throw error;
    }
  };

  // Generate instructions for agents
  const generateAgentInstructions = useCallback((agent) => {
    const baseInstructions = agent.instructions || 'You are a helpful assistant.';
    const roleContext = `You are acting as ${getRoleDisplay(agent.role)}.`;
    const conversationContext = `You are participating in a ${conversationMode} conversation with multiple agents.`;
    
    return `${baseInstructions}\n\n${roleContext}\n\n${conversationContext}`;
  }, [conversationMode]);

  // Handle key press events
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Process moderator decisions
  const processModeratorDecision = async (moderator, messageHistory) => {
    try {
      const response = await fetch('http://localhost:3000/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeyId: moderator.apiKeyId,
          model: moderator.modelConfig?.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a conversation moderator. Review the context and decide which agents should respond.
              Available agents: ${participants.map(a => `${a.id} (${getRoleDisplay(a.role)})`).join(', ')}.
              Respond with a JSON array of agent IDs that should participate.`
            },
            ...messageHistory.map(m => ({
              role: m.role,
              content: m.content
            }))
          ],
          temperature: 0.3,
          maxTokens: 100
        }),
      });

      if (!response.ok) throw new Error('Failed to get moderator decision');
      
      const data = await response.json();
      try {
        return JSON.parse(data.choices[0].message.content);
      } catch {
        return [];
      }
    } catch (error) {
      console.error('Error in moderator decision:', error);
      return [];
    }
  };

  // Handle drag and drop functionality
  const handleDropZoneDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    let isValidDrag = false;

    if (isDraggingNode && draggedNodeType) {
      isValidDrag = true;
    } else {
      try {
        const dragData = event.dataTransfer.getData('application/reactflow');
        if (dragData) {
          const parsedData = JSON.parse(dragData);
          isValidDrag = parsedData.type === 'aiAgent' || parsedData.type === 'humanAgent';
        }
      } catch (error) {
        console.log('Not a valid sidebar drag');
      }
    }

    if (isValidDrag) {
      setIsDropZoneActive(true);
      event.dataTransfer.dropEffect = 'move';
    }
  }, [isDraggingNode, draggedNodeType]);

  const handleDropZoneDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDropZoneActive(false);
  }, []);

  const handleDropZoneDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      let droppedData;
      let sourceNodeId;

      if (isDraggingNode && draggedNodeType) {
        const draggedNode = reactFlowInstance.getNodes().find(n => n.selected);
        if (draggedNode) {
          droppedData = {
            type: draggedNode.type,
            data: draggedNode.data,
            id: draggedNode.id
          };
          sourceNodeId = draggedNode.id;
        }
      } else {
        const dragData = event.dataTransfer.getData('application/reactflow');
        if (dragData) {
          droppedData = JSON.parse(dragData);
        }
      }

      if (droppedData && (droppedData.type === 'aiAgent' || droppedData.type === 'humanAgent')) {
        if (sourceNodeId) {
          reactFlowInstance.deleteElements({ nodes: [{ id: sourceNodeId }] });
        }

        const agentConfig = {
          ...droppedData.data,
          id: `${droppedData.type}-${Date.now()}`,
          type: droppedData.type === 'aiAgent' ? 'ai' : 'human'
        };

        console.log('Adding agent to conversation:', agentConfig);
        handleAddParticipant(agentConfig);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    } finally {
      setIsDropZoneActive(false);
      setIsDraggingNode(false);
      setDraggedNodeType(null);
      setDragSourceType(null);
    }
  }, [isDraggingNode, draggedNodeType, reactFlowInstance, handleAddParticipant]);

  // Render functions
  const DropZone = useCallback(() => (
    <div
      ref={dropZoneRef}
      className={`drop-zone ${isDropZoneActive ? 'active-drop-target' : ''} ${
        isDraggingNode ? 'node-drag-active' : ''
      }`}
      onDragOver={handleDropZoneDragOver}
      onDragLeave={handleDropZoneDragLeave}
      onDrop={handleDropZoneDrop}
      data-nodetype="dropzone"
    >
      <div className="text-sm text-gray-500 text-center">
        {isDropZoneActive ? (
          <span className="text-blue-500 font-medium">Drop agent here</span>
        ) : (
          <span>Drag agents here from canvas or sidebar</span>
        )}
      </div>
    </div>
  ), [isDropZoneActive, isDraggingNode, handleDropZoneDragOver, handleDropZoneDragLeave, handleDropZoneDrop]);

  // Message rendering
  const renderMessage = useCallback((message) => {
    const getMessageStyle = () => {
      switch (message.role) {
        case 'user':
          return 'bg-blue-50 border-blue-200';
        case 'assistant':
          return 'bg-green-50 border-green-200';
        case 'system':
          return 'bg-gray-50 border-gray-200';
        default:
          return 'bg-white border-gray-200';
      }
    };

    return (
      <div
        key={message.id}
        className={`p-3 rounded-lg border mb-2 ${getMessageStyle()}`}
      >
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            {message.role === 'assistant' ? (
              <Bot className="w-4 h-4 text-green-500" />
            ) : message.role === 'user' ? (
              <User className="w-4 h-4 text-blue-500" />
            ) : (
              <MessageCircle className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-sm font-medium">{message.sender}</span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      </div>
    );
  }, []);

  // Participant list rendering
  const renderParticipantList = useCallback(() => {
    return participants.map((agent) => (
      <div
        key={agent.id}
        className="flex items-center justify-between bg-gray-50 p-2 rounded-md mb-2 cursor-move agent-item"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Grip className="w-4 h-4 text-gray-400" />
          {agent.type === 'ai' ? (
            <Bot className="w-4 h-4 text-blue-500" />
          ) : (
            <User className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium">{agent.name}</span>
          <span className="text-xs text-gray-500">
            ({getRoleDisplay(agent.role)})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedParticipant(agent);
              setShowParticipantConfig(true);
            }}
            title="Configure Agent"
          >
            <Settings2 className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleRemoveParticipant(e, agent.id)}
            title="Remove Agent"
            className="hover:bg-red-100 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    ));
  }, [participants, handleRemoveParticipant]);

  // Main render
  return (
    <>
      <div 
        ref={nodeRef}
        className={`conversation-node bg-white border-2 ${
          isDropZoneActive ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
        } rounded-lg shadow-lg w-96 relative ${
          isDraggingNode ? 'node-drag-active' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          zIndex: isDropZoneActive ? 1000 : 1, 
          transition: 'all 0.2s ease-in-out',
          transform: isDropZoneActive ? 'scale(1.02)' : 'scale(1)'
        }}
      >
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
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold">
                {data?.label || 'Multi-Agent Conversation'}
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
          {showSettings && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Conversation Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Conversation Mode</Label>
                    <Select
                      value={conversationMode}
                      onChange={(e) => data?.onChange?.(id, { mode: e.target.value })}
                      className="mt-1"
                    >
                      <option value="free-form">Free-form</option>
                      <option value="round-robin">Round Robin</option>
                      <option value="moderated">Moderated</option>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      id="allowHuman"
                      checked={allowHumanParticipation}
                      onChange={(e) => data?.onChange?.(id, { 
                        allowHumanParticipation: e.target.checked 
                      })}
                    />
                    <Label htmlFor="allowHuman">Allow Human Participation</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label className="font-medium">Participants</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipantMenu(!showParticipantMenu)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Participant
              </Button>
            </div>

            <div className="space-y-2">
              {renderParticipantList()}
            </div>

            <DropZone />

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

          {/* Message Area */}
          {expanded && (
            <>
              <div className="border rounded-lg mb-4">
                <div className="max-h-60 overflow-y-auto p-3">
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isProcessing}
                  className="flex-grow"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !inputMessage.trim()}
                >
                  {isProcessing ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: '#555' }}
          isConnectable={isConnectable}
        />
      </div>

      {/* Property Panel for participant configuration */}
      {showParticipantConfig && selectedParticipant && (
        <PropertyPanel
          node={{
            id: selectedParticipant.id,
            type: selectedParticipant.type === 'ai' ? 'aiAgent' : 'humanAgent',
            data: {
              ...selectedParticipant,
              onChange: (id, changes) => handleParticipantChange(id, changes)
            }
          }}
          onChange={(_, changes) => handleParticipantChange(selectedParticipant.id, changes)}
          onClose={() => {
            setShowParticipantConfig(false);
            setSelectedParticipant(null);
          }}
          apiKeys={data?.apiKeys}
        />
      )}
    </>
  );
};

export default ConversationNode;