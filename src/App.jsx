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
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import AgentNode from './components/AgentNode';
import WorkspaceManager from './components/WorkspaceManager';
import './App.css';

// Browser-compatible path normalization function
function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
}

const nodeTypes = {
  agent: AgentNode,
  // Add other node types here as we implement them
};

const AiWorkflowPOC = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [workspace, setWorkspace] = useState('');
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);

  useEffect(() => {
    const storedWorkspaces = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]');
    const storedFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    setRecentWorkspaces(storedWorkspaces);
    setRecentFiles(storedFiles);
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

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
        systemMessage: '',
        temperature: 0.7,
        maxTokens: 150,
      };
    }

    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance, setNodes]);

  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((edge) => 
        !deleted.some((node) => node.id === edge.source || node.id === edge.target)
      ));
    },
    [setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted) => {
      setEdges((eds) => eds.filter((edge) => !deleted.includes(edge)));
    },
    [setEdges]
  );

  const onSave = useCallback(() => {
    if (reactFlowInstance && workspace) {
      const flow = reactFlowInstance.toObject();
      const json = JSON.stringify(flow, null, 2); // Pretty print JSON
      
      const fileName = prompt('Enter file name:', 'workflow.json');
      if (fileName) {
        const filePath = normalizePath(`${workspace}/${fileName}`);
        console.log(`Preparing to save: ${filePath}`);
        
        // Create a Blob with the JSON content
        const blob = new Blob([json], { type: 'application/json' });
        
        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        
        // Append to body, click programmatically, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        URL.revokeObjectURL(url);

        // Update recent files
        const updatedRecentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 5);
        setRecentFiles(updatedRecentFiles);
        localStorage.setItem('recentFiles', JSON.stringify(updatedRecentFiles));

        console.log(`File "${fileName}" has been prepared for download.`);
      }
    } else {
      alert('Please set a workspace before saving.');
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
          alert('Error loading workflow. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges]);

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
    // In a browser environment, we can't directly access the file system
    // So we'll prompt the user to select the file manually
    alert(`Please select the file: ${filePath}`);
    onOpen();
  }, [onOpen]);

  return (
    <div className="app-container">
      <MenuBar 
        onSave={onSave} 
        onOpen={onOpen} 
        onSetWorkspace={() => setShowWorkspaceManager(true)}
        recentFiles={recentFiles}
        onOpenRecentFile={onOpenRecentFile}
        currentWorkspace={workspace}
      />
      {showWorkspaceManager && (
        <WorkspaceManager 
          onSetWorkspace={onSetWorkspace}
          recentWorkspaces={recentWorkspaces}
          onSelectRecentWorkspace={onSetWorkspace}
        />
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
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default AiWorkflowPOC;