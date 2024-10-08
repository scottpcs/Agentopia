import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const HumanInteractionNode = ({ data, isConnectable }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSend = useCallback(() => {
    if (input.trim()) {
      const newMessage = { type: 'outgoing', content: input.trim() };
      setMessages(prev => [...prev, newMessage]);
      setInput('');
      // Here, we would typically trigger the next node in the workflow
      // For now, we'll just log the message
      console.log('Sent:', newMessage);
    }
  }, [input]);

  const handleReceive = useCallback((incomingMessage) => {
    const newMessage = { type: 'incoming', content: incomingMessage };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Expose the handleReceive method to parent components
  React.useImperativeHandle(data.ref, () => ({
    handleReceive
  }));

  return (
    <div className="human-interaction-node p-4 rounded-lg bg-white border border-gray-200 shadow-md w-64">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <h3 className="font-bold mb-2">{data.label || 'Human Interaction'}</h3>
      <div className="message-window h-40 overflow-y-auto mb-2 p-2 bg-gray-100 rounded">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.type === 'outgoing' ? 'text-blue-600' : 'text-green-600'}`}>
            <strong>{msg.type === 'outgoing' ? 'You: ' : 'Received: '}</strong>{msg.content}
          </div>
        ))}
      </div>
      <div className="flex">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-grow mr-2"
        />
        <Button onClick={handleSend}>Send</Button>
      </div>
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

export default HumanInteractionNode;