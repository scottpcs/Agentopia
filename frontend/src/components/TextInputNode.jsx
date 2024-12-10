import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Input } from "./ui/input";

const TextInputNode = ({ id, data, isConnectable }) => {
  const [localValue, setLocalValue] = useState(data?.inputText || '');

  // Add effect to sync with PropertyPanel changes
  useEffect(() => {
    if (data?.inputText !== undefined && data.inputText !== localValue) {
      console.log('TextInputNode syncing with PropertyPanel:', {
        nodeId: id,
        oldValue: localValue,
        newValue: data.inputText,
        source: 'propertyPanel'
      });
      setLocalValue(data.inputText);
    }
  }, [data.inputText, id, localValue]);

  const updateNodeData = (newValue) => {
    console.log('updateNodeData called with:', {
      nodeId: id,
      newValue,
      source: 'nodeInput'
    });

    if (data?.onChange && id) {
      const updatedData = {
        ...data,
        inputText: newValue,
        text: newValue,
        value: newValue,
        lastOutput: newValue,
        input: newValue,
        output: newValue,
        contextInput: newValue,
        contextOutput: newValue
      };

      console.log('Updating node data:', {
        id,
        newValue,
        fullData: updatedData
      });

      data.onChange(id, updatedData);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    updateNodeData(newValue);
  };

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