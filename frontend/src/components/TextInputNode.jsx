import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";

const TextInputNode = ({ data, isConnectable }) => {
  // Use data.inputText as the single source of truth
  const [localValue, setLocalValue] = useState('');

  // Strong synchronization effect - update local state whenever data changes
  useEffect(() => {
    // Check both inputText and text fields to handle all update sources
    const nodeText = data.inputText || data.text || '';
    if (nodeText !== localValue) {
      setLocalValue(nodeText);
      console.log('TextInputNode syncing from data:', {
        nodeText,
        previousLocal: localValue,
        dataSource: {
          inputText: data.inputText,
          text: data.text
        }
      });
    }
  }, [data.inputText, data.text]);

  const updateNodeData = (newValue) => {
    if (data.onChange && data.id) {
      const updatedData = {
        ...data,
        inputText: newValue,
        text: newValue,
        value: newValue,
        lastOutput: newValue,
        // Additional fields for workflow compatibility
        input: newValue,
        output: newValue
      };

      console.log('TextInputNode updating data:', {
        id: data.id,
        oldValue: localValue,
        newValue,
        fullData: updatedData
      });

      data.onChange(data.id, updatedData);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);  // Update local state
    updateNodeData(newValue); // Update node data
  };

  // Initial sync on mount
  useEffect(() => {
    if (data.id && (data.inputText || data.text)) {
      const initialText = data.inputText || data.text;
      setLocalValue(initialText);
      updateNodeData(initialText);
    }
  }, []);

  return (
    <div className="text-input-node p-4 rounded-lg bg-white border border-gray-200 shadow-sm w-64">
      <div className="font-bold mb-2">{data.label || 'Text Input'}</div>
      <Input
        value={localValue}
        onChange={handleInputChange}
        placeholder="Enter text..."
        className="mb-2 w-full"
      />
      {localValue && (
        <div className="text-xs text-gray-500 mb-2 break-words">
          Last output: {localValue}
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