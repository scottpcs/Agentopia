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

import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from "./ui/button";

const TextOutputNode = ({ data, isConnectable }) => {
  const [showFullText, setShowFullText] = useState(false);

  const toggleFullText = useCallback(() => {
    setShowFullText(prev => !prev);
  }, []);

  const previewText = data.text 
    ? data.text.split(' ').slice(0, 10).join(' ') + '...'
    : 'No output yet';

  return (
    <div className="text-output-node p-2 rounded-md bg-white border border-gray-300">
      <Handle type="target" position={Position.Top} id="input" isConnectable={isConnectable} />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="p-2 bg-gray-100 rounded min-h-[50px] max-w-[200px] overflow-hidden">
        {previewText}
      </div>
      <Button onClick={toggleFullText} className="mt-2">
        View Full Text
      </Button>
      {showFullText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-2xl max-h-[80vh] overflow-auto">
            <h3 className="font-bold mb-2">Full Output</h3>
            <pre className="whitespace-pre-wrap">{data.text}</pre>
            <Button onClick={toggleFullText} className="mt-4">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextOutputNode;