/**
 * TextOutputNode.jsx
 * 
 * This component represents a text output node in the workflow.
 * It displays the output text from AI agents or other operations.
 * 
 * Props:
 * - data: Object containing the node's data (including output text)
 * - isConnectable: Boolean indicating if the node can be connected
 * 
 * @component
 */

import React from 'react';
import { Handle, Position } from 'reactflow';

const TextOutputNode = ({ data, isConnectable }) => {
  return (
    <div className="text-output-node p-2 rounded-md bg-white border border-gray-300">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="p-2 bg-gray-100 rounded min-h-[50px] max-w-[200px] overflow-auto">
        {data.text || 'No output yet'}
      </div>
    </div>
  );
};

export default TextOutputNode;