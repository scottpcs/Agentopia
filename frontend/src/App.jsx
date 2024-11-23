// src/App.jsx
import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, { 
  useNodesState, 
  useEdgesState,
  useReactFlow,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';

// Custom component imports
import MenuBar from './components/MenuBar';
import Sidebar from './components/SideBar';
import PropertyPanel from './components/PropertyPanel';
import InteractionPanel from './components/InteractionPanel';
import WorkspaceManager from './components/WorkspaceManager';
import CredentialManager from './components/CredentialManager';
import AgentBuilder from './components/AgentBuilder';
import ReactFlowWrapper from './components/ReactFlowWrapper';
import { nodeTypes } from './components/nodeTypes';
import { defaultAgentConfig } from './utils/agentConfigConverter';

// Service imports
import { callOpenAI } from './services/openaiService';
import { executeWorkflow, stopWorkflowExecution } from './utils/workflowExecutionEngine';

// Styles
import './App.css';

const App = () => {
  // Refs
  const reactFlowWrapper = useRef(null);

  // State Declarations - Node Management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [interactionMode, setInteractionMode] = useState(null);

  // State Declarations - UI Management
  const [workspace, setWorkspace] = useState('');
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [savedWorkflows, setSavedWorkflows] = useState([]);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showCredentialManager, setShowCredentialManager] = useState(false);
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [draggedNode, setDraggedNode] = useState(null);
  const [agentConfig, setAgentConfig] = useState(defaultAgentConfig);

  // State Declarations - Data Management
  const [agents, setAgents] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);

  // Node Change Handler
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
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Agent Management Functions
  const handleCreateAgent = useCallback(() => {
    console.log('Opening AgentBuilder');
    setShowAgentBuilder(true);
  }, []);

  const handleAgentCreated = useCallback((newAgentConfig) => {
    console.log('Creating new agent config:', newAgentConfig);
    
    // Add the agent to the agents list
    setAgents((prevAgents) => [...prevAgents, newAgentConfig]);
    
    // Update the agent configuration
    setAgentConfig(newAgentConfig);
    
    // Close the AgentBuilder modal
    setShowAgentBuilder(false);
  }, []);
  

  
  const handleSaveAgent = useCallback(async (agentConfig) => {
    console.log('Saving agent:', agentConfig);
    const newAgent = {
      id: Date.now(),
      ...agentConfig
    };
    setAgents(prev => [...prev, newAgent]);
    setShowAgentBuilder(false);
  }, []);

  const handleCloseAgentBuilder = useCallback(() => {
    console.log('Closing AgentBuilder');
    setShowAgentBuilder(false);
  }, []);

  const handleUpdateAgent = useCallback((agentId, agentConfig) => {
    console.log('Updating agent:', { agentId, agentConfig });
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...agentConfig } : agent
    ));
    setShowAgentBuilder(false);
  }, []);

  const handleDeleteAgent = useCallback((agentId) => {
    console.log('Deleting agent:', agentId);
    setAgents(prev => prev.filter(agent => agent.id !== agentId));
  }, []);

  const onAddAgent = useCallback((agent) => {
    if (agent) {
      const newNode = {
        id: `aiAgent-${Date.now()}`,
        type: 'aiAgent',
        position: { x: 100, y: 100 },
        data: { 
          ...agent, 
          label: agent.name,
          onChange: onNodeChange,
          onCreateAgent: handleCreateAgent,
          apiKeys: apiKeys
        },
      };
      setNodes((nds) => nds.concat(newNode));
    } else {
      setShowAgentBuilder(true);
    }
  }, [setNodes, onNodeChange, apiKeys, handleCreateAgent]);

  // Flow Event Handlers
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onInit = useCallback((instance) => {
    console.log('Flow initialized');
    setReactFlowInstance(instance);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeDragStart = useCallback((event, node) => {
    console.log('Node drag started:', node);
    setDraggedNode(node);
  }, []);
  
  const onNodeDrag = useCallback((event, node) => {
    // Optional: Add any logic you want to happen during the drag
    console.log('Node being dragged:', node);
  }, []);
  
  const onNodeDragStop = useCallback((event, node) => {
    console.log('Node drag stopped:', node);
    setDraggedNode(null);
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
  
      // Early return if no flow instance
      if (!reactFlowInstance) {
        console.warn('No React Flow instance');
        return;
      }
  
      // Get the target bounds
      const targetBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!targetBounds) {
        console.warn('No wrapper bounds');
        return;
      }
  
      // Calculate drop position
      const dropPosition = {
        x: event.clientX - targetBounds.left,
        y: event.clientY - targetBounds.top,
      };
  
      // Convert to flow coordinates
      const flowPosition = reactFlowInstance.project({
        x: dropPosition.x,
        y: dropPosition.y,
      });
  
      try {
        const dragData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
        
        if (!dragData || !dragData.type) {
          console.warn('Invalid drag data');
          return;
        }
  
        // Create the new node with calculated position
        const newNode = {
          id: `${dragData.type}-${Date.now()}`,
          type: dragData.type,
          position: flowPosition,
          data: {
            ...dragData.data,
            onChange: onNodeChange,
            onCreateAgent: handleCreateAgent,
            apiKeys
          }
        };
  
        console.log('Adding new node:', {
          type: dragData.type,
          position: flowPosition,
          data: dragData.data
        });
  
        setNodes((nds) => nds.concat(newNode));
      } catch (error) {
        console.error('Error creating node:', error);
        setErrorMessage('Failed to create node: ' + error.message);
      }
    },
    [reactFlowInstance, onNodeChange, handleCreateAgent, apiKeys]
  );
  
  // Add a fallback position helper
  const getDefaultPosition = (dropPoint = null) => {
    if (dropPoint) {
      return dropPoint;
    }
    // Provide a default position if calculation fails
    return { x: 100, y: 100 };
  };
  
  // Update your onDragOver handler too
  //const onDragOver = useCallback((event) => {
  //  event.preventDefault();
  //  event.dataTransfer.dropEffect = 'move';
  //}, []);

  // Node Interaction Handlers
  const onNodeClick = useCallback((event, node) => {
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'BUTTON' || 
        event.target.closest('.property-panel') ||
        event.defaultPrevented) {
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

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setInteractionMode(null);
  }, []);

  const onPanelClose = useCallback(() => {
    setSelectedNode(null);
    setInteractionMode(null);
  }, []);

  // Add a nodes deletion handler
  const onNodesDelete = useCallback((deleted) => {
    console.log('Deleting nodes:', deleted);
    
    // Clean up any resources associated with deleted nodes
    deleted.forEach(node => {
      if (node.type === 'conversation' && node.data.agents) {
        console.log('Cleaning up conversation agents:', node.data.agents);
      }
    });
    
    // Update nodes state
    setNodes(nodes => nodes.filter(node => !deleted.find(del => del.id === node.id)));
  }, [setNodes]);

  // Workflow Management
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
    if (!reactFlowInstance) return;
    
    const name = prompt('Enter a name for this workflow:');
    if (!name) return;
    
    try {
      const flow = reactFlowInstance.toObject();
      const response = await fetch('http://localhost:3000/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data: flow }),
      });
      
      if (!response.ok) throw new Error('Failed to save workflow');
      await fetchWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      setErrorMessage('Failed to save workflow');
    }
  }, [reactFlowInstance, fetchWorkflows]);

  const onLoad = useCallback(async (name) => {
    try {
      const response = await fetch(`http://localhost:3000/api/workflows/${name}`);
      if (!response.ok) throw new Error('Failed to load workflow');
      const flow = await response.json();
      
      const nodesWithHandlers = (flow.nodes || []).map(node => ({
        ...node,
        data: { 
          ...node.data, 
          onChange: onNodeChange,
          onCreateAgent: handleCreateAgent,
          apiKeys: apiKeys
        }
      }));
      
      setNodes(nodesWithHandlers);
      setEdges(flow.edges || []);
    } catch (error) {
      console.error('Error loading workflow:', error);
      setErrorMessage('Failed to load workflow');
    }
  }, [setNodes, setEdges, onNodeChange, apiKeys, handleCreateAgent]);

  // Data Fetching
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const fetchedAgents = await response.json();
      setAgents(fetchedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setErrorMessage('Failed to fetch agents');
    }
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      const keys = await response.json();
      setApiKeys(keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setErrorMessage('Failed to fetch API keys');
    }
  }, []);

  // Effects
  useEffect(() => {
    const storedWorkspaces = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]');
    setRecentWorkspaces(storedWorkspaces);
    fetchWorkflows();
    fetchAgents();
    fetchApiKeys();
  }, [fetchWorkflows, fetchAgents, fetchApiKeys]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedNode(null);
        setInteractionMode(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Workflow Execution

  const onExecuteWorkflow = useCallback(async () => {
    setIsExecuting(true);
    setErrorMessage('');
    try {
      await executeWorkflow(nodes, edges, onNodeChange);
    } catch (error) {
      console.error('Error executing workflow:', error);
      setErrorMessage(`Error executing workflow: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, onNodeChange]);

  const onStopExecution = useCallback(() => {
    stopWorkflowExecution();
    setIsExecuting(false);
  }, []);

  // Workspace Management
  const handleSetWorkspace = useCallback((path) => {
    setWorkspace(path);
    setShowWorkspaceManager(false);
    const updatedWorkspaces = [
      path,
      ...recentWorkspaces.filter(w => w !== path)
    ].slice(0, 5);
    setRecentWorkspaces(updatedWorkspaces);
    localStorage.setItem('recentWorkspaces', JSON.stringify(updatedWorkspaces));
  }, [recentWorkspaces]);

  return (
    <div className="app-container">
      <MenuBar 
        onSave={onSave}
        onLoad={onLoad}
        savedWorkflows={savedWorkflows}
        currentWorkspace={workspace}
        onSetWorkspace={() => setShowWorkspaceManager(true)}
        onExecuteWorkflow={onExecuteWorkflow}
        onStopExecution={onStopExecution}
        isExecuting={isExecuting}
        onShowCredentialManager={() => setShowCredentialManager(true)}
      />

      <div className="main-content">
        <Sidebar 
          agents={agents} 
          onAddAgent={onAddAgent}
          onCreateAgent={handleCreateAgent}
        />
        
        <div className="flow-container" ref={reactFlowWrapper}>
          <ReactFlowWrapper
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            nodeTypes={nodeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onBackgroundClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
          />
        </div>
      </div>

      {showAgentBuilder && (
        <AgentBuilder
          isOpen={showAgentBuilder}
          onClose={() => setShowAgentBuilder(false)}
          onSave={handleAgentCreated}
          onUpdate={handleUpdateAgent}
          onDelete={handleDeleteAgent}
          agents={agents}
          apiKeys={apiKeys}
          initialConfig={agentConfig}
        />
      )}

      {selectedNode && interactionMode === 'properties' && (
        <PropertyPanel
          node={selectedNode}
          onChange={onNodeChange}
          onClose={onPanelClose}
          apiKeys={apiKeys}
        />
      )}

      {selectedNode && interactionMode === 'interact' && (
        <InteractionPanel
          node={selectedNode}
          onChange={onNodeChange}
          onClose={onPanelClose}
        />
      )}

      {showWorkspaceManager && (
        <WorkspaceManager 
          onSetWorkspace={handleSetWorkspace}
          recentWorkspaces={recentWorkspaces}
          onSelectRecentWorkspace={handleSetWorkspace}
          onClose={() => setShowWorkspaceManager(false)}
        />
      )}

      {showCredentialManager && (
        <CredentialManager 
          onClose={() => setShowCredentialManager(false)}
        />
      )}

      {errorMessage && (
        <div className="error-message">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage}</span>
            <button
              className="absolute top-0 right-0 px-4 py-3"
              onClick={() => setErrorMessage('')}
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6 text-red-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isExecuting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-center">Executing Workflow...</p>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts helper */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-500">
          <div className="bg-white p-2 rounded shadow-md">
            <p>Shortcuts:</p>
            <ul className="list-disc list-inside">
              <li>Esc: Close panels</li>
              <li>Delete: Remove selected node</li>
              <li>Ctrl+S: Save workflow</li>
              <li>Ctrl+Z: Undo</li>
              <li>Ctrl+Shift+Z: Redo</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;