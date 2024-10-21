import React from 'react';
import { Button } from "./ui/button";

const AgentPalette = ({ agents = [], onAddAgent }) => {
  if (!Array.isArray(agents) || agents.length === 0) {
    return (
      <div className="agent-palette">
        <p>No agents available. Create an agent to get started.</p>
        <Button onClick={() => onAddAgent()}>Create New Agent</Button>
      </div>
    );
  }

  return (
    <div className="agent-palette">
      {agents.map((agent, index) => (
        <Button 
          key={index} 
          onClick={() => onAddAgent(agent)}
          className="mb-2 w-full text-left"
        >
          {agent.name || `Agent ${index + 1}`}
        </Button>
      ))}
      <Button onClick={() => onAddAgent()} className="mt-4 w-full">
        Create New Agent
      </Button>
    </div>
  );
};

export default AgentPalette;