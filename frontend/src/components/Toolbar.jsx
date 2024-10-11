// src/components/Toolbar.jsx

import React from 'react';
import { Button } from "./ui/button";

const Toolbar = ({ onAddNode }) => {
  const nodeTypes = [
    { type: 'ai', label: 'AI Agent' },
    { type: 'human', label: 'Human Agent' },
    { type: 'textInput', label: 'Text Input' },
    { type: 'textOutput', label: 'Text Output' },
    { type: 'humanInteraction', label: 'Human Interaction' },
  ];

  return (
    <div className="toolbar">
      <h3 className="toolbar-section-title">Add Nodes</h3>
      {nodeTypes.map((nodeType) => (
        <Button 
          key={nodeType.type}
          onClick={() => onAddNode(nodeType.type)} 
          className="toolbar-button"
        >
          {nodeType.label}
        </Button>
      ))}
    </div>
  );
};

export default Toolbar;