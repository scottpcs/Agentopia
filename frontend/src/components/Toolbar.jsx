/**
 * Toolbar.jsx
 * 
 * This component renders the toolbar on the left side of the application.
 * It provides buttons for adding different types of nodes to the workflow.
 * 
 * Props:
 * - onAddNode: Function to handle adding a new node to the workflow
 * 
 * @component
 */

import React from 'react';
import { Button } from "./ui/button";

const Toolbar = ({ onAddNode }) => {
  const nodeTypes = [
    { type: 'agent', label: 'Agent Node' },
    { type: 'textInput', label: 'Text Input' },
    { type: 'textOutput', label: 'Text Output' },
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