// src/utils/workflowExecutionEngine.js
import { callOpenAI } from '../services/openaiService';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';

let isExecutionStopped = false;

// Helper function to process decisions using AI agents
const processDecision = async (agent, input, instruction) => {
  console.log('Processing decision with:', {
    agentName: agent.name,
    input,
    instruction,
    apiKeyId: agent.apiKeyId,
    model: agent.modelConfig?.model
  });

  const systemPrompt = `You are a decision-making AI agent. Your task is to: ${instruction}

  You MUST respond with ONLY valid JSON in this exact format:
  {
    "decision": "Yes" or "No",
    "explanation": "Brief explanation of your decision",
    "output": "Content to pass to the next node"
  }

  Input to analyze: ${input}

  Remember: Respond with ONLY the JSON, no other text.`;

  try {
    const response = await callOpenAI(
      agent.apiKeyId,
      agent.modelConfig?.model || 'gpt-4o',
      [
        { role: 'system', content: systemPrompt }
      ],
      0.3, // Lower temperature for more consistent decisions
      1000
    );

    console.log('Raw decision response:', response);

    try {
      const parsedDecision = JSON.parse(response);
      console.log('Parsed decision:', parsedDecision);
      return parsedDecision;
    } catch (error) {
      console.error('Failed to parse decision response:', error);
      throw new Error('Invalid decision format from AI - not valid JSON');
    }
  } catch (error) {
    console.error('Error in processDecision:', error);
    throw error;
  }
};

