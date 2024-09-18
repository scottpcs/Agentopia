import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const AgentNode = ({ data, isConnectable }) => {
  return (
    <div className="agent-node">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="agent-node-content">
        <div className="agent-node-label">{data.label}</div>
        <div className="agent-node-model">{data.model}</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="a" isConnectable={isConnectable} />
    </div>
  );
};

export default memo(AgentNode);