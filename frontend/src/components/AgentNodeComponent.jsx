import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const AIIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
    <path d="M13 7H7v6h6V7z" />
    <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
  </svg>
);

const HumanIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const AgentNodeComponent = ({ id, data, isConnectable }) => {
  const [localInput, setLocalInput] = useState('');
  const isAI = data.agentType === 'ai';

  const handleInputChange = (e) => {
    setLocalInput(e.target.value);
  };

  const handleSendClick = () => {
    if (data.onSend) {
      data.onSend(id, localInput);
      setLocalInput('');
    }
  };

  return (
    <div className={`agent-node ${isAI ? 'ai-agent' : 'human-agent'} p-2 rounded-md bg-white border border-gray-300`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="flex items-center mb-2">
        {isAI ? <AIIcon /> : <HumanIcon />}
        <div className="font-bold text-sm ml-2">{data.name || `${isAI ? 'AI' : 'Human'} Agent`}</div>
      </div>
      <div className="text-xs mb-1">Type: {isAI ? 'AI' : 'Human'}</div>
      {isAI && (
        <>
          <div className="text-xs mb-1">Model: {data.model || 'Not set'}</div>
          <div className="text-xs mb-1">Temp: {data.temperature || 'Default'}</div>
        </>
      )}
      {!isAI && <div className="text-xs mb-1">Role: {data.role || 'Not set'}</div>}
      <Input
        value={localInput}
        onChange={handleInputChange}
        placeholder="Enter input..."
        className="text-xs mb-1"
      />
      <Button onClick={handleSendClick} className="text-xs w-full mb-1">
        Send
      </Button>
      {data.lastOutput && (
        <div className="text-xs mb-1 p-1 bg-gray-100 rounded">
          Last output: {data.lastOutput.substring(0, 50)}...
        </div>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
};

export default AgentNodeComponent;