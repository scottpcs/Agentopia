import React, { useState, useCallback, useRef } from 'react';
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
import './App.css';

const nodeTypes = {
  agent: AgentNode,
  // Add other node types here as we implement them
};

const AiWorkflowPOC = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

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
      x: Math.random() * 500,
      y: Math.random() * 500,
    });

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position,
      data: { label: `New ${nodeType} Node` },
    };

    // Add specific properties for agent nodes
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

  return (
    <div className="app-container">
      <MenuBar />
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