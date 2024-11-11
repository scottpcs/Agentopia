// src/components/nodeTypes.jsx

import AIAgentNode from './AIAgentNode';
import HumanInteractionNode from './HumanInteractionNode';
import TextInputNode from './TextInputNode';
import TextOutputNode from './TextOutputNode';
import ConversationNode from './ConversationNode';
import ContextProcessorNode from './ContextProcessorNode';

// Node type definitions without wrapping them in objects
export const nodeTypes = {
  aiAgent: AIAgentNode,
  humanAgent: HumanInteractionNode,
  humanInteraction: HumanInteractionNode,
  textInput: TextInputNode,
  textOutput: TextOutputNode,
  conversation: ConversationNode,
  contextProcessor: ContextProcessorNode
};

// Store the extended configurations separately
export const nodeConfigs = {
  aiAgent: {
    defaultName: 'AI Agent',
    defaultModel: 'gpt-4o',
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048,
    defaults: {
      width: 200,
      height: 150,
      data: {
        name: 'AI Agent',
        type: 'ai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
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
    }
  },
  humanAgent: {
    defaultName: 'Human Agent',
    defaultRole: 'Team Member',
    defaults: {
      width: 200,
      height: 150,
      data: {
        name: 'Human Agent',
        type: 'human',
        role: 'Team Member',
        instructions: 'Please provide input as needed.'
      }
    }
  },
  conversation: {
    defaultMode: 'free-form',
    defaultTurnManagement: 'dynamic',
    defaultContextHandling: 'cumulative',
    defaults: {
      width: 300,
      height: 200,
      data: {
        label: 'Multi-Agent Conversation',
        mode: 'free-form',
        agents: [],
        messages: [],
        turnManagement: 'dynamic',
        contextHandling: 'cumulative',
        allowHumanParticipation: true
      }
    }
  }
};

// Helper functions
export const getNodeDefaults = (type) => {
  return nodeConfigs[type]?.defaults || {};
};

export const createNode = (type, customData = {}) => {
  const config = nodeConfigs[type];
  if (!config) {
    throw new Error(`Unknown node type: ${type}`);
  }

  return {
    type,
    ...config.defaults,
    data: {
      ...config.defaults.data,
      ...customData
    }
  };
};

export const validateNodeType = (type) => {
  return type in nodeTypes;
};

export const getNodeConfig = (type) => {
  return nodeConfigs[type] || {};
};

export default nodeTypes;