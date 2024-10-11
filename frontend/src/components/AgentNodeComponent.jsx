// src/components/AgentNodeComponent.jsx

import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select } from "./ui/select";

const AgentNodeComponent = ({ id, data, isConnectable, updateNodeData }) => {
  const [input, setInput] = useState('');

  const handleChange = (field, value) => {
    updateNodeData(id, { [field]: value });
  };

  const handleSend = useCallback(() => {
    if (input.trim()) {
      updateNodeData(id, { 
        lastInput: input,
        context: [...(data.context || []), { role: 'user', content: input }]
      });
      setInput('');
    }
  }, [input, id, updateNodeData, data.context]);

  return (
    <div className={`agent-node ${data.type}-agent`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="agent-content">
        <Input 
          value={data.name} 
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Agent Name"
          className="mb-2"
        />
        <Select
          value={data.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="mb-2"
        >
          <option value="ai">AI</option>
          <option value="human">Human</option>
        </Select>
        <Input 
          value={data.role} 
          onChange={(e) => handleChange('role', e.target.value)}
          placeholder="Role"
          className="mb-2"
        />
        {data.type === 'ai' && (
          <>
            <Select
              value={data.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="mb-2"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
            </Select>
            <Input 
              type="number"
              value={data.temperature}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              placeholder="Temperature"
              className="mb-2"
            />
            <Input 
              type="number"
              value={data.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              placeholder="Max Tokens"
              className="mb-2"
            />
            <Input 
              value={data.apiKeyId}
              onChange={(e) => handleChange('apiKeyId', e.target.value)}
              placeholder="API Key ID"
              className="mb-2"
            />
          </>
        )}
        <textarea
          value={data.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          placeholder="Instructions"
          className="mb-2 w-full"
          rows={3}
        />
        
        <div className="human-interaction">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Type a message..."
            className="mb-2"
          />
          <Button onClick={handleSend}>Send</Button>
        </div>
        
        {data.lastOutput && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <strong>Output:</strong> {data.lastOutput}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
};

export default AgentNodeComponent;