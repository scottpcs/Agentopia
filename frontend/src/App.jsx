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
import AgentNode from './components/AgentNode';
import TextInputNode from './components/TextInputNode';
import TextOutputNode from './components/TextOutputNode';
import PropertyPanel from './components/PropertyPanel';
import WorkspaceManager from './components/WorkspaceManager';
import CredentialManager from './components/CredentialManager';

// Service imports
import { callOpenAI } from './services/openaiService';

// Styles
import './App.css';

// Node Type Definitions
const nodeTypes = {
  agent: AgentNode,
  textInput: TextInputNode,
  textOutput: TextOutputNode,
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Effect Hooks
  useEffect(() => {
    const storedWorkspaces = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]');
    setRecentWorkspaces(storedWorkspaces);
    fetchWorkflows();
  }, []);

  // Callback Functions
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onAddNode = useCallback((nodeType) => {
    if (!reactFlowInstance) return;

    const position = reactFlowInstance.project({
      x: Math.random() * window.innerWidth / 2,
      y: Math.random() * window.innerHeight / 2,
    });

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: { label: `New ${nodeType} Node` },
    };

    if (nodeType === 'agent') {
      newNode.data = {
        ...newNode.data,
        model: 'gpt-3.5-turbo',
        systemMessage: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 150,
        apiKeyId: null,
        customInstructions: '',
      };
    } else if (nodeType === 'textInput') {
      newNode.data = {
        ...newNode.data,
        inputText: '',
      };
    } else if (nodeType === 'textOutput') {
      newNode.data = {
        ...newNode.data,
        text: '',
      };
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

    // Force a re-render of the nodes
    setNodes((nds) => [...nds]);
  }, [setNodes]);

  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((edge) => 
        !deleted.some((node) => node.id === edge.source || node.id === edge.target)
      ));
      setSelectedNode(null);
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((edge) => !deleted.includes(edge)));
    },
    [setEdges]
  );

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
        fetchWorkflows(); // Refresh the list of workflows
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

  // Node Interaction
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPanelClose = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Workflow Execution
  const executeWorkflow = useCallback(async () => {
    setIsExecuting(true);
    setErrorMessage('');
    const nodesCopy = [...nodes];
    const edgesCopy = [...edges];

    console.log('Starting workflow execution');
    console.log('All nodes:', nodesCopy);
    console.log('All edges:', edgesCopy);

    const executedNodes = new Set();
    const nodeOutputs = new Map();

    const executeNode = async (nodeId) => {
      console.log(`Executing node: ${nodeId}`);
      if (executedNodes.has(nodeId)) {
        console.log(`Node ${nodeId} already executed, returning cached output`);
        return nodeOutputs.get(nodeId);
      }

      const node = nodesCopy.find(n => n.id === nodeId);
      if (!node) {
        console.log(`Node ${nodeId} not found`);
        return null;
      }

      console.log(`Node ${nodeId} data:`, node.data);

      let inputText = '';

      // Gather inputs from all incoming edges
      const incomingEdges = edgesCopy.filter(e => e.target === nodeId);
      console.log(`Incoming edges for node ${nodeId}:`, incomingEdges);
      for (const edge of incomingEdges) {
        console.log(`Processing edge: ${edge.source} -> ${edge.target}`);
        const sourceOutput = await executeNode(edge.source);
        console.log(`Output from source node ${edge.source}:`, sourceOutput);
        inputText += sourceOutput ? sourceOutput + ' ' : '';
      }
      console.log(`Combined input for node ${nodeId}:`, inputText);

      let output = '';

      switch (node.type) {
        case 'textInput':
          output = node.data.inputText || '';
          console.log(`TextInput node ${nodeId} output:`, output);
          break;
        case 'agent':
          const { 
            apiKeyId, 
            model, 
            systemMessage, 
            temperature,
            maxTokens,
            customInstructions 
          } = node.data;
          console.log(`Agent node ${nodeId} data:`, { apiKeyId, model, systemMessage, temperature, maxTokens, customInstructions });
          const messages = [
            { role: 'system', content: systemMessage || 'You are a helpful assistant.' },
            { role: 'user', content: inputText }
          ];
          console.log(`Calling OpenAI for node ${nodeId} with:`, { 
            apiKeyId, 
            model, 
            messages, 
            temperature, 
            maxTokens, 
            customInstructions 
          });

          try {
            output = await callOpenAI(
              apiKeyId, 
              model, 
              messages, 
              temperature, 
              maxTokens, 
              customInstructions
            );
            console.log(`OpenAI response for node ${nodeId}:`, output);
          } catch (error) {
            console.error(`Error calling OpenAI for node ${nodeId}:`, error);
            setErrorMessage(`Error calling OpenAI API for node ${nodeId}: ${error.message}`);
            output = `Error: ${error.message}`;
          }
          break;
        case 'textOutput':
          output = inputText;
          console.log(`TextOutput node ${nodeId} setting text to:`, output);
          setNodes(prevNodes => prevNodes.map(n => 
            n.id === nodeId ? { ...n, data: { ...n.data, text: inputText } } : n
          ));
          break;
        default:
          console.log(`Unhandled node type: ${node.type}`);
      }

      executedNodes.add(nodeId);
      nodeOutputs.set(nodeId, output);
      console.log(`Node ${nodeId} execution complete. Output:`, output);

      // Execute all connected nodes
      const outgoingEdges = edgesCopy.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        await executeNode(edge.target);
      }

      return output;
    };

    try {
      // Find all nodes without incoming edges (start nodes)
      const startNodes = nodesCopy.filter(node => 
        !edgesCopy.some(edge => edge.target === node.id)
      );
      console.log('Start nodes:', startNodes);

      // Execute the workflow starting from each start node
      for (const startNode of startNodes) {
        console.log(`Starting execution from node: ${startNode.id}`);
        await executeNode(startNode.id);
      }

      console.log('Workflow execution completed');
    } catch (error) {
      console.error('Error executing workflow:', error);
      setErrorMessage(`Error executing workflow: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, setNodes]);

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
        <div className="error-message">
          {errorMessage}
          <button onClick={() => setErrorMessage('')}>Close</button>
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
            onPaneClick={onBackgroundClick}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
        {selectedNode && (
          <PropertyPanel
            node={selectedNode}
            onChange={onNodeChange}
            onClose={onPanelClose}
          />
        )}
      </div>
    </div>
  );
};

export default AiWorkflowPOC;
