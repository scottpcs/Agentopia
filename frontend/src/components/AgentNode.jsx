import React from 'react';
import { Handle, Position } from 'reactflow';

const AgentNode = ({ data }) => {
  // Function to get a summary of custom instructions
  const getInstructionsSummary = (instructions) => {
    if (!instructions) return 'No custom instructions';
    const words = instructions.split(' ');
    if (words.length > 10) {
      return words.slice(0, 10).join(' ') + '...';
    }
    return instructions;
  };

  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} />
      <div className="agent-node-content">
        <div className="agent-node-label">{data.label}</div>
        <div className="agent-node-model">{data.model}</div>
        <div className="agent-node-api-key">{data.apiKeyId ? `Key: ${data.apiKeyId}` : 'No API Key Selected'}</div>
        {data.personality && (
          <div className="agent-node-personality">
            <div>Creativity: {data.personality.x}, {data.personality.y}</div>
            <div>Temp: {data.modelSettings?.temperature.toFixed(2)}</div>
            <div className="text-xs mt-1 text-gray-600">
              {getInstructionsSummary(data.customInstructions)}
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} id="a" />
    </div>
  );
};

export default AgentNode;