// Helper function to generate agent instructions
const generateAgentInstructions = (agentData, conversationMode = null) => {
  // Get base system instructions
  const baseInstructions = agentData.instructions?.isUsingCustom && agentData.instructions?.custom
    ? agentData.instructions.custom
    : generateAgentConfiguration({
        personality: agentData.personality || {},
        role: agentData.role || {},
        expertise: agentData.expertise || {}
      }).systemPrompt;

  // Add role context
  const roleContext = `You are acting as ${agentData.role?.type || 'an assistant'}.`;
  
  // Add conversation mode context if applicable
  const conversationContext = conversationMode 
    ? `\nYou are participating in a ${conversationMode} conversation with multiple agents.` 
    : '';
  
  // Add any custom context or modifiers
  const customContext = agentData.instructions?.additionalContext || '';
  
  // Combine all instructions
  return `${baseInstructions}\n\n${roleContext}${conversationContext}${customContext ? '\n\n' + customContext : ''}`;
};

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

  const processAgent = async (agent, messageHistory, customInstructions = '') => {
    try {
      if (!agent.apiKeyId) {
        throw new Error(`No API key configured for agent: ${agent.name}`);
      }

      const systemInstructions = generateAgentInstructions(agent);
      const fullInstructions = customInstructions 
        ? `${systemInstructions}\n\n${customInstructions}`
        : systemInstructions;

      const messages = [
        {
          role: 'system',
          content: fullInstructions
        },
        ...messageHistory
      ];

      return await callOpenAI(
        agent.apiKeyId,
        agent.modelConfig?.model || 'gpt-4o',
        messages,
        agent.modelConfig?.parameters?.temperature || 0.7,
        agent.modelConfig?.parameters?.maxTokens || 2048
      );
    } catch (error) {
      console.error(`Error processing agent ${agent.name}:`, error);
      throw error;
    }
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
  
    console.log('Processing node input:', {
      nodeId,
      nodeType: node.type,
      input,
      nodeData: node.data
    });
  
    let output = '';
  
    try {
      switch (node.type) {
        case 'aiAgent': {
          try {
            const apiKeyId = node.data?.apiKeyId || node.data?.modelConfig?.apiKeyId;
            if (!apiKeyId) {
              throw new Error(`No API key configured for AI Agent: ${node.data?.name || nodeId}`);
            }
  
            const systemInstructions = generateAgentInstructions(node.data);
            console.log('Making API call for AI agent:', {
              nodeId,
              apiKeyId,
              model: node.data?.modelConfig?.model,
              input
            });
  
            output = await callOpenAI(
              apiKeyId,
              node.data?.modelConfig?.model || 'gpt-4o',
              [
                { 
                  role: 'system', 
                  content: systemInstructions
                },
                { 
                  role: 'user', 
                  content: input 
                }
              ],
              node.data?.modelConfig?.parameters?.temperature || 0.7,
              node.data?.modelConfig?.parameters?.maxTokens || 2048
            );
  
            console.log('Received API response for AI agent:', {
              nodeId,
              outputLength: output?.length
            });
  
            onNodeChange(nodeId, { 
              lastOutput: output,
              lastInput: input,
              status: 'completed'
            });
          } catch (error) {
            console.error(`Error in AI agent processing:`, error);
            const errorMessage = error.message.includes('timeout')
              ? 'The AI model took too long to respond. Please try again.'
              : error.message;
            
            onNodeChange(nodeId, { 
              error: errorMessage,
              status: 'error'
            });
            throw new Error(errorMessage);
          }
          break;
        }
  
        case 'decision': {
          console.log('Processing Decision node - Full data:', {
            nodeId,
            input,
            nodeData: node.data,
            agent: node.data?.agent
          });
  
          const agent = node.data?.agent;
          if (!agent || !agent.apiKeyId) {
            console.error('Missing agent configuration:', agent);
            throw new Error(`No AI agent configured for decision node (${nodeId})`);
          }
  
          try {
            // Generate the decision using the configured AI agent
            const decision = await processDecision(
              agent,
              input || 'No input provided',
              node.data.decisionInstruction || 'Make a decision based on the input'
            );
  
            console.log('Decision received:', decision);
  
            // Update node state
            onNodeChange(nodeId, {
              lastInput: input,
              lastOutput: decision.output,
              lastDecision: decision,
              error: null
            });
  
            // Route to the appropriate output based on the decision
            const nextEdges = edges.filter(e => e.source === nodeId);
            console.log('Available edges for decision routing:', nextEdges);
  
            const targetEdge = nextEdges.find(e => {
              const isOutput1 = e.sourceHandle === 'output1' && decision.decision === 'Yes';
              const isOutput2 = e.sourceHandle === 'output2' && decision.decision === 'No';
              return isOutput1 || isOutput2;
            });
  
            if (targetEdge) {
              console.log('Routing decision to:', targetEdge);
              output = decision.output || input;  // Use original input if no output provided
              await processNode(targetEdge.target, output, visited);
            } else {
              console.warn('No matching edge found for decision:', {
                decision: decision.decision,
                availableEdges: nextEdges.map(e => ({
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  sourceHandle: e.sourceHandle
                }))
              });
            }
  
            return output;
          } catch (error) {
            console.error('Error in decision node:', error);
            onNodeChange(nodeId, { error: error.message });
            throw error;
          }
          break;
        }
  
        case 'textInput': {
          console.log('Processing Text Input node:', {
            nodeId,
            inputText: node.data?.inputText,
            text: node.data?.text,
            output: node.data?.output
          });
          
          // Use the first available value
          output = node.data?.output || 
                  node.data?.inputText || 
                  node.data?.text || 
                  input;
  
          onNodeChange(nodeId, { 
            lastInput: input,
            lastOutput: output,
            output: output,
            status: 'completed'
          });
          
          console.log('Text Input node output:', output);
          break;
        }
  
        case 'textOutput': {
          console.log('Processing Text Output node:', {
            nodeId,
            input,
            currentText: node.data?.text
          });
          
          output = input;
          onNodeChange(nodeId, { 
            text: input,
            lastInput: input,
            lastOutput: input,
            status: 'completed'
          });
          break;
        }
  
        case 'humanInteraction':
          console.log('Processing Human Interaction node:', {
            nodeId,
            input,
            nodeData: node.data
          });
          
          onNodeChange(nodeId, { 
            waitingForInput: true, 
            lastInput: input,
            resolveInput: null,
            status: 'waiting'
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
                  resolveInput: null,
                  status: 'completed'
                });
                resolve(humanInput);
              }
            });
          });
          break;
  
        case 'conversation': {
          console.log('Processing Conversation node:', {
            nodeId,
            input,
            mode: node.data?.mode,
            agents: node.data?.agents?.length
          });
  
          if (!node.data?.agents || node.data.agents.length === 0) {
            throw new Error('No agents configured for conversation node');
          }
  
          // Validate API keys for all AI agents
          const aiAgents = node.data.agents.filter(agent => agent.type === 'ai');
          const missingApiKeys = aiAgents.filter(agent => 
            !agent.apiKeyId && !agent.modelConfig?.apiKeyId
          );
          
          if (missingApiKeys.length > 0) {
            throw new Error(
              `Missing API keys for agents: ${missingApiKeys.map(a => a.name || a.id).join(', ')}`
            );
          }
  
          const conversationOutput = [];
          
          switch (node.data.mode) {
            case 'round-robin':
              for (const agent of aiAgents) {
                const agentResponse = await processAgent(agent, [{
                  role: 'user',
                  content: input
                }]);
                conversationOutput.push(agentResponse);
              }
              break;
  
            case 'moderated':
              if (aiAgents.length > 0) {
                const moderator = aiAgents[0];
                const participants = await processModeratorDecision(
                  moderator, 
                  input, 
                  node.data.agents
                );
                for (const participantId of participants) {
                  const agent = node.data.agents.find(a => a.id === participantId);
                  if (agent) {
                    const agentResponse = await processAgent(agent, [{
                      role: 'user',
                      content: input
                    }]);
                    conversationOutput.push(agentResponse);
                  }
                }
              }
              break;
  
            case 'free-form':
            default:
              await Promise.all(aiAgents.map(async agent => {
                const agentResponse = await processAgent(agent, [{
                  role: 'user',
                  content: input
                }]);
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
            ],
            status: 'completed'
          });
          break;
        }
  
        default:
          console.log(`Using default handling for node type: ${node.type}`);
          output = input;
          onNodeChange(nodeId, {
            lastInput: input,
            lastOutput: output,
            status: 'completed'
          });
      }
  
      // Process next nodes if not a decision node (decision nodes handle their own routing)
      if (node.type !== 'decision') {
        const nextEdges = edgesBySource[nodeId] || [];
        console.log(`Found ${nextEdges.length} next edges for node ${nodeId}`);
        
        for (const edge of nextEdges) {
          if (isExecutionStopped) break;
          console.log(`Processing edge from ${edge.source} to ${edge.target}`);
          await processNode(edge.target, output, visited);
        }
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

        const processModeratorDecision = async (moderator, input, availableAgents) => {
          const systemInstructions = `You are a conversation moderator. Your task is to review the input and decide which agents should participate in the response.

          Available agents: ${availableAgents.map(a => `${a.id} (${a.role?.type || 'Unknown Role'})`).join(', ')}

          Respond with a JSON array of agent IDs that should participate. For example:
          ["agent-1", "agent-3"]`;

          try {
            const response = await callOpenAI(
              moderator.apiKeyId,
              moderator.modelConfig?.model || 'gpt-4o',
              [
                { role: 'system', content: systemInstructions },
                { role: 'user', content: input }
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
          } catch (error) {
            console.error('Error in moderator decision:', error);
            return [];
          }
        };

        const processContext = async (contextInput, processingRules = []) => {
          try {
            if (!Array.isArray(contextInput)) {
              console.warn('Context input is not an array, returning as is');
              return contextInput;
            }

            let processedContext = [...contextInput];

            for (const rule of processingRules) {
              switch (rule.type) {
                case 'filter':
                  processedContext = processedContext.filter(rule.condition);
                  break;
                case 'transform':
                  processedContext = processedContext.map(rule.transform);
                  break;
                case 'summarize':
                  // Implement AI-based summarization if needed
                  break;
                default:
                  console.warn(`Unknown processing rule type: ${rule.type}`);
              }
            }

            return processedContext;
          } catch (error) {
            console.error('Error processing context:', error);
            return contextInput;
          }
        };

        const startNode = findStartNode();
        if (!startNode) {
          throw new Error('No valid nodes found in the workflow');
        }

        console.log(`Starting workflow with node: ${startNode.id}`);
        try {
          const result = await processNode(startNode.id, '', new Set());
          console.log('Workflow execution completed successfully');
          return result;
        } catch (error) {
          console.error('Workflow execution failed:', error);
          throw error;
        } finally {
          isExecutionStopped = false;
        }
        };

        export const stopWorkflowExecution = () => {
        console.log('Stopping workflow execution');
        isExecutionStopped = true;
        };

        // Helper function to validate node configuration
        export const validateNodeConfiguration = (node) => {
        if (!node) return false;

        switch (node.type) {
          case 'aiAgent':
            return !!(node.data?.modelConfig?.model && 
                      (node.data?.apiKeyId || node.data?.modelConfig?.apiKeyId));
          
          case 'decision':
            return !!(node.data?.agent?.apiKeyId && 
                      node.data?.decisionInstruction &&
                      node.data?.outputs?.output1 &&
                      node.data?.outputs?.output2);
          
          case 'humanInteraction':
            return true; // Human interaction nodes don't require special configuration
          
          case 'textInput':
            return true; // Text input nodes are always valid
          
          case 'textOutput':
            return true; // Text output nodes are always valid
          
          case 'contextProcessor':
            return true; // Context processor nodes don't require special configuration
          
          case 'conversation':
            if (!node.data?.agents || node.data.agents.length === 0) return false;
            return node.data.agents
              .filter(agent => agent.type === 'ai')
              .every(agent => !!(agent.apiKeyId || agent.modelConfig?.apiKeyId));
          
          default:
            return false;
        }
        };

        // Helper function to get node status
        export const getNodeStatus = (node) => {
        if (!node?.data) return 'unknown';

        if (node.data.error) return 'error';
        if (node.data.status) return node.data.status;
        if (node.data.waitingForInput) return 'waiting';
        if (node.data.lastOutput !== undefined) return 'completed';

        return 'pending';
        };

        // Helper function to check if a workflow is valid
        export const validateWorkflow = (nodes, edges) => {
        if (!nodes.length) return { valid: false, error: 'Workflow has no nodes' };

        // Check for invalid node configurations
        const invalidNodes = nodes.filter(node => !validateNodeConfiguration(node));
        if (invalidNodes.length > 0) {
          return { 
            valid: false, 
            error: `Invalid node configurations: ${invalidNodes.map(n => n.id).join(', ')}` 
          };
        }

        // Check for circular dependencies
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycle = (nodeId) => {
          visited.add(nodeId);
          recursionStack.add(nodeId);

          const outgoingEdges = edges.filter(e => e.source === nodeId);
          for (const edge of outgoingEdges) {
            if (!visited.has(edge.target)) {
              if (hasCycle(edge.target)) return true;
            } else if (recursionStack.has(edge.target)) {
              return true;
            }
          }

          recursionStack.delete(nodeId);
          return false;
        };

        const startNodes = nodes.filter(node => 
          !edges.some(edge => edge.target === node.id)
        );

        for (const startNode of startNodes) {
          if (hasCycle(startNode.id)) {
            return { valid: false, error: 'Workflow contains circular dependencies' };
          }
        }

        // Check for disconnected nodes
        const connectedNodes = new Set();
        const addConnectedNodes = (nodeId) => {
          connectedNodes.add(nodeId);
          edges
            .filter(e => e.source === nodeId)
            .forEach(e => {
              if (!connectedNodes.has(e.target)) {
                addConnectedNodes(e.target);
              }
            });
        };

        startNodes.forEach(node => addConnectedNodes(node.id));
        const disconnectedNodes = nodes.filter(node => !connectedNodes.has(node.id));

        if (disconnectedNodes.length > 0) {
          return { 
            valid: false, 
            error: `Disconnected nodes found: ${disconnectedNodes.map(n => n.id).join(', ')}` 
          };
        }

        return { valid: true };
        };

        export default {
        executeWorkflow,
        stopWorkflowExecution,
        validateNodeConfiguration,
        getNodeStatus,
        validateWorkflow
        };