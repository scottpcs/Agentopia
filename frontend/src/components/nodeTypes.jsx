import AIAgentNode from './AIAgentNode';
import HumanInteractionNode from './HumanInteractionNode';
import TextInputNode from './TextInputNode';
import TextOutputNode from './TextOutputNode';
import ConversationNode from './ConversationNode';

export const nodeTypes = {
  aiAgent: AIAgentNode,
  humanAgent: HumanInteractionNode,
  humanInteraction: HumanInteractionNode,  // Added this mapping
  textInput: TextInputNode,
  textOutput: TextOutputNode,
  conversation: ConversationNode,
};