import React from 'react';
import { Handle, Position } from 'reactflow';

const ContextProcessorNode = ({ data, isConnectable }) => {
  return (
    <div className="context-processor-node p-2 rounded-md bg-white border border-gray-300">
      <Handle
        type="target"
        position={Position.Top}
        id="contextInput"
        style={{ background: '#ff0072' }}
        isConnectable={isConnectable}
      />
      <div className="font-bold mb-2">{data.label || 'Context Processor'}</div>
      <div className="text-xs mb-2">Processing logic can be added here</div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="contextOutput"
        style={{ background: '#ff0072' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default ContextProcessorNode;