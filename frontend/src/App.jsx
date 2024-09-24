// src/App.jsx

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

// Service imports
import { callOpenAI } from './services/openaiService';

// Styles
import './App.css';

// Utility Functions
function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

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
  const [recentFiles, setRecentFiles] = useState([]);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Effect Hooks
  useEffect(() => {
    const storedWorkspaces = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]');
    const storedFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    setRecentWorkspaces(storedWorkspaces);
    setRecentFiles(storedFiles);
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

  // File Operations
  const onSave = useCallback(() => {
    if (reactFlowInstance && workspace) {
      const flow = reactFlowInstance.toObject();
      const json = JSON.stringify(flow, null, 2);
      
      const fileName = prompt('Enter file name:', 'workflow.json');
      if (fileName) {
        const filePath = normalizePath(`${workspace}/${fileName}`);
        console.log(`Preparing to save: ${filePath}`);
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);

        const updatedRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 5);
        setRecentFiles(updatedRecentFiles);
        localStorage.setItem('recentFiles', JSON.stringify(updatedRecentFiles));

        console.log(`File "${fileName}" has been prepared for download.`);
      }
    } else {
      setErrorMessage('Please set a workspace before saving.');
    }
  }, [reactFlowInstance, workspace, recentFiles]);

  const onOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const contents = e.target.result;
          const flow = JSON.parse(contents);
          if (flow.nodes && flow.edges) {
            setNodes(flow.nodes);
            setEdges(flow.edges);
            console.log('Workflow loaded successfully');
          } else {
            throw new Error('Invalid workflow file format');
          }
        } catch (error) {
          console.error('Error loading workflow:', error);
          setErrorMessage('Error loading workflow. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

  // Workspace Management
  const onSetWorkspace = useCallback((workspacePath) => {
    const normalizedPath = normalizePath(workspacePath);
    setWorkspace(normalizedPath);
    setShowWorkspaceManager(false);
    
    const updatedWorkspaces = [normalizedPath, ...recentWorkspaces.filter(w => w !== normalizedPath)].slice(0, 5);
    setRecentWorkspaces(updatedWorkspaces);
    localStorage.setItem('recentWorkspaces', JSON.stringify(updatedWorkspaces));
    
    console.log(`Workspace set to: ${normalizedPath}`);
  }, [recentWorkspaces]);

  const onOpenRecentFile = useCallback((filePath) => {
    console.log(`Attempting to open recent file: ${filePath}`);
    setErrorMessage(`Please select the file: ${filePath}`);
    onOpen();
  }, [onOpen]);

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

    try {
      let currentNodeId = nodesCopy.find(node => node.type === 'textInput')?.id;
      let inputText = nodesCopy.find(node => node.id === currentNodeId)?.data?.inputText || '';

      while (currentNodeId) {
        const currentNode = nodesCopy.find(node => node.id === currentNodeId);
        if (!currentNode) break;

        console.log('Processing node:', currentNode);

        if (currentNode.type === 'agent') {
          const { apiKeyId, model, systemMessage, temperature, maxTokens } = currentNode.data;
          const messages = [
            { role: 'system', content: systemMessage || 'You are a helpful assistant.' },
            { role: 'user', content: inputText }
          ];

          try {
            const response = await callOpenAI(apiKeyId, model, messages, temperature, maxTokens);
            inputText = response;
          } catch (error) {
            console.error('Error calling OpenAI:', error);
            setErrorMessage(`Error calling OpenAI API: ${error.message}`);
            setIsExecuting(false);
            return;
          }
        }

        const outgoingEdge = edgesCopy.find(edge => edge.source === currentNodeId);
        if (outgoingEdge) {
          currentNodeId = outgoingEdge.target;
        } else {
          if (currentNode.type === 'textOutput') {
            setNodes(prevNodes => prevNodes.map(node => 
              node.id === currentNodeId ? { ...node, data: { ...node.data, text: inputText } } : node
            ));
          }
          break;
        }
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
        onOpen={onOpen} 
        onSetWorkspace={() => setShowWorkspaceManager(true)}
        recentFiles={recentFiles}
        onOpenRecentFile={onOpenRecentFile}
        currentWorkspace={workspace}
        onExecuteWorkflow={executeWorkflow}
        isExecuting={isExecuting}
      />
      {showWorkspaceManager && (
        <WorkspaceManager 
          onSetWorkspace={onSetWorkspace}
          recentWorkspaces={recentWorkspaces}
          onSelectRecentWorkspace={onSetWorkspace}
        />
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