import React from 'react';
import { Button } from "./ui/button";

const Sidebar = ({ agents = [], onAddAgent, onCreateAgent }) => {
  const nodeTypes = [
    { type: 'aiAgent', label: 'AI Agent' },
    { type: 'humanAgent', label: 'Human Agent' },
    { type: 'textInput', label: 'Text Input' },
    { type: 'textOutput', label: 'Text Output' },
    { type: 'humanInteraction', label: 'Human Interaction' },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="sidebar">
      <h2>Node Palette</h2>
      <div className="node-types">
        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.type}
            className="node-type"
            onDragStart={(event) => onDragStart(event, nodeType.type)}
            draggable
          >
            <Button variant="ghost" className="w-full text-left text-xs py-1">
              {nodeType.label}
            </Button>
          </div>
        ))}
      </div>
      
      <h2>Agent Palette</h2>
      <div className="agents">
        {agents.map((agent) => (
          <Button 
            key={agent.id}
            onClick={() => onAddAgent(agent)}
            variant="ghost"
            className="w-full text-left text-xs py-1"
          >
            {agent.name}
          </Button>
        ))}
      </div>
      <Button onClick={onCreateAgent} className="w-full text-xs py-1 mt-2">
        Create New Agent
      </Button>
    </div>
  );
};

export default Sidebar;