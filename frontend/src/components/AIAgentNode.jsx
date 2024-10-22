import React from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const AIAgentNode = ({ data, isConnectable }) => {
  return (
    <div className="ai-agent-node p-4 rounded-lg bg-white border border-blue-200 shadow-md w-64">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold mb-2">{data.name || 'AI Agent'}</div>
      <div className="text-xs mb-1">Model: {data.model || 'Not set'}</div>
      <div className="text-xs mb-1">Temp: {data.temperature || 'Default'}</div>
      
      {data.lastOutput && (
        <div className="text-xs mb-2 p-2 bg-gray-100 rounded">
          Last output: {data.lastOutput.substring(0, 50)}...
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default AIAgentNode;