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
          console.log('Processing AI Agent node:', {
            nodeId,
            model: node.data.modelConfig?.model,
            apiKeyId: node.data.apiKeyId
          });

          if (!node.data.apiKeyId) {
            throw new Error(`No API key configured for AI Agent: ${node.data.name || nodeId}`);
          }

          const agentConfig = generateAgentConfiguration({
            personality: node.data.personality || {},
            role: node.data.role || {},
            expertise: node.data.expertise || {}
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
            node.data.apiKeyId,
            node.data.modelConfig?.model || 'gpt-4o',
            messages,
            node.data.modelConfig?.parameters?.temperature || agentConfig.modelSettings.temperature,
            node.data.modelConfig?.parameters?.maxTokens || agentConfig.modelSettings.maxTokens,
            node.data.instructions
          );
          
          onNodeChange(nodeId, { 
            lastOutput: output,
            lastInput: input,
            context: messages.concat([{ role: 'assistant', content: output }])
          });
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

        case 'conversation': {
          console.log('Processing Conversation node:', {
            nodeId,
            mode: node.data.mode,
            agents: node.data.agents?.length,
            apiKeyId: node.data.apiKeyId
          });

          if (!node.data.agents || node.data.agents.length === 0) {
            throw new Error('No agents configured for conversation node');
          }

          // Validate API keys for all agents
          const missingApiKeys = node.data.agents.filter(agent => !agent.apiKeyId);
          if (missingApiKeys.length > 0) {
            throw new Error(`Missing API keys for agents: ${missingApiKeys.map(a => a.name || a.id).join(', ')}`);
          }

          const conversationOutput = [];
          
          switch (node.data.mode) {
            case 'round-robin':
              for (const agent of node.data.agents) {
                const agentResponse = await processAgent(agent, input, conversationOutput);
                conversationOutput.push(agentResponse);
              }
              break;

            case 'moderated':
              if (node.data.agents.length > 0) {
                const moderator = node.data.agents[0];
                if (!moderator.apiKeyId) {
                  throw new Error('Moderator agent requires an API key');
                }
                const participants = await getParticipantsFromModerator(
                  moderator, 
                  input,
                  node.data.agents
                );
                for (const participantId of participants) {
                  const agent = node.data.agents.find(a => a.id === participantId);
                  if (agent) {
                    const agentResponse = await processAgent(agent, input, conversationOutput);
                    conversationOutput.push(agentResponse);
                  }
                }
              }
              break;

            case 'free-form':
            default:
              await Promise.all(node.data.agents.map(async agent => {
                if (!agent.apiKeyId) {
                  throw new Error(`Agent ${agent.name || agent.id} requires an API key`);
                }
                const agentResponse = await processAgent(agent, input, conversationOutput);
                conversationOutput.push(agentResponse);
              }));
              break;
          }

          output = conversationOutput.join('\n\n');
          onNodeChange(nodeId, {
            lastOutput: output,
            lastInput: input,
            messages: [
              ...node.data.messages || [],
              { role: 'user', content: input },
              ...conversationOutput.map(response => ({
                role: 'assistant',
                content: response
              }))
            ]
          });
          break;
        }

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
      onNodeChange(nodeId, { 
        error: error.message,
        status: 'error'
      });
      throw error;
    }
  };

  const processAgent = async (agent, input, conversationHistory) => {
    console.log('Processing agent:', {
      agentId: agent.id,
      name: agent.name,
      apiKeyId: agent.apiKeyId,
      model: agent.modelConfig?.model
    });

    if (!agent.apiKeyId) {
      throw new Error(`No API key configured for agent: ${agent.name}`);
    }

    const agentConfig = generateAgentConfiguration({
      personality: agent.personality || {},
      role: agent.role || {},
      expertise: agent.expertise || {}
    });

    const messages = [
      {
        role: 'system',
        content: agentConfig.systemPrompt
      },
      ...conversationHistory.map(msg => ({
        role: 'assistant',
        content: msg
      })),
      {
        role: 'user',
        content: input
      }
    ];

    return await callOpenAI(
      agent.apiKeyId,
      agent.modelConfig?.model || 'gpt-4o',
      messages,
      agent.modelConfig?.parameters?.temperature || agentConfig.modelSettings.temperature,
      agent.modelConfig?.parameters?.maxTokens || agentConfig.modelSettings.maxTokens,
      agent.instructions
    );
  };

  const getParticipantsFromModerator = async (moderator, input, availableAgents) => {
    const moderatorConfig = generateAgentConfiguration({
      personality: moderator.personality || {},
      role: moderator.role || {},
      expertise: moderator.expertise || {}
    });

    const response = await callOpenAI(
      moderator.apiKeyId,
      moderator.modelConfig?.model || 'gpt-4o',
      [
        {
          role: 'system',
          content: `${moderatorConfig.systemPrompt}\n\nYou are the moderator of this conversation. Review the context and decide which agents should respond. Available agents: ${availableAgents.map(a => `${a.id} (${a.role?.type || 'Unknown Role'})`).join(', ')}\n\nRespond with a JSON array of agent IDs that should participate.`
        },
        {
          role: 'user',
          content: input
        }
      ],
      0.3, // Lower temperature for more consistent moderation
      100  // Short response needed
    );

    try {
      return JSON.parse(response);
    } catch (error) {
      console.warn('Failed to parse moderator response:', response);
      return [];
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