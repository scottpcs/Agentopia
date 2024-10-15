import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom component imports
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import AgentNodeComponent from './components/AgentNodeComponent';
import TextInputNode from './components/TextInputNode';
import TextOutputNode from './components/TextOutputNode';
import HumanInteractionNode from './components/HumanInteractionNode';
import ContextProcessorNode from './components/ContextProcessorNode';
import PropertyPanel from './components/PropertyPanel';
import InteractionPanel from './components/InteractionPanel';
import WorkspaceManager from './components/WorkspaceManager';
import CredentialManager from './components/CredentialManager';

// Service imports
import { callOpenAI } from './services/openaiService';

// Styles
import './App.css';

// Node Type Definitions
const nodeTypes = {
  aiAgent: AgentNodeComponent,
  humanAgent: AgentNodeComponent,
  textInput: TextInputNode,
  textOutput: TextOutputNode,
  humanInteraction: HumanInteractionNode,
  contextProcessor: ContextProcessorNode,
};

const AiWorkflowPOC = () => {
  // State Declarations
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [workspace, setWorkspace] = useState('');
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [savedWorkflows, setSavedWorkflows] = useState([]);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showCredentialManager, setShowCredentialManager] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [interactionMode, setInteractionMode] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Effect Hooks
  useEffect(() => {
    const storedWorkspaces = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]');
    setRecentWorkspaces(storedWorkspaces);
    fetchWorkflows();
  }, []);

  useEffect(() => {
    const reactFlowElement = reactFlowWrapper.current;
    if (reactFlowElement) {
      const preventDefault = (e) => {
        e.preventDefault();
      };

      const addPassiveListener = (element, eventName) => {
        element.addEventListener(eventName, preventDefault, { passive: true });
      };

      addPassiveListener(reactFlowElement, 'touchstart');
      addPassiveListener(reactFlowElement, 'touchmove');

      return () => {
        reactFlowElement.removeEventListener('touchstart', preventDefault);
        reactFlowElement.removeEventListener('touchmove', preventDefault);
      };
    }
  }, []);

  // Callback Functions
  const onConnect = useCallback((params) => {
    if (params.sourceHandle === 'contextOutput' || params.targetHandle === 'contextInput') {
      setEdges((eds) => addEdge({
        ...params,
        style: { stroke: '#ff0072' },
      }, eds));
    } else {
      setEdges((eds) => addEdge(params, eds));
    }
  }, [setEdges]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onAddNode = useCallback((nodeType) => {
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.project({
      x: Math.random() * window.innerWidth - 100,
      y: Math.random() * window.innerHeight,
    });

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: { label: `New ${nodeType} Node` },
    };

    switch (nodeType) {
      case 'aiAgent':
        newNode.data = {
          ...newNode.data,
          name: `New AI Agent`,
          agentType: 'ai',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 150,
          apiKeyId: null,
          systemInstructions: 'You are a helpful assistant.',
          customInstructions: '',
          context: [],
        };
        break;
      case 'humanAgent':
        newNode.data = {
          ...newNode.data,
          name: `New Human Agent`,
          agentType: 'human',
          role: 'Human Assistant',
          context: [],
        };
        break;
      case 'textInput':
        newNode.data = {
          ...newNode.data,
          inputText: '',
        };
        break;
      case 'textOutput':
        newNode.data = {
          ...newNode.data,
          text: '',
        };
        break;
      case 'humanInteraction':
        newNode.data = {
          ...newNode.data,
          name: `Human ${Date.now().toString().slice(-4)}`,
          ref: React.createRef(),
        };
        break;
      case 'contextProcessor':
        newNode.data = {
          ...newNode.data,
          label: 'Context Processor',
        };
        break;
    }

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const onNodeChange = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
              onChange: onNodeChange,
              onContextOutput: (id, context) => {
                console.log(`Context output from node ${id}:`, context);
                const contextEdges = edges.filter(e => e.source === id && e.sourceHandle === 'contextOutput');
                contextEdges.forEach(edge => {
                  onNodeChange(edge.target, { contextInput: context });
                });
              },
            },
          };
        }
        return node;
      })
    );
    setSelectedNode((prev) => {
      if (prev && prev.id === nodeId) {
        return {
          ...prev,
          data: {
            ...prev.data,
            ...newData,
          },
        };
      }
      return prev;
    });
  }, [setNodes, edges]);

  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((edge) => 
        !deleted.some((node) => node.id === edge.source || node.id === edge.target)
      ));
      setSelectedNode(null);
      setInteractionMode(null);
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((edge) => !deleted.includes(edge)));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON') {
      return;
    }
    setSelectedNode(node);
    setInteractionMode('interact');
  }, []);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNode(node);
    setInteractionMode('properties');
  }, []);

  const onPanelClose = useCallback(() => {
    setSelectedNode(null);
    setInteractionMode(null);
  }, []);

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setInteractionMode(null);
  }, []);

  // Workflow Management Functions
  const fetchWorkflows = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/workflows');
      if (!response.ok) throw new Error('Failed to fetch workflows');
      const workflows = await response.json();
      setSavedWorkflows(workflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      setErrorMessage('Failed to fetch workflows');
    }
  }, []);

  const onSave = useCallback(async () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      const name = prompt('Enter a name for this workflow:');
      if (!name) return;

      try {
        const response = await fetch('http://localhost:3000/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, data: flow }),
        });

        if (!response.ok) throw new Error('Failed to save workflow');
        
        console.log('Workflow saved successfully');
        fetchWorkflows();
      } catch (error) {
        console.error('Error saving workflow:', error);
        setErrorMessage('Failed to save workflow');
      }
    }
  }, [reactFlowInstance, fetchWorkflows]);

  const onLoad = useCallback(async (name) => {
    try {
      const response = await fetch(`http://localhost:3000/api/workflows/${name}`);
      if (!response.ok) throw new Error('Failed to load workflow');
      const flow = await response.json();
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      console.log('Workflow loaded successfully');
    } catch (error) {
      console.error('Error loading workflow:', error);
      setErrorMessage('Failed to load workflow');
    }
  }, [setNodes, setEdges]);

  const onDownload = useCallback(async (name) => {
    try {
      window.open(`http://localhost:3000/api/workflows/${name}/download`);
    } catch (error) {
      console.error('Error downloading workflow:', error);
      setErrorMessage('Failed to download workflow');
    }
  }, []);

  // Workspace Management
  const onSetWorkspace = useCallback((workspacePath) => {
    setWorkspace(workspacePath);
    setShowWorkspaceManager(false);
    
    const updatedWorkspaces = [workspacePath, ...recentWorkspaces.filter(w => w !== workspacePath)].slice(0, 5);
    setRecentWorkspaces(updatedWorkspaces);
    localStorage.setItem('recentWorkspaces', JSON.stringify(updatedWorkspaces));
    
    console.log(`Workspace set to: ${workspacePath}`);
  }, [recentWorkspaces]);

  // Workflow Execution
  const executeWorkflow = useCallback(async () => {
    setIsExecuting(true);
    setErrorMessage('');
    setShouldStop(false);

    const executionPromises = [];

    const executeNode = async (nodeId, input = '', context = []) => {
      if (shouldStop) {
        console.log('Execution stopped');
        return null;
      }

      const node = nodes.find(n => n.id === nodeId);
      if (!node) {
        console.log(`Node ${nodeId} not found`);
        return null;
      }

      console.log(`Executing node: ${nodeId}, Input:`, input);
      console.log(`Node ${nodeId} data:`, node.data);

      let output = '';

      switch (node.type) {
        case 'aiAgent':
          const { 
            apiKeyId, 
            model, 
            temperature,
            maxTokens,
            systemInstructions,
            customInstructions,
            name
          } = node.data;
          const messages = [
            { role: 'system', content: systemInstructions || 'You are a helpful assistant.' },
            ...context,
            { role: 'user', content: customInstructions || '' },
            { role: 'user', content: input }
          ];
          console.log(`Calling OpenAI for node ${nodeId} with:`, { apiKeyId, model, messages, temperature, maxTokens });
          try {
            output = await callOpenAI(
              apiKeyId, 
              model, 
              messages, 
              temperature, 
              maxTokens
            );
            console.log(`OpenAI response for node ${nodeId}:`, output);
            // When sending the output to the next node (if it's a HumanInteractionNode), include the agent's name
            const nextNode = nodes.find(n => edges.some(e => e.source === nodeId && e.target === n.id));
            if (nextNode && nextNode.type === 'humanInteraction') {
              nextNode.data.ref.current.handleReceive(output, name || 'AI Agent');
            }
          } catch (error) {
            console.error(`Error calling OpenAI for node ${nodeId}:`, error);
            setErrorMessage(`Error calling OpenAI API for node ${nodeId}: ${error.message}`);
            output = `Error: ${error.message}`;
          }
          break;
        case 'humanInteraction':
          const mergedContext = [...(node.data.contextInput || []), ...context];
          onNodeChange(nodeId, { contextInput: mergedContext });
          
          if (input) {
            node.data.ref.current.handleReceive(input, 'System');
          }
          output = await new Promise(resolve => {
            const handleSend = (nodeId, message, updatedContext) => {
              console.log(`Human interaction node ${nodeId} sent message:`, message);
              resolve({ message, context: updatedContext });
            };
            onNodeChange(nodeId, { 
              onSend: handleSend,
              onContextOutput: (id, updatedContext) => {
                const contextEdges = edges.filter(e => e.source === id && e.sourceHandle === 'contextOutput');
                contextEdges.forEach(edge => {
                  onNodeChange(edge.target, { contextInput: updatedContext });
                });
              }
            });
          });
          console.log(`Human interaction node ${nodeId} output:`, output);
          break;
        case 'textInput':
          output = node.data.inputText || '';
          console.log(`TextInput node ${nodeId} output:`, output);
          break;
        case 'textOutput':
          if (Array.isArray(input)) {
            output = input.map(msg => `${msg.role}: ${msg.content}`).join('\n');
          } else {
            output = input;
          }
          console.log(`TextOutput node ${nodeId} setting text to:`, output);
          onNodeChange(nodeId, { text: output });
          break;
        case 'contextProcessor':
          output = { context: context };
          break;
        default:
          console.log(`Unhandled node type: ${node.type}`);
      }

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        const nextNodeId = edge.target;
        if (edge.sourceHandle === 'contextOutput' || edge.targetHandle === 'contextInput') {
          executionPromises.push(executeNode(nextNodeId, '', output.context || context));
        } else {
          executionPromises.push(executeNode(nextNodeId, output.message || output, output.context || context));
        }
      }

      return output;
    };

    try {
      const startNodes = nodes.filter(node => node.type === 'textInput' || node.type === 'humanInteraction');
      for (const startNode of startNodes) {
        console.log(`Starting execution from node: ${startNode.id}`);
        executionPromises.push(executeNode(startNode.id));
      }

      await Promise.all(executionPromises);
      console.log('Workflow execution completed');
    } catch (error) {
      console.error('Error executing workflow:', error);
      setErrorMessage(`Error executing workflow: ${error.message}`);
    } finally {
      setIsExecuting(false);
      setShouldStop(false);
    }
  }, [nodes, edges, onNodeChange, shouldStop]);

  const stopExecution = useCallback(() => {
    console.log('Stopping execution...');
    setShouldStop(true);
    setIsExecuting(false);
  }, []);

  // Render
  return (
    <div className="app-container">
      <MenuBar 
        onSave={onSave}
        onLoad={onLoad}
        onDownload={onDownload}
        savedWorkflows={savedWorkflows}
        currentWorkspace={workspace}
        onSetWorkspace={() => setShowWorkspaceManager(true)}
        onExecuteWorkflow={executeWorkflow}
        onStopExecution={stopExecution}
        isExecuting={isExecuting}
        onShowCredentialManager={() => setShowCredentialManager(true)}
      />
      {showWorkspaceManager && (
        <WorkspaceManager 
          onSetWorkspace={onSetWorkspace}
          recentWorkspaces={recentWorkspaces}
          onSelectRecentWorkspace={onSetWorkspace}
          onClose={() => setShowWorkspaceManager(false)}
        />
      )}
      {showCredentialManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <CredentialManager 
            onClose={() => setShowCredentialManager(false)}
          />
        </div>
      )}
      {errorMessage && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{errorMessage}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" onClick={() => setErrorMessage('')}>
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}
      <div className="main-content">
        <Toolbar onAddNode={onAddNode} />
        <div className="reactflow-wrapper" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            nodeTypes={nodeTypes}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onBackgroundClick}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
        {selectedNode && interactionMode === 'properties' && (
          <PropertyPanel
            node={selectedNode}
            onChange={onNodeChange}
            onClose={() => {
              setSelectedNode(null);
              setInteractionMode(null);
            }}
          />
        )}
        {selectedNode && interactionMode === 'interact' && (
          <InteractionPanel
            node={selectedNode}
            onChange={onNodeChange}
            onClose={() => {
              setSelectedNode(null);
              setInteractionMode(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AiWorkflowPOC;