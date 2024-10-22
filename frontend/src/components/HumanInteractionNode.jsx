import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const HumanInteractionNode = ({ id, data, isConnectable }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (data.contextInput && Array.isArray(data.contextInput)) {
      setMessages(prevMessages => {
        const newMessages = [...data.contextInput];
        prevMessages.forEach(msg => {
          if (!newMessages.some(newMsg => 
            newMsg.role === msg.role && 
            newMsg.content === msg.content && 
            newMsg.sender === msg.sender
          )) {
            newMessages.push(msg);
          }
        });
        return newMessages;
      });
    }
  }, [data.contextInput]);

  const handleSend = useCallback(() => {
    if (input.trim()) {
      const newMessage = { 
        role: 'user', 
        content: input.trim(), 
        sender: data.name || 'Human' 
      };
  
      setMessages(prevMessages => {
        if (!prevMessages.some(msg => 
          msg.role === newMessage.role && 
          msg.content === newMessage.content && 
          msg.sender === newMessage.sender
        )) {
          const updatedMessages = [...prevMessages, newMessage];
          console.log(`HumanInteractionNode ${id} sending message:`, input.trim());
          
          // Handle workflow execution response
          if (data.waitingForInput && data.resolveInput) {
            data.resolveInput(input.trim());
          }
          
          // Handle normal interaction
          if (data.onSend) {
            data.onSend(id, input.trim(), updatedMessages);
          }
          if (data.onContextOutput) {
            data.onContextOutput(id, updatedMessages);
          }
          
          return updatedMessages;
        }
        return prevMessages;
      });
      
      setInput('');
    }
  }, [input, id, data]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleReceive = useCallback((incomingMessage, agentName) => {
    console.log(`HumanInteractionNode ${id} received message from ${agentName}:`, incomingMessage);
    const newMessage = { 
      role: 'assistant', 
      content: incomingMessage, 
      sender: agentName 
    };

    setMessages(prevMessages => {
      if (!prevMessages.some(msg => 
        msg.role === newMessage.role && 
        msg.content === newMessage.content && 
        msg.sender === newMessage.sender
      )) {
        const updatedMessages = [...prevMessages, newMessage];
        if (data.onContextOutput) {
          data.onContextOutput(id, updatedMessages);
        }
        return updatedMessages;
      }
      return prevMessages;
    });
  }, [id, data]);

  // Expose the handleReceive method to parent components
  React.useImperativeHandle(data.ref, () => ({
    handleReceive
  }));

  return (
    <div className="human-interaction-node p-4 rounded-lg bg-white border border-purple-200 shadow-md w-64">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />

      <Handle 
        type="target" 
        position={Position.Left} 
        id="contextInput"
        style={{ background: '#555', top: '25%' }}
        isConnectable={isConnectable}
      />

      <Handle 
        type="source" 
        position={Position.Left} 
        id="contextOutput"
        style={{ background: '#555', top: '75%' }}
        isConnectable={isConnectable}
      />

      <div className="font-bold mb-2">{data.name || 'Human Interaction'}</div>
      <div className="message-window h-40 overflow-y-auto mb-2 p-2 bg-gray-100 rounded">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-2 ${
              msg.role === 'user' ? 'text-blue-600' : 'text-green-600'
            }`}
          >
            <strong>{msg.sender}: </strong>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="flex-grow"
        />
        <Button onClick={handleSend}>Send</Button>
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="output"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />

      {/* Handle labels */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
        Input
      </div>
      <div className="absolute left-0 top-1/4 transform -translate-x-full -translate-y-1/2 text-xs pr-1">
        Context In
      </div>
      <div className="absolute left-0 top-3/4 transform -translate-x-full -translate-y-1/2 text-xs pr-1">
        Context Out
      </div>
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs">
        Output
      </div>
    </div>
  );
};

export default HumanInteractionNode;