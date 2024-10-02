import React from 'react';
import { Handle, Position } from 'reactflow';

const AgentNode = ({ data }) => {
  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} />
      <div className="agent-node-content">
        <div className="agent-node-label">{data.label}</div>
        <div className="agent-node-model">{data.model}</div>
        <div className="agent-node-api-key">{data.apiKeyId ? `Key: ${data.apiKeyId}` : 'No API Key Selected'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="a" />
    </div>
  );
};

export default AgentNode;