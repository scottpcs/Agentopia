import { callOpenAI } from '../services/openaiService';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';

let isExecutionStopped = false;

export const executeWorkflow = async (nodes, edges, onNodeChange) => {
  console.log('Starting workflow execution');
  console.log('Nodes:', nodes.map(n => ({ id: n.id, type: n.type })));
  console.log('Edges:', edges.map(e => ({ source: e.source, target: e.target })));
  
  isExecutionStopped = false;
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  
  // Create edge mappings
  const edgesBySource = edges.reduce((acc, edge) => {
    if (!acc[edge.source]) acc[edge.source] = [];
    acc[edge.source].push(edge);
    return acc;
  }, {});

  const incomingEdges = edges.reduce((acc, edge) => {
    if (!acc[edge.target]) acc[edge.target] = [];
    acc[edge.target].push(edge);
    return acc;
  }, {});

  // Find the best start node based on node type and connections
  const findStartNode = () => {
    // First, try to find nodes with no incoming edges
    const nodesWithoutIncoming = nodes.filter(node => 
      !incomingEdges[node.id] || incomingEdges[node.id].length === 0
    );
    
    if (nodesWithoutIncoming.length > 0) {
      // Prioritize nodes in this order: textInput, humanInteraction, aiAgent
      const priorityOrder = ['textInput', 'humanInteraction', 'aiAgent'];
      
      for (const nodeType of priorityOrder) {
        const priorityNode = nodesWithoutIncoming.find(node => node.type === nodeType);
        if (priorityNode) {
          console.log(`Using ${nodeType} node as start:`, priorityNode);
          return priorityNode;
        }
      }
      
      // If no priority nodes found, use the first node without incoming edges
      console.log('Using first node without incoming edges:', nodesWithoutIncoming[0]);
      return nodesWithoutIncoming[0];
    }

    // If all nodes have incoming edges, prefer textInput nodes
    const textInputNodes = nodes.filter(node => node.type === 'textInput');
    if (textInputNodes.length > 0) {
      console.log('Using text input node as start:', textInputNodes[0]);
      return textInputNodes[0];
    }

    // Then try humanInteraction nodes
    const humanNodes = nodes.filter(node => node.type === 'humanInteraction');
    if (humanNodes.length > 0) {
      console.log('Using human interaction node as start:', humanNodes[0]);
      return humanNodes[0];
    }

    // Otherwise, use the first node
    console.log('Using first node as start:', nodes[0]);
    return nodes[0];
  };

  const processNode = async (nodeId, input = '', visited = new Set()) => {
    if (isExecutionStopped) {
      console.log('Workflow execution stopped');
      return null;
    }

    if (visited.has(nodeId)) {
      console.log(`Skipping already visited node: ${nodeId}`);
      return null;
    }

    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    
    if (!node) {
      console.log(`Node ${nodeId} not found`);
      return null;
    }

    console.log(`Processing node: ${nodeId}, type: ${node.type}`);
    let output = '';

    try {
      switch (node.type) {
        case 'aiAgent': {
          console.log('Processing AI Agent node:', node);
          const { apiKeyId, model } = node.data;
          
          // Generate the complete agent configuration including system prompt
          const agentConfig = generateAgentConfiguration({
            personality: node.data.personality || {},
            role: node.data.role || {},
            expertise: node.data.expertise || {}
          });

          console.log('Generated agent configuration:', {
            systemPrompt: agentConfig.systemPrompt,
            modelSettings: agentConfig.modelSettings
          });

          const messages = [
            { 
              role: 'system', 
              content: agentConfig.systemPrompt 
            },
            { 
              role: 'user', 
              content: input 
            }
          ];

          output = await callOpenAI(
            apiKeyId, 
            model, 
            messages, 
            agentConfig.modelSettings.temperature,
            1000 // Default max tokens, could be made configurable
          );
          
          onNodeChange(nodeId, { lastOutput: output });
          break;
        }

        case 'humanInteraction':
          console.log('Processing Human Interaction node:', node);
          onNodeChange(nodeId, { 
            waitingForInput: true, 
            lastInput: input,
            resolveInput: null
          });

          output = await new Promise((resolve) => {
            onNodeChange(nodeId, {
              waitingForInput: true,
              lastInput: input,
              resolveInput: (humanInput) => {
                console.log(`Received human input for node ${nodeId}:`, humanInput);
                onNodeChange(nodeId, {
                  waitingForInput: false,
                  lastOutput: humanInput,
                  resolveInput: null
                });
                resolve(humanInput);
              }
            });
          });
          break;

        case 'textInput':
          console.log('Processing Text Input node:', node);
          output = node.data.inputText || input;
          onNodeChange(nodeId, { 
            lastInput: input,
            lastOutput: output
          });
          break;

        case 'textOutput':
          console.log('Processing Text Output node:', node);
          output = input;
          onNodeChange(nodeId, { 
            text: input,
            lastOutput: input
          });
          break;

        default:
          console.warn(`Using default handling for node type: ${node.type}`);
          output = input;
      }

      // Process next nodes
      const nextEdges = edgesBySource[nodeId] || [];
      console.log(`Found ${nextEdges.length} next edges for node ${nodeId}`);
      
      for (const edge of nextEdges) {
        if (isExecutionStopped) break;
        console.log(`Processing edge from ${edge.source} to ${edge.target}`);
        await processNode(edge.target, output, visited);
      }

      return output;
    } catch (error) {
      console.error(`Error processing node ${nodeId}:`, error);
      onNodeChange(nodeId, { error: error.message });
      throw error;
    }
  };

  const startNode = findStartNode();
  if (!startNode) {
    throw new Error('No valid nodes found in the workflow');
  }

  console.log(`Starting workflow with node: ${startNode.id}`);
  await processNode(startNode.id, '', new Set());
};

export const stopWorkflowExecution = () => {
  console.log('Stopping workflow execution');
  isExecutionStopped = true;
};