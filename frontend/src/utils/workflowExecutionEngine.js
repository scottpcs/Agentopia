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
          console.log('Processing Decision node:', {
            nodeId,
            input,
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
                availableEdges: nextEdges
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

        case 'distill': {
          console.log('Processing Distill node:', {
            nodeId,
            input,
            agent: node.data?.agent,
            fields: node.data?.extractionFields
          });

          const agent = node.data?.agent;
          if (!agent || !agent.apiKeyId) {
            console.error('Missing agent configuration:', agent);
            throw new Error(`No AI agent configured for distill node (${nodeId})`);
          }

          try {
            const result = await processDistillation(
              agent,
              input,
              node.data.extractionFields || []
            );

            console.log('Distillation result:', result);

            // Update node state
            onNodeChange(nodeId, {
              lastInput: input,
              lastOutput: result.fields,
              summary: result.summary,
              lastDistillation: result,
              error: null
            });

            // Route different outputs based on handle
            const nextEdges = edges.filter(e => e.source === nodeId);
            for (const edge of nextEdges) {
              if (edge.sourceHandle === 'structured') {
                await processNode(edge.target, JSON.stringify(result.fields, null, 2), visited);
              } else if (edge.sourceHandle === 'summary') {
                await processNode(edge.target, result.summary, visited);
              }
            }

            return result;
          } catch (error) {
            console.error('Error in distill node:', error);
            onNodeChange(nodeId, { error: error.message });
            throw error;
          }
          break;
        }
        
        case 'timing': {
          console.log('Processing Timing node:', {
            nodeId,
            config: node.data?.config,
            input
          });
        
          const {
            mode = 'delay',
            duration = 60000,
            conditions = [],
            resetOnActivity = false,
            cancelOnTimeout = false
          } = node.data?.config || {};
        
          try {
            // Update node state to running
            onNodeChange(nodeId, {
              status: 'running',
              lastInput: input,
              startTime: Date.now()
            });
        
            output = await new Promise((resolve, reject) => {
              let timeoutId;
              let conditionsMet = new Set();
              let isTimedOut = false;
        
              // Set up timeout
              timeoutId = setTimeout(() => {
                isTimedOut = true;
                if (mode === 'coordination' && conditionsMet.size < conditions.length) {
                  onNodeChange(nodeId, {
                    status: 'timeout',
                    lastOutput: {
                      type: 'timeout',
                      metConditions: Array.from(conditionsMet),
                      timestamp: Date.now()
                    }
                  });
                  resolve({
                    type: 'timeout',
                    output: input,
                    metConditions: Array.from(conditionsMet)
                  });
                } else if (mode === 'delay') {
                  onNodeChange(nodeId, {
                    status: 'completed',
                    lastOutput: input
                  });
                  resolve({ type: 'complete', output: input });
                } else {
                  onNodeChange(nodeId, {
                    status: 'timeout',
                    lastOutput: {
                      type: 'timeout',
                      timestamp: Date.now()
                    }
                  });
                  resolve({ type: 'timeout', output: input });
                }
              }, duration);
        
              // Set up event listeners for coordination and watchdog modes
              if (mode === 'coordination' || mode === 'watchdog') {
                const handleTimingEvent = (event) => {
                  if (isTimedOut) return;
        
                  if (mode === 'watchdog' && event.type === 'activity') {
                    if (resetOnActivity) {
                      clearTimeout(timeoutId);
                      timeoutId = setTimeout(() => {
                        onNodeChange(nodeId, {
                          status: 'timeout',
                          lastOutput: {
                            type: 'timeout',
                            timestamp: Date.now()
                          }
                        });
                        resolve({ type: 'timeout', output: input });
                      }, duration);
                    }
                  } else if (mode === 'coordination' && event.type === 'condition') {
                    conditionsMet.add(event.conditionId);
                    
                    onNodeChange(nodeId, {
                      conditionsMet: Array.from(conditionsMet)
                    });
        
                    if (conditions.every(c => conditionsMet.has(c))) {
                      clearTimeout(timeoutId);
                      onNodeChange(nodeId, {
                        status: 'completed',
                        lastOutput: {
                          type: 'complete',
                          metConditions: Array.from(conditionsMet),
                          timestamp: Date.now()
                        }
                      });
                      resolve({ type: 'complete', output: input });
                    }
                  }
                };
        
                eventSystem.on('timing', handleTimingEvent);
                return () => eventSystem.off('timing', handleTimingEvent);
              }
            });
        
            // Route output based on timing result
            if (output.type === 'timeout') {
              const timeoutEdges = edges.filter(e => 
                e.source === nodeId && e.sourceHandle === 'timeout'
              );
              for (const edge of timeoutEdges) {
                await processNode(edge.target, output.output, visited);
              }
            } else {
              const completeEdges = edges.filter(e => 
                e.source === nodeId && e.sourceHandle === 'complete'
              );
              for (const edge of completeEdges) {
                await processNode(edge.target, output.output, visited);
              }
            }
        
            return output.output;
          } catch (error) {
            console.error('Error in timing node:', error);
            onNodeChange(nodeId, { 
              error: error.message,
              status: 'error'
            });
            throw error;
          }
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

const processAgent = async (agent, messages) => {
  try {
    if (!agent.apiKeyId) {
      throw new Error(`No API key configured for agent: ${agent.name}`);
    }

    // Generate instructions based on agent configuration
    const baseConfig = generateAgentConfiguration({
      personality: agent.personality || {},
      role: agent.role || {},
      expertise: agent.expertise || {}
    });

    const response = await callOpenAI(
      agent.apiKeyId,
      agent.modelConfig?.model || 'gpt-4o',
      [
        { role: 'system', content: baseConfig.systemPrompt },
        ...messages
      ],
      agent.modelConfig?.parameters?.temperature || 0.7,
      agent.modelConfig?.parameters?.maxTokens || 2048
    );

    return response;
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