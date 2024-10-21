import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from './ui/button';
import { eventSystem } from '../utils/eventSystem';
import { agentRegistry } from '../utils/customAgentApi';

const ConversationNode = ({ data, isConnectable }) => {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [agents, setAgents] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize agents when the component mounts or when data.agents changes
    if (data.agents && Array.isArray(data.agents)) {
      const initializedAgents = data.agents.map(agentData => 
        agentRegistry.createAgent(agentData.role, agentData.id, agentData.name, agentData.role)
      );
      setAgents(initializedAgents);
    }

    // Set up event listener for new messages
    const handleNewMessage = (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    };
    eventSystem.on('newMessage', handleNewMessage);

    return () => {
      eventSystem.off('newMessage', handleNewMessage);
    };
  }, [data.agents]);

  const processConversation = useCallback(async (message) => {
    setIsProcessing(true);
    for (const agent of agents) {
      try {
        const response = await agent.processMessage(message);
        const newMessage = {
          id: Date.now(),
          content: response,
          sender: agent.name,
        };
        eventSystem.emit('newMessage', newMessage);
      } catch (error) {
        console.error(`Error processing message for agent ${agent.name}:`, error);
        eventSystem.emit('newMessage', {
          id: Date.now(),
          content: `Error: ${error.message}`,
          sender: 'System',
        });
      }
    }
    setIsProcessing(false);
  }, [agents]);

  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && !isProcessing) {
      const newMessage = {
        id: Date.now(),
        content: inputMessage,
        sender: 'User',
      };
      eventSystem.emit('newMessage', newMessage);
      setInputMessage('');
      processConversation(inputMessage);
    }
  }, [inputMessage, isProcessing, processConversation]);

  return (
    <div className="conversation-node bg-white border border-gray-300 rounded-lg p-4 shadow-md relative">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555', width: '12px', height: '12px', top: '-6px' }}
        isConnectable={isConnectable}
      />
      <div className="summary-view cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h3 className="text-lg font-bold mb-2">{data.label || 'Conversation'}</h3>
        <ul className="list-disc pl-5">
          {agents.map(agent => (
            <li key={agent.id} className="text-sm">{agent.name} - {agent.role}</li>
          ))}
        </ul>
      </div>
      {expanded && (
        <div className="expanded-view mt-4 border-t pt-4">
          <div className="conversation-messages max-h-60 overflow-y-auto mb-4">
            {messages.map(message => (
              <div key={message.id} className="mb-2">
                <strong>{message.sender}:</strong> {message.content}
              </div>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-grow mr-2 p-2 border rounded"
              placeholder="Type a message..."
              disabled={isProcessing}
            />
            <Button onClick={handleSendMessage} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Send'}
            </Button>
          </div>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555', width: '12px', height: '12px', bottom: '-6px' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default ConversationNode;