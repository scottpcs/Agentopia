import { callOpenAI } from '../services/openaiService';

export const executeWorkflow = async (nodes, edges, onNodeChange) => {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const edgeMap = new Map(edges.map(edge => [edge.source, edge.target]));

  const executeNode = async (nodeId, input = '') => {
    const node = nodeMap.get(nodeId);
    if (!node) return null;

    let output = '';
    switch (node.type) {
      case 'aiAgent':
        const { apiKeyId, model, temperature, maxTokens, systemInstructions } = node.data;
        const messages = [
          { role: 'system', content: systemInstructions || 'You are a helpful assistant.' },
          { role: 'user', content: input }
        ];
        try {
          output = await callOpenAI(apiKeyId, model, messages, temperature, maxTokens);
          onNodeChange(nodeId, { lastOutput: output });
        } catch (error) {
          console.error(`Error in AI processing for node ${nodeId}:`, error);
          output = `Error: ${error.message}`;
          onNodeChange(nodeId, { lastOutput: output });
        }
        break;
      case 'textInput':
        output = node.data.inputText || '';
        break;
      case 'textOutput':
        onNodeChange(nodeId, { text: input });
        output = input;
        break;
      // Add more cases for other node types as needed
      default:
        console.warn(`Unhandled node type: ${node.type}`);
        output = input;
    }

    const nextNodeId = edgeMap.get(nodeId);
    if (nextNodeId) {
      await executeNode(nextNodeId, output);
    }

    return output;
  };

  const startNodes = nodes.filter(node => !edges.some(edge => edge.target === node.id));

  for (const startNode of startNodes) {
    await executeNode(startNode.id);
  }
};

export const stopWorkflowExecution = () => {
  // Implement logic to stop the workflow execution
  console.log('Workflow execution stopped');
};