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
  Users,
  Grip 
} from 'lucide-react';

const Sidebar = ({ agents = [], onAddAgent, onCreateAgent }) => {
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
      description: 'Create a conversation between multiple agents'
    }
  ];

  const onDragStart = (event, nodeType, agentData = null) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType.type,
      data: agentData || {
        label: nodeType.label,
        ...defaultAgentConfig
      }
    }));
    event.dataTransfer.effectAllowed = 'move';

    // Create a drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = `
      <span class="flex items-center gap-2">
        ${nodeType.icon ? `<i class="text-gray-500"></i>` : ''}
        <span>${nodeType.label}</span>
      </span>
    `;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 0, 0);
    
    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);
  };

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Node Palette</h2>
        <div className="space-y-2">
          {nodeTypes.map((nodeType) => (
            <div
              key={nodeType.type}
              className="node-type"
              draggable
              onDragStart={(event) => onDragStart(event, nodeType)}
            >
              <Button 
                variant="ghost" 
                className="w-full justify-start text-left text-sm py-1.5 px-2 flex items-center gap-2"
              >
                <Grip className="w-4 h-4 text-gray-400" />
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
                <div
                  key={agent.id}
                  className="agent-item group"
                  draggable
                  onDragStart={(event) => onDragStart(event, {
                    type: agent.type === 'ai' ? 'aiAgent' : 'humanAgent',
                    label: agent.name
                  }, agent)}
                >
                  <Button 
                    variant="ghost"
                    className="w-full justify-start text-left text-sm py-1.5 px-2"
                  >
                    <Grip className="w-4 h-4 text-gray-400 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {agent.type === 'ai' ? (
                      <Bot className="w-4 h-4 text-blue-500 mr-2" />
                    ) : (
                      <User className="w-4 h-4 text-green-500 mr-2" />
                    )}
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-gray-500">
                        {agent.role?.type || 'Custom Agent'}
                      </div>
                    </div>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic px-2">
                No agents created yet
              </p>
            )}
          </div>

          <Button 
            onClick={onCreateAgent}
            className="w-full mt-4"
            variant="outline"
          >
            Build Agents
          </Button>
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
    </div>
  );
};

// PropTypes for better development experience
Sidebar.propTypes = {
  agents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
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