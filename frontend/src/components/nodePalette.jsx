import React from 'react';
import { Button } from "./ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessagesSquare, 
  Type, 
  Bot, 
  User, 
  MessageCircle,
  ArrowRightLeft,
  Users,
  Workflow,
  GitFork,
  FileText,
  Database,
  Braces,
  Filter,
  Layers,
  Clock // Added Clock icon for TimingNode
} from 'lucide-react';

const NodePalette = ({ onDragStart }) => {
  const nodeTypes = [
    // Basic Nodes
    {
      type: 'textInput',
      label: 'Text Input',
      icon: Type,
      description: 'Input static text or dynamic content',
      category: 'Basic',
      data: {
        label: 'Text Input',
        inputText: '',
      }
    },
    {
      type: 'textOutput',
      label: 'Text Output',
      icon: MessageCircle,
      description: 'Display processed text and results',
      category: 'Basic',
      data: {
        label: 'Text Output',
        text: '',
      }
    },

    // Agent Nodes
    {
      type: 'aiAgent',
      label: 'AI Agent',
      icon: Bot,
      description: 'Add an AI agent with specific capabilities',
      category: 'Agents',
      data: {
        name: 'New AI Agent',
        type: 'ai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        personality: {
          creativity: 50,
          tone: 50,
          empathy: 50,
          assertiveness: 50,
          humor: 50,
          optimism: 50
        },
        role: {
          type: 'assistant',
          customRole: '',
          goalOrientation: 50,
          contributionStyle: 50,
          taskEmphasis: 50,
          domainScope: 50
        },
        expertise: {
          level: 'intermediate',
          knowledgeBalance: 50,
          selectedSkills: [],
          certainty: 50,
          responsibilityScope: 50
        }
      }
    },
    {
      type: 'humanAgent',
      label: 'Human Agent',
      icon: User,
      description: 'Add a human participant with defined role',
      category: 'Agents',
      data: {
        name: 'New Human Agent',
        type: 'human',
        role: 'Team Member',
        instructions: 'Please provide input as needed.',
      }
    },

    // Collaboration Nodes
    {
      type: 'conversation',
      label: 'Multi-Agent Conversation',
      icon: Users,
      description: 'Create a conversation between multiple agents',
      category: 'Collaboration',
      data: {
        label: 'New Conversation',
        mode: 'free-form',
        agents: [],
        messages: [],
        metadata: {
          allowedParticipants: 'all',
          turnManagement: 'dynamic'
        }
      }
    },
    {
      type: 'humanInteraction',
      label: 'Human Interaction',
      icon: MessagesSquare,
      description: 'Add point of human interaction and input',
      category: 'Collaboration',
      data: {
        name: 'Human Interaction',
        instructions: 'Please provide your input.',
        context: [],
      }
    },

    // Control Nodes
    {
      type: 'decision',
      label: 'Decision Node',
      icon: GitFork,
      description: 'Route workflow based on AI agent decisions',
      category: 'Control',
      data: {
        label: 'Decision Node',
        agent: null,
        criteria: {
          rules: [],
          thresholds: {},
          priorities: []
        },
        outputs: {
          approve: 'Approve',
          reject: 'Reject',
          needsInfo: 'Needs Information'
        }
      }
    },

    {
      type: 'timing',
      label: 'Timing Control',
      icon: Clock,
      description: 'Control workflow timing and synchronization',
      category: 'Control',
      data: {
        label: 'Timing Control',
        config: {
          mode: 'delay',
          duration: 60000,
          resetOnActivity: false,
          cancelOnTimeout: false,
          conditions: []
        }
      }
    },
    
    // Analysis Nodes
    {
      type: 'distill',
      label: 'Information Extraction',
      icon: FileText,
      description: 'Extract and structure key information from text',
      category: 'Analysis',
      data: {
        label: 'Information Extraction',
        extractionFields: [
          { id: 'requirements', label: 'Requirements', required: true },
          { id: 'scope', label: 'Project Scope', required: true },
          { id: 'budget', label: 'Budget Constraints', required: false },
          { id: 'timeline', label: 'Timeline Requirements', required: true },
          { id: 'success_criteria', label: 'Success Criteria', required: false }
        ]
      }
    },
    {
      type: 'contextProcessor',
      label: 'Context Processor',
      icon: ArrowRightLeft,
      description: 'Process and transform conversation context',
      category: 'Analysis',
      data: {
        label: 'Context Processor',
        processingRules: [],
        transformations: {}
      }
    },

    // Advanced Nodes
    {
      type: 'database',
      label: 'Database Operation',
      icon: Database,
      description: 'Store and retrieve structured data',
      category: 'Advanced',
      data: {
        label: 'Database Operation',
        operation: 'query',
        config: {}
      }
    },
    {
      type: 'jsonTransform',
      label: 'JSON Transform',
      icon: Braces,
      description: 'Transform and validate JSON data',
      category: 'Advanced',
      data: {
        label: 'JSON Transform',
        schema: {},
        transformRules: []
      }
    },
    {
      type: 'filter',
      label: 'Data Filter',
      icon: Filter,
      description: 'Filter and validate data streams',
      category: 'Advanced',
      data: {
        label: 'Data Filter',
        filterRules: [],
        validation: {}
      }
    },
    {
      type: 'workflow',
      label: 'Sub-Workflow',
      icon: Workflow,
      description: 'Embed another workflow as a node',
      category: 'Advanced',
      data: {
        label: 'Sub-Workflow',
        workflowId: null,
        inputMapping: {},
        outputMapping: {}
      }
    },
    {
      type: 'aggregator',
      label: 'Data Aggregator',
      icon: Layers,
      description: 'Combine data from multiple sources',
      category: 'Advanced',
      data: {
        label: 'Data Aggregator',
        aggregationRules: [],
        mergeStrategy: 'union'
      }
    },
    {
      type: 'timing',
      label: 'Timing Control',
      icon: Clock,
      description: 'Control workflow timing and synchronization',
      category: 'Control',
      data: {
        config: {
          mode: 'delay',
          duration: 60000,
          resetOnActivity: false,
          cancelOnTimeout: false
        }
      }
    }

  ];

  // Group nodes by category
  const groupedNodes = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = [];
    }
    acc[node.category].push(node);
    return acc;
  }, {});

  // Define category order
  const categoryOrder = ['Basic', 'Agents', 'Control', 'Collaboration', 'Analysis', 'Advanced'];

  const handleDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette p-4">
      <h2 className="text-lg font-semibold mb-4">Node Palette</h2>
      
      {categoryOrder.map(category => (
        <div key={category} className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
          <div className="space-y-2">
            {groupedNodes[category]?.map(nodeType => (
              <Card
                key={nodeType.type}
                draggable
                onDragStart={(event) => handleDragStart(event, nodeType)}
                className="cursor-move hover:border-blue-500 transition-colors duration-200"
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {nodeType.icon && (
                      <nodeType.icon className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{nodeType.label}</div>
                      <div className="text-xs text-gray-500">
                        {nodeType.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Tip</h4>
        <p className="text-xs text-gray-500">
          Drag nodes onto the canvas to create your workflow. Connect nodes by dragging between their handles.
        </p>
      </div>
    </div>
  );
};

export default NodePalette;