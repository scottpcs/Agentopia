import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
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

// Format conversation output for text output node
const formatConversationOutput = (messages) => {
  if (!Array.isArray(messages)) return '';
  
  return messages
    .map(message => {
      // Ensure we're working with string content
      const content = typeof message.content === 'object' ? 
        message.content.content || JSON.stringify(message.content) : 
        message.content;

      const prefix = message.senderName ? 
        (message.role ? `${message.senderName} (${message.role}): ` : `${message.senderName}: `) :
        '';
      
      return `${prefix}${content}`;
    })
    .join('\n\n');
};

// Helper function to get role display text
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

// Message component for rendering individual messages
const Message = ({ message, participants }) => {
  const participant = participants.find(p => p.id === message.senderId);
  const isAI = participant?.type === 'ai';

  // Extract message content
  const content = typeof message.content === 'object' 
    ? message.content.content || JSON.stringify(message.content)
    : message.content;

  return (
    <div className={`mb-2 p-2 rounded-lg ${
      isAI ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {isAI ? <Bot className="w-4 h-4 text-blue-500" /> : 
                <User className="w-4 h-4 text-gray-500" />}
        <span className="font-medium text-sm">
          {participant?.name || message.senderName || 'Unknown'} 
          {(participant?.role || message.role) && (
            <span className="text-gray-500 ml-1">
              ({participant?.role?.type || message.role || 'No role'})
            </span>
          )}
        </span>
        <span className="text-xs text-gray-500 ml-auto">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="text-sm whitespace-pre-wrap">{content}</div>
    </div>
  );
};

const ConversationNode = ({ id, data, isConnectable }) => {
  // State declarations
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantMenu, setShowParticipantMenu] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showParticipantConfig, setShowParticipantConfig] = useState(false);
  const [error, setError] = useState(null);
  const [draggedNodeType, setDraggedNodeType] = useState(null);
  const [dragSourceType, setDragSourceType] = useState(null);

  // Refs
  const nodeRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Memoized values
  const participants = useMemo(() => data?.agents || [], [data?.agents]);
  const conversationMode = useMemo(() => data?.mode || 'free-form', [data?.mode]);
  const allowHumanParticipation = useMemo(() => data?.allowHumanParticipation !== false, [data?.allowHumanParticipation]);
  const turnManagement = useMemo(() => data?.turnManagement || 'dynamic', [data?.turnManagement]);
  const contextHandling = useMemo(() => data?.contextHandling || 'cumulative', [data?.contextHandling]);
  const messages = useMemo(() => data?.messages || [], [data?.messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Message handling
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
  
    const updatedMessages = [...messages];
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      senderId: 'user',
      senderName: 'User',
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    updatedMessages.push(userMessage);
  
    // Update state with new message
    if (data?.onChange) {
      data.onChange(id, { 
        messages: updatedMessages,
        output: formatConversationOutput(updatedMessages)
      });
    }
  
    setInputMessage('');
    setIsProcessing(true);
  
    try {
      // Get AI participants
      const aiParticipants = participants.filter(p => p.type === 'ai');
  
      if (conversationMode === 'round-robin') {
        for (const participant of aiParticipants) {
          const response = await data.onSend?.(id, inputMessage, participant);
          
          if (response) {
            const aiMessage = {
              id: Date.now(),
              senderId: participant.id,
              senderName: participant.name,
              role: participant.role?.type || 'assistant',
              content: response,
              timestamp: new Date().toISOString()
            };
  
            updatedMessages.push(aiMessage);
            
            // Update state with new message
            data.onChange?.(id, { 
              messages: [...updatedMessages],
              output: formatConversationOutput(updatedMessages)
            });
          }
        }
      } else {
        // Handle free-form or other modes
        const responses = await Promise.all(
          aiParticipants.map(participant =>
            data.onSend?.(id, inputMessage, participant)
          )
        );
  
        responses.forEach((response, index) => {
          if (response) {
            const aiMessage = {
              id: Date.now() + index,
              senderId: aiParticipants[index].id,
              senderName: aiParticipants[index].name,
              role: aiParticipants[index].role?.type || 'assistant',
              content: response,
              timestamp: new Date().toISOString()
            };
  
            updatedMessages.push(aiMessage);
          }
        });
  
        // Update state with all messages
        data.onChange?.(id, { 
          messages: updatedMessages,
          output: formatConversationOutput(updatedMessages)
        });
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Updated formatConversationOutput function
  const formatConversationOutput = (messages) => {
    return messages.map(message => {
      const prefix = message.senderName ? 
        (message.role ? `${message.senderName} (${message.role}): ` : `${message.senderName}: `) :
        '';
      return `${prefix}${message.content}`;
    }).join('\n\n');
  };

  // Participant management
  const handleParticipantConfig = useCallback((event, participant) => {
    event.stopPropagation();
    setSelectedParticipant(participant);
    setShowParticipantConfig(true);
  }, []);

  const handleRemoveParticipant = useCallback((event, agentId) => {
    event.stopPropagation();
    if (data?.onChange) {
      const newAgents = participants.filter(p => p.id !== agentId);
      data.onChange(id, { agents: newAgents });
    }
  }, [data, id, participants]);

  const handleParticipantChange = useCallback((participantId, changes) => {
    if (data?.onChange) {
      const updatedParticipants = participants.map(p => {
        if (p.id === participantId) {
          return {
            ...p,
            ...changes,
            model: changes.model || p.model,
            apiKeyId: changes.apiKeyId || p.apiKeyId,
            temperature: changes.temperature || p.temperature,
            maxTokens: changes.maxTokens || p.maxTokens,
          };
        }
        return p;
      });
      
      data.onChange(id, { agents: updatedParticipants });
    }
  }, [data?.onChange, id, participants]);

  // Drag and drop handling
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    let isValidDrag = false;
    try {
      const dragData = event.dataTransfer.getData('application/reactflow');
      if (dragData) {
        const parsedData = JSON.parse(dragData);
        isValidDrag = parsedData.type === 'aiAgent' || parsedData.type === 'humanAgent';
      }
    } catch (error) {
      console.log('Not a valid drag');
    }

    if (isValidDrag) {
      setIsDropZoneActive(true);
      event.dataTransfer.dropEffect = 'move';
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
      if (dragData.type === 'aiAgent' || dragData.type === 'humanAgent') {
        if (data?.onChange) {
          const agentConfig = {
            ...dragData.data,
            id: `${dragData.type}-${Date.now()}`,
            type: dragData.type === 'aiAgent' ? 'ai' : 'human'
          };
          
          data.onChange(id, {
            agents: [...participants, agentConfig]
          });
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [data, id, participants]);

  // Render functions
  const renderParticipantList = useCallback(() => {
    return participants.map((agent) => (
      <div
        key={agent.id}
        className="flex items-center justify-between bg-gray-50 p-2 rounded-md mb-2"
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
            ({agent.role?.type || 'No role defined'})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleParticipantConfig(e, agent)}
            title="Configure Agent"
          >
            <Settings2 className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleRemoveParticipant(e, agent.id)}
            title="Remove Agent"
          >
            <X className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>
    ));
  }, [participants, handleParticipantConfig, handleRemoveParticipant]);

  const renderSettings = () => (
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
          <div>
            <Label>Turn Management</Label>
            <Select
              value={turnManagement}
              onChange={(e) => data?.onChange?.(id, { turnManagement: e.target.value })}
              className="mt-1"
            >
              <option value="dynamic">Dynamic</option>
              <option value="strict">Strict</option>
            </Select>
          </div>
          <div>
            <Label>Context Handling</Label>
            <Select
              value={contextHandling}
              onChange={(e) => data?.onChange?.(id, { contextHandling: e.target.value })}
              className="mt-1"
            >
              <option value="cumulative">Cumulative</option>
              <option value="window">Sliding Window</option>
              <option value="summary">Summary Based</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowHuman"
              checked={allowHumanParticipation}
              onChange={(e) => data?.onChange?.(id, { 
                allowHumanParticipation: e.target.checked 
              })}
              className="rounded border-gray-300"
            />
            <Label htmlFor="allowHuman">Allow Human Participation</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div 
      ref={nodeRef}
      className={`conversation-node bg-white border-2 ${
        isDropZoneActive ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'
      } rounded-lg shadow-lg relative`}
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
        {showSettings && renderSettings()}

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

          {/* Drop Zone */}
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
                <span>Drag agents here from canvas or sidebar</span>
              )}
            </div>
          </div>

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
              <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                {messages.map((message, index) => (
                  <Message 
                    key={message.id || index}
                    message={message}
                    participants={participants}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
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
    </div>
  );
};

export default ConversationNode;