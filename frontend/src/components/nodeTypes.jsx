// src/components/nodeTypes.jsx
import AIAgentNode from './AIAgentNode';
import HumanInteractionNode from './HumanInteractionNode';
import TextInputNode from './TextInputNode';
import TextOutputNode from './TextOutputNode';
import ConversationNode from './ConversationNode';

export const nodeTypes = {
  aiAgent: AIAgentNode,
  humanAgent: HumanInteractionNode,
  humanInteraction: HumanInteractionNode,
  textInput: TextInputNode,
  textOutput: TextOutputNode,
  conversation: ConversationNode,
};