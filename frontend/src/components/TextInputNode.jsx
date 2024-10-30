import React, { useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";

const TextInputNode = ({ data, isConnectable }) => {
  // Update the node's data when inputText changes
  useEffect(() => {
    if (data.onChange && data.id) {
      data.onChange(data.id, { lastOutput: data.inputText });
    }
  }, [data.inputText]);

  const handleInputChange = (e) => {
    if (data.onChange && data.id) {
      data.onChange(data.id, { inputText: e.target.value });
    }
  };

  return (
    <div className="text-input-node p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
      <div className="font-bold mb-2">{data.label || 'Text Input'}</div>
      <Input
        value={data.inputText || ''}
        onChange={handleInputChange}
        placeholder="Enter text..."
        className="mb-2"
      />
      {data.lastOutput && (
        <div className="text-xs text-gray-500 mb-2">
          Last output: {data.lastOutput.substring(0, 50)}
          {data.lastOutput.length > 50 ? '...' : ''}
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

export default TextInputNode;