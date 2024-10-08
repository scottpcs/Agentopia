import React from 'react';
import { Button } from "./ui/button";

const Toolbar = ({ onAddNode }) => {
  const nodeTypes = [
    { type: 'agent', label: 'Agent Node' },
    { type: 'textInput', label: 'Text Input' },
    { type: 'textOutput', label: 'Text Output' },
    { type: 'humanInteraction', label: 'Human Interaction' },
    { type: 'textProcess', label: 'Text Process' },
    { type: 'conditional', label: 'Conditional' },
    { type: 'httpRequest', label: 'HTTP Request' },
    { type: 'function', label: 'Function' },
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