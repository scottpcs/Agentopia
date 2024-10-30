import React from 'react';
import { Button } from "@/components/ui/button";
import PropTypes from 'prop-types';
import { defaultAgentConfig } from '../utils/agentConfigConverter';
import { 
  MessageSquare, 
  Type, 
  Bot, 
  User, 
  MessageCircle,
  Users 
} from 'lucide-react';

const Sidebar = ({ agents = [], onAddAgent, onCreateAgent }) => {
  console.log('Sidebar rendered:', { 
    agentsCount: agents.length, 
    hasCreateHandler: !!onCreateAgent,
    hasAddHandler: !!onAddAgent 
  });

  const nodeTypes = [
    { 
      type: 'aiAgent', 
      label: 'AI Agent',
      icon: Bot,
      description: 'Add an AI agent to your workflow'
    },
    { 
      type: 'humanAgent', 
      label: 'Human Agent',
      icon: User,
      description: 'Add a human participant'
    },
    { 
      type: 'textInput', 
      label: 'Text Input',
      icon: Type,
      description: 'Add text input to your workflow'
    },
    { 
      type: 'textOutput', 
      label: 'Text Output',
      icon: MessageCircle,
      description: 'Display output text'
    },
    { 
      type: 'humanInteraction', 
      label: 'Human Interaction',
      icon: MessageSquare,
      description: 'Add human interaction point'
    },
    { 
      type: 'conversation', 
      label: 'Multi-Agent Conversation',
      icon: Users,
      description: 'Create a conversation between multiple agents',
      data: {
        label: 'New Conversation',
        mode: 'free-form',
        agents: [],
        allowHumanParticipation: true,
        turnManagement: 'dynamic',
        contextHandling: 'cumulative'
      }
    }
  ];

  const onDragStart = (event, nodeType) => {
    console.log('Node drag started:', nodeType);
    
    let nodeData = {};
    
    switch (nodeType.type) {
      case 'aiAgent':
        nodeData = {
          name: 'New AI Agent',
          type: 'ai',
          ...defaultAgentConfig,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
        };
        break;
      case 'humanAgent':
        nodeData = {
          name: 'New Human Agent',
          type: 'human',
          role: 'Team Member',
          instructions: 'Please provide input as needed.',
        };
        break;
      case 'conversation':
        nodeData = nodeType.data;
        break;
      default:
        nodeData = {
          name: `New ${nodeType.label}`,
          ...nodeType.data
        };
    }

    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType.type,
      data: nodeData
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleAgentClick = (agent) => {
    console.log('Agent selected:', agent);
    if (onAddAgent) {
      onAddAgent(agent);
    } else {
      console.warn('No onAddAgent handler provided');
    }
  };

  const handleCreateAgentClick = () => {
    console.log('Build Agents button clicked');
    if (onCreateAgent) {
      onCreateAgent();
    } else {
      console.warn('No onCreateAgent handler provided');
    }
  };

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Node Palette</h2>
        <div className="space-y-2">
          {nodeTypes.map((nodeType) => (
            <div
              key={nodeType.type}
              className="node-type cursor-move"
              draggable
              onDragStart={(event) => onDragStart(event, nodeType)}
            >
              <Button 
                variant="ghost" 
                className="w-full justify-start text-left text-sm py-1.5 px-2 flex items-center gap-2"
              >
                {nodeType.icon && <nodeType.icon className="h-4 w-4" />}
                <div>
                  <div className="font-medium">{nodeType.label}</div>
                  <div className="text-xs text-gray-500">
                    {nodeType.description}
                  </div>
                </div>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Agent Palette</h2>
          <div className="space-y-2">
            {agents.length > 0 ? (
              agents.map((agent) => (
                <Button 
                  key={agent.id}
                  onClick={() => handleAgentClick(agent)}
                  variant="ghost"
                  className="w-full justify-start text-left text-sm py-1.5 px-2"
                  title={`Add ${agent.name} to workflow`}
                >
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-gray-500">
                      {agent.role?.type || 'Custom Agent'}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic px-2">
                No agents created yet
              </p>
            )}
          </div>

          <Button 
            onClick={handleCreateAgentClick}
            className="w-full mt-4"
            variant="outline"
          >
            Build Agents
          </Button>
        </div>
      </div>

      {/* Optional debug information in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-auto p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            <div>Agents: {agents.length}</div>
            <div>Node Types: {nodeTypes.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// PropTypes for better development experience
Sidebar.propTypes = {
  agents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      role: PropTypes.shape({
        type: PropTypes.string,
      }),
    })
  ),
  onAddAgent: PropTypes.func.isRequired,
  onCreateAgent: PropTypes.func.isRequired,
};

Sidebar.defaultProps = {
  agents: [],
};

export default Sidebar;