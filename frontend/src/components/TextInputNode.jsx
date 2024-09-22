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

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const TextInputNode = ({ data, isConnectable }) => {
  const [inputText, setInputText] = useState('');

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (data.onChange) {
      data.onChange(e.target.value);
    }
  };

  const handleSubmit = () => {
    if (data.onSubmit) {
      data.onSubmit(inputText);
    }
  };

  return (
    <div className="text-input-node p-2 rounded-md bg-white border border-gray-300">
      <div className="font-bold mb-2">{data.label}</div>
      <Input
        value={inputText}
        onChange={handleInputChange}
        placeholder="Enter text..."
        className="mb-2"
      />
      <Button onClick={handleSubmit} className="w-full">Submit</Button>
      <Handle type="source" position={Position.Bottom} id="output" isConnectable={isConnectable} />
    </div>
  );
};

export default TextInputNode;