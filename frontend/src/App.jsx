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
import Sidebar from './components/SideBar';
import PropertyPanel from './components/PropertyPanel';
import InteractionPanel from './components/InteractionPanel';
import WorkspaceManager from './components/WorkspaceManager';
import CredentialManager from './components/CredentialManager';
import AgentBuilder from './components/AgentBuilder';
import ReactFlowWrapper from './components/ReactFlowWrapper';
import { nodeTypes } from './components/nodeTypes';

// Service imports
import { callOpenAI } from './services/openaiService';
import { executeWorkflow, stopWorkflowExecution } from './utils/workflowExecutionEngine';

// Styles
import './App.css';

const App = () => {
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
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [interactionMode, setInteractionMode] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [agents, setAgents] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [availableAgentTypes] = useState(['ai', 'human', 'expert']);

  // Effect Hooks
  useEffect(() => {
    const storedWorkspaces = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]');
    setRecentWorkspaces(storedWorkspaces);
    fetchWorkflows();
    fetchAgents();
    fetchApiKeys();
  }, []);

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

  // Callback Functions
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `New ${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

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

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setInteractionMode(null);
  }, []);

  const onPanelClose = useCallback(() => {
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
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
    } catch (error) {
      console.error('Error loading workflow:', error);
      setErrorMessage('Failed to load workflow');
    }
  }, [setNodes, setEdges]);

  // Workspace Management
  const onSetWorkspace = useCallback((workspacePath) => {
    setWorkspace(workspacePath);
    setShowWorkspaceManager(false);
    const updatedWorkspaces = [
      workspacePath,
      ...recentWorkspaces.filter(w => w !== workspacePath)
    ].slice(0, 5);
    setRecentWorkspaces(updatedWorkspaces);
    localStorage.setItem('recentWorkspaces', JSON.stringify(updatedWorkspaces));
  }, [recentWorkspaces]);

  // Agent Management
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

  const onAddAgent = useCallback((agent) => {
    if (agent) {
      const newNode = {
        id: `aiAgent-${Date.now()}`,
        type: 'aiAgent',
        position: { x: 100, y: 100 },
        data: { ...agent, label: agent.name },
      };
      setNodes((nds) => nds.concat(newNode));
    } else {
      setShowAgentBuilder(true);
    }
  }, [setNodes]);

  const handleCreateAgent = useCallback(() => {
    setShowAgentBuilder(true);
  }, []);

  const handleSaveAgent = useCallback((newAgent) => {
    setAgents(prevAgents => [...prevAgents, { ...newAgent, id: Date.now().toString() }]);
    setShowAgentBuilder(false);
  }, []);

  const handleCloseAgentBuilder = useCallback(() => {
    setShowAgentBuilder(false);
  }, []);

  // API Key Management
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

  // Render
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
        
        <div 
          className="flow-container" 
          ref={reactFlowWrapper}
          style={{ 
            touchAction: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            userSelect: 'none'
          }}
          >
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
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls showInteractive={false} />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlowWrapper>
        </div>

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
      </div>

      {showWorkspaceManager && (
        <div className="modal-overlay">
          <WorkspaceManager 
            onSetWorkspace={onSetWorkspace}
            recentWorkspaces={recentWorkspaces}
            onSelectRecentWorkspace={onSetWorkspace}
            onClose={() => setShowWorkspaceManager(false)}
          />
        </div>
      )}

      {showCredentialManager && (
        <div className="modal-overlay">
          <CredentialManager 
            onClose={() => setShowCredentialManager(false)}
          />
        </div>
      )}

      {showAgentBuilder && (
        <div className="modal-overlay">
          <AgentBuilder
            onSave={handleSaveAgent}
            onClose={handleCloseAgentBuilder}
            availableAgentTypes={availableAgentTypes}
          />
        </div>
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
    </div>
  );
};

export default App;