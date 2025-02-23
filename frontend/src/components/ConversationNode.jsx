// src/components/ConversationNode.jsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Hand,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { CONVERSATION_MODES } from '../utils/conversationContextManager';
import { useConversationManager } from '../hooks/useConversationManager';
import { callOpenAI } from '../services/openaiService';
import PropTypes from 'prop-types';

// Message component for rendering individual messages in the conversation
const Message = ({ message, participants, onReaction, onReference }) => {
  const participant = participants.find(p => p.id === message.senderId);
  const isAI = participant?.type === 'ai';
  const hasReferences = message.references?.length > 0;
  const isQuestion = message.analysis?.type === 'question';
  const hasMentions = message.analysis?.mentions?.length > 0;

  return (
    <div className={`mb-2 p-2 rounded-lg ${
      isAI ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
    } ${isQuestion ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
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
        </div>
        <span className="text-xs text-gray-500">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="text-sm whitespace-pre-wrap">
        {message.content}
      </div>

      {hasMentions && (
        <div className="mt-1 text-xs text-gray-500">
          Mentions: {message.analysis.mentions.join(', ')}
        </div>
      )}

      {hasReferences && (
        <div className="mt-1 text-xs text-gray-500">
          References: {message.references.map(ref => (
            <button 
              key={ref.id}
              onClick={() => onReference(ref)}
              className="underline hover:text-blue-500"
            >
              {ref.preview}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onReaction(message.id, 'raise_hand')}
        >
          <Hand className="w-3 h-3 mr-1" />
          Raise Hand
        </Button>
        {isQuestion && !message.resolved && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Awaiting answer
          </span>
        )}
      </div>
    </div>
  );
};

Message.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    senderId: PropTypes.string.isRequired,
    senderName: PropTypes.string,
    role: PropTypes.string,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    analysis: PropTypes.shape({
      type: PropTypes.string,
      mentions: PropTypes.arrayOf(PropTypes.string),
      questions: PropTypes.arrayOf(PropTypes.string),
      topics: PropTypes.arrayOf(PropTypes.string),
      sentiment: PropTypes.string
    }),
    references: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      preview: PropTypes.string.isRequired
    })),
    resolved: PropTypes.bool
  }).isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['ai', 'human']).isRequired,
    role: PropTypes.shape({
      type: PropTypes.string
    })
  })).isRequired,
  onReaction: PropTypes.func.isRequired,
  onReference: PropTypes.func.isRequired
};
const ConversationNode = ({ id, data, isConnectable }) => {
  // State declarations
  const [expanded, setExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [showParticipantConfig, setShowParticipantConfig] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [showTopicManager, setShowTopicManager] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Use our conversation manager hook
  const {
    setupConversation,
    processMessage,
    getAgentInstructions,
    updateMetrics,
    getStatistics,
    conversationState,
    isProcessing,
    error
  } = useConversationManager({
    mode: data?.mode || 'free-form',
    responseTimeout: 30000
  });

  // Memoized values
  const participants = useMemo(() => data?.agents || [], [data?.agents]);
  const messages = useMemo(() => data?.messages || [], [data?.messages]);
  const conversationMode = useMemo(() => data?.mode || 'free-form', [data?.mode]);
  const allowHumanParticipation = useMemo(() => 
    data?.allowHumanParticipation !== false, 
    [data?.allowHumanParticipation]
  );

  // Effect to initialize conversation
  useEffect(() => {
    if (participants.length > 0) {
      setupConversation(participants, conversationMode);
    }
  }, [participants, conversationMode, setupConversation]);

  // Effect to scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    try {
      // Create message object
      const userMessage = {
        id: Date.now(),
        senderId: 'user',
        senderName: 'User',
        role: 'user',
        content: inputMessage.trim(),
        timestamp: new Date().toISOString()
      };

      // Process message through conversation manager
      const result = await processMessage(userMessage, 'user');
      
      if (!result) {
        throw new Error('Failed to process message');
      }

      // Get AI responses based on the response queue
      const aiResponses = await Promise.all(
        result.responseQueue.map(async (respondentId) => {
          const agent = participants.find(p => p.id === respondentId);
          if (!agent || agent.type !== 'ai') return null;

          // Get customized instructions for this agent in the conversation
          const instructions = getAgentInstructions(respondentId);
          
          try {
            const response = await callOpenAI(
              agent.apiKeyId,
              agent.modelConfig?.model || 'gpt-4o',
              [
                { role: 'system', content: instructions },
                ...messages.map(m => ({
                  role: m.role,
                  content: m.content,
                  name: m.senderName
                })),
                { role: 'user', content: userMessage.content }
              ],
              agent.modelConfig?.parameters?.temperature || 0.7,
              agent.modelConfig?.parameters?.maxTokens || 2048
            );

            return {
              id: Date.now() + respondentId,
              senderId: respondentId,
              senderName: agent.name,
              role: agent.role?.type || 'assistant',
              content: response,
              timestamp: new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error getting response from agent ${agent.name}:`, error);
            return null;
          }
        })
      );

      // Filter out null responses and update conversation
      const validResponses = aiResponses.filter(Boolean);
      const updatedMessages = [
        ...messages,
        userMessage,
        ...validResponses
      ];

      // Update node data with new messages
      if (data?.onChange) {
        data.onChange(id, {
          messages: updatedMessages,
          lastInput: inputMessage,
          lastOutput: validResponses.map(r => r.content).join('\n\n'),
          output: updatedMessages.map(m => `${m.senderName}: ${m.content}`).join('\n\n')
        });
      }

      // Clear input and update metrics
      setInputMessage('');
      updateMetrics('user', userMessage.analysis?.type);
      validResponses.forEach(response => {
        updateMetrics(response.senderId, 'response');
      });

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      if (data?.onChange) {
        data.onChange(id, { error: error.message });
      }
    }
  };

  // Handle participant actions
  const handleRaiseHand = useCallback((messageId, action) => {
    if (action === 'raise_hand') {
      setRaisedHands(prev => new Set([...prev, messageId]));
    }
  }, []);

  const handleReference = useCallback((reference) => {
    console.log('Reference clicked:', reference);
  }, []);

  const handleParticipantChange = useCallback((participantId, changes) => {
    if (!data?.onChange) return;

    const updatedAgents = participants.map(p => 
      p.id === participantId ? { ...p, ...changes } : p
    );

    data.onChange(id, { agents: updatedAgents });
  }, [participants, data, id]);

  // Render participant list
  const renderParticipantList = useCallback(() => {
    return participants.map((agent) => (
      <div
        key={agent.id}
        className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
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
  // Main render function
  return (
    <div 
      className="conversation-node bg-white border-2 border-gray-200 rounded-lg shadow-lg w-96"
      onClick={(e) => e.stopPropagation()}
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
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold">
                {data.label || 'Multi-Agent Conversation'}
              </h3>
              <span className="text-xs text-gray-500">
                {CONVERSATION_MODES[conversationMode].name}
              </span>
            </div>
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
              {/* Settings content from Part 2 */}
            </CardContent>
          </Card>
        )}

        {/* Messages Area */}
        {expanded && (
          <>
            {/* Topic and Status Bar */}
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="text-xs text-gray-500">
                {conversationState.activeTopics.size > 0 && (
                  <span className="flex items-center gap-1">
                    Active Topics: {Array.from(conversationState.activeTopics).join(', ')}
                  </span>
                )}
              </div>
              {isProcessing && (
                <div className="flex items-center gap-1 text-xs text-blue-500">
                  <Loader className="w-3 h-3 animate-spin" />
                  Processing...
                </div>
              )}
            </div>

            <div className="border rounded-lg mb-4">
              <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                {messages.map((message, index) => (
                  <Message 
                    key={message.id || index}
                    message={message}
                    participants={participants}
                    onReaction={handleRaiseHand}
                    onReference={handleReference}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Raised Hands Indicator */}
            {raisedHands.size > 0 && (
              <div className="mb-2 p-2 bg-amber-50 rounded-lg flex items-center gap-2">
                <Hand className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600">
                  {raisedHands.size} participant(s) would like to speak
                </span>
              </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                placeholder={
                  isProcessing ? 'Processing...' : 
                  conversationMode === 'moderated' ? 'Raise hand to speak...' :
                  'Type your message...'
                }
                disabled={isProcessing || (conversationMode === 'moderated' && !allowHumanParticipation)}
                className="flex-grow"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isProcessing || !inputMessage.trim() || 
                  (conversationMode === 'moderated' && !allowHumanParticipation)}
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

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

// PropTypes
ConversationNode.propTypes = {
  id: PropTypes.string.isRequired,
  data: PropTypes.shape({
    label: PropTypes.string,
    mode: PropTypes.oneOf([
      'free-form',
      'round-robin',
      'moderated',
      'brainstorming',
      'structured-debate'
    ]),
    agents: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['ai', 'human']).isRequired,
      role: PropTypes.shape({
        type: PropTypes.string,
        customRole: PropTypes.string,
        viewpoint: PropTypes.string
      }),
      modelConfig: PropTypes.shape({
        model: PropTypes.string,
        parameters: PropTypes.shape({
          temperature: PropTypes.number,
          maxTokens: PropTypes.number
        }),
        apiKeyId: PropTypes.string
      }),
      personality: PropTypes.shape({
        creativity: PropTypes.number,
        tone: PropTypes.number,
        empathy: PropTypes.number,
        assertiveness: PropTypes.number,
        humor: PropTypes.number,
        optimism: PropTypes.number
      }),
      expertise: PropTypes.shape({
        level: PropTypes.string,
        knowledgeBalance: PropTypes.number,
        selectedSkills: PropTypes.arrayOf(PropTypes.string),
        certainty: PropTypes.number,
        responsibilityScope: PropTypes.number
      }),
      participationLevel: PropTypes.oneOf(['active', 'passive', 'onRequest'])
    })),
    messages: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      senderId: PropTypes.string.isRequired,
      senderName: PropTypes.string,
      role: PropTypes.string,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
      analysis: PropTypes.shape({
        type: PropTypes.string,
        mentions: PropTypes.arrayOf(PropTypes.string),
        questions: PropTypes.arrayOf(PropTypes.string),
        suggestions: PropTypes.arrayOf(PropTypes.string),
        topics: PropTypes.arrayOf(PropTypes.string),
        sentiment: PropTypes.string,
        urgency: PropTypes.string,
        references: PropTypes.arrayOf(PropTypes.object),
        actionItems: PropTypes.arrayOf(PropTypes.object)
      })
    })),
    allowHumanParticipation: PropTypes.bool,
    onChange: PropTypes.func,
    apiKeys: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired
    })),
    contextHandling: PropTypes.oneOf(['cumulative', 'window', 'summary']),
    turnManagement: PropTypes.oneOf(['dynamic', 'strict'])
  }).isRequired,
  isConnectable: PropTypes.bool
};

// Default props
ConversationNode.defaultProps = {
  isConnectable: true,
  data: {
    mode: 'free-form',
    agents: [],
    messages: [],
    allowHumanParticipation: true,
    contextHandling: 'cumulative',
    turnManagement: 'dynamic'
  }
};

export default ConversationNode;