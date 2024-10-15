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

// src/components/TextOutputNode.jsx
import React, { useEffect } from 'react';
import { Handle, Position } from 'reactflow';

const TextOutputNode = ({ data, isConnectable }) => {
  useEffect(() => {
    if (data.contextInput) {
      // Convert context array to a string for display
      const contextString = data.contextInput
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      data.onChange(data.id, { text: contextString });
    } else if (data.input) {
      // Handle regular input
      data.onChange(data.id, { text: data.input });
    }
  }, [data.contextInput, data.input, data.onChange, data.id]);

  return (
    <div className="text-output-node p-2 rounded-md bg-white border border-gray-300">
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="contextInput"
        style={{ background: '#ff0072' }}
        isConnectable={isConnectable}
      />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="p-2 bg-gray-100 rounded min-h-[50px] max-w-[200px] overflow-hidden">
        {data.text || 'No output yet'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default TextOutputNode;