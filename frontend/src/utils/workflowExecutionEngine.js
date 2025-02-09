// src/utils/workflowExecutionEngine.js
import { agentIdentityManager } from './agentIdentityManager';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import { callOpenAI } from '../services/openaiService';

const formatNodeOutput = (input) => {
  if (Array.isArray(input)) {
    return input.map(message => {
      if (typeof message === 'object') {
        return `${message.senderName || 'Unknown'}: ${message.content}`;
      }
      return message;
    }).join('\n\n');
  }
  
  if (typeof input === 'object') {
    if (input.content) {
      return `${input.senderName || 'Unknown'}: ${input.content}`;
    }
    return JSON.stringify(input, null, 2);
  }
  
  return String(input);
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

// Helper function to process distillation using AI agents
const processDistillation = async (agent, input, extractionFields) => {
  console.log('Processing distillation:', {
    agent: agent.name,
    inputLength: input.length,
    fieldCount: extractionFields.length
  });

  // Create field requirements string
  const fieldRequirements = extractionFields
    .map(field => `${field.label}${field.required ? ' (Required)' : ' (Optional)'}`)
    .join('\n- ');

  const systemPrompt = `
    Your task is to extract and structure key information from the input provided.
    Extract information for the following fields:
    - ${fieldRequirements}

    Provide your response in this format:
    {
      "fields": {
        // One entry per field, matching the exact field IDs provided
      },
      "confidence": {
        // Confidence score (0-1) for each field
      },
      "missing_required": [
        // List of any required fields that couldn't be found
      ],
      "summary": "Brief summary of extracted information"
    }

    Important:
    - Structure fields appropriately (arrays for lists, objects for complex data)
    - Assign confidence scores based on information clarity and completeness
    - Always include all specified fields in the response
    - Provide "null" for fields where no information could be found
  `;

  try {
    const response = await callOpenAI(
      agent.apiKeyId,
      agent.modelConfig?.model || 'gpt-4o',
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input }
      ],
      agent.modelConfig?.parameters?.temperature || 0.3,
      agent.modelConfig?.parameters?.maxTokens || 1000
    );

    console.log('Raw distillation response:', response);

    let parsed;
    try {
      parsed = typeof response === 'string' ? JSON.parse(response) : response;
    } catch (error) {
      console.error('Failed to parse distillation response:', error);
      throw new Error('Invalid response format from AI');
    }

    if (!parsed.fields || !parsed.confidence) {
      throw new Error('Invalid response structure from AI');
    }

    return parsed;
  } catch (error) {
    console.error('Error in distillation processing:', error);
    throw error;
  }
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
      console.log(`Node ${nodeId} not found in nodeMap`);
      console.log('Available nodes:', Array.from(nodeMap.keys()));
      return null;
    }
  
    console.log('Starting node processing:', {
      nodeId,
      nodeType: node.type,
      input,
      inputType: typeof input,
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
            throw error;
          }
          break;
        }
  
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
  
          // Add user message to conversation
          const userMessage = {
            id: Date.now(),
            senderId: 'user',
            senderName: 'User',
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
          };
  
          const conversationMessages = [
            ...(node.data.messages || []),
            userMessage
          ];
  
          const aiAgents = node.data.agents.filter(agent => agent.type === 'ai');
          const missingApiKeys = aiAgents.filter(agent => 
            !agent.apiKeyId && !agent.modelConfig?.apiKeyId
          );
          
          if (missingApiKeys.length > 0) {
            throw new Error(
              `Missing API keys for agents: ${missingApiKeys.map(a => a.name || a.id).join(', ')}`
            );
          }
  
          // Process responses from all AI agents
          const agentResponses = await Promise.all(
            aiAgents.map(agent => processAgent(agent, [userMessage]))
          );
  
          // Add agent responses to conversation
          conversationMessages.push(...agentResponses);
  
          // Format the conversation output
          const formattedOutput = [
            `User: ${input}`,
            ...agentResponses.map(response => `${response.senderName}: ${response.content}`)
          ].join('\n\n');
  
          console.log('Formatted conversation output:', formattedOutput);
  
          // Update node state
          onNodeChange(nodeId, {
            messages: conversationMessages,
            lastInput: input,
            lastOutput: formattedOutput,
            status: 'completed'
          });
  
          output = formattedOutput;
          break;
        }
  
        case 'textOutput': {
          console.log('Processing Text Output node:', {
            nodeId,
            input,
            inputType: typeof input,
            currentText: node.data?.text
          });
          
          let formattedText;
          if (Array.isArray(input)) {
            formattedText = input.map(msg => {
              if (typeof msg === 'object') {
                return `${msg.senderName}: ${msg.content}`;
              }
              return msg;
            }).join('\n\n');
          } else if (typeof input === 'object') {
            formattedText = input.content || JSON.stringify(input, null, 2);
          } else {
            formattedText = String(input || '');
          }
  
          console.log('Formatted text for output node:', {
            nodeId,
            formattedText,
            length: formattedText.length
          });
          
          output = formattedText;
          onNodeChange(nodeId, { 
            text: formattedText,
            lastInput: input,
            lastOutput: formattedText,
            status: 'completed'
          });
  
          console.log('Text Output node state updated:', {
            nodeId,
            text: formattedText,
            status: 'completed'
          });
          break;
        }
  
        case 'textInput': {
          console.log('Processing Text Input node:', {
            nodeId,
            inputText: node.data?.inputText,
            text: node.data?.text,
            output: node.data?.output
          });
          
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
          break;
        }
  
        case 'humanInteraction': {
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
  
      // Process next nodes if not a decision node
      if (node.type !== 'decision') {
        const nextEdges = edgesBySource[nodeId] || [];
        console.log(`Looking for next edges:`, {
          nodeId,
          edgeCount: nextEdges.length,
          edges: nextEdges
        });
        
        for (const edge of nextEdges) {
          if (isExecutionStopped) break;
          console.log(`Processing edge:`, {
            from: edge.source,
            to: edge.target,
            output
          });
          await processNode(edge.target, output, visited);
        }
      }
  
      console.log('Node processing complete:', {
        nodeId,
        nodeType: node.type,
        outputType: typeof output,
        outputLength: typeof output === 'string' ? output.length : 'N/A'
      });
  
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

const processAgent = async (agent, messages, workflowId) => {
  try {
    if (!agent.apiKeyId) {
      throw new Error(`No API key configured for agent: ${agent.name}`);
    }

    console.log('Agent configuration:', {
      name: agent.name,
      role: agent.role,
      type: agent.type,
      apiKeyId: agent.apiKeyId
    });

    // Generate base configuration
    const baseConfig = generateAgentConfiguration({
      personality: agent.personality || {},
      role: agent.role || {},
      expertise: agent.expertise || {}
    });

    // Create system prompt
    const systemPrompt = `${baseConfig.systemPrompt}\nYou are ${agent.name}, an AI assistant.`;

    // Prepare messages
    const contextualizedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        name: msg.senderName
      }))
    ];

    const response = await callOpenAI(
      agent.apiKeyId,
      agent.modelConfig?.model || 'gpt-4o',
      contextualizedMessages,
      agent.modelConfig?.parameters?.temperature || 0.7,
      agent.modelConfig?.parameters?.maxTokens || 2048
    );

    // Create structured response
    const messageResponse = {
      id: Date.now(),
      senderId: agent.id,
      senderName: agent.name,
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    };

    console.log('Agent response:', messageResponse);

    return messageResponse;
  } catch (error) {
    console.error(`Error processing agent ${agent.name}:`, error);
    throw error;
  }
};

const processModeratorDecision = async (moderator, input, availableAgents) => {
  try {
    const response = await callOpenAI(
      moderator.apiKeyId,
      moderator.modelConfig?.model || 'gpt-3.5-turbo',
      [
        {
          role: 'system',
          content: `You are a conversation moderator. Review the context and decide which agents should respond.
          Available agents: ${availableAgents.map(a => `${a.id} (${a.role?.type || 'Unknown Role'})`).join(', ')}.
          Respond with a JSON array of agent IDs that should participate.`
        },
        ...messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ],
      0.3,
      100
    );

    try {
      return JSON.parse(response);
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Error in moderator decision:', error);
    return [];
  }
};

export default {
  executeWorkflow,
  stopWorkflowExecution
};