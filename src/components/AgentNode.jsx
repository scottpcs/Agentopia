import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

const AgentNode = ({ data, isConnectable }) => {
  const [model, setModel] = useState(data.model || 'gpt-3.5-turbo');
  const [systemMessage, setSystemMessage] = useState(data.systemMessage || '');
  const [temperature, setTemperature] = useState(data.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data.maxTokens || 150);

  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  return (
    <div className="agent-node">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      <div className="agent-node-content">
        <h3>OpenAI Agent</h3>
        <label>
          Model:
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
          </select>
        </label>
        <label>
          System Message:
          <textarea
            value={systemMessage}
            onChange={(e) => setSystemMessage(e.target.value)}
            placeholder="Enter system message..."
          />
        </label>
        <label>
          Temperature:
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Max Tokens:
          <input
            type="number"
            step="1"
            min="1"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          />
        </label>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default AgentNode;