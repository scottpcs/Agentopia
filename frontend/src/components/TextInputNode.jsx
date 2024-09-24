/**
 * TextInputNode.jsx
 * 
 * This component represents a text input node in the workflow.
 * It allows users to enter text that can be used as input for AI agents.
 * 
 * Props:
 * - data: Object containing the node's data
 * - isConnectable: Boolean indicating if the node can be connected
 * 
 * @component
 */

// src/components/TextInputNode.jsx

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const TextInputNode = ({ data, isConnectable }) => {
  return (
    <div className="text-input-node p-2 rounded-md bg-white border border-gray-300">
      <div className="font-bold mb-2">{data.label}</div>
      <div className="mb-2 text-sm overflow-hidden text-ellipsis whitespace-nowrap">
        {data.inputText ? data.inputText.substring(0, 20) + '...' : 'No input text'}
      </div>
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

export default TextInputNode;