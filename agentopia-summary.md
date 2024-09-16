# Agentopia Project Summary

### Author: Scott Thielman prompting with Claude Sonnet 3.5
### 9/16/2024

## Project Description

Agentopia is a React-based web application that provides a graphical user interface for organizing workflows involving multiple AI agents. It allows users to visually create, connect, and manage AI agent nodes in a flow-based interface. The project uses React Flow for the node-based interface and aims to support multi-agent conversations and sequential agent interactions of varying complexity.

Key features:
- Visual representation of AI agent workflows
- Ability to add and connect agent nodes
- Draggable nodes on the canvas
- Customizable instructions for each agent node
- Expandable to support integration with AI backends (e.g., OpenAI API)

## Current Implementation

The current implementation provides a basic proof of concept with the following functionality:
- A full-screen canvas for the workflow
- A toolbar for adding different types of nodes
- Draggable and connectable nodes
- Editable properties for agent nodes (OpenAI model settings)

## Latest Code

Here's the latest version of the main components:

### App.jsx

```jsx
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
```

### Toolbar.jsx

```jsx
import React from 'react';
import { Button } from "./ui/button";

const Toolbar = ({ onAddNode }) => {
  const nodeTypes = [
    { type: 'agent', label: 'Agent Node' },
    { type: 'textInput', label: 'Text Input' },
    { type: 'textOutput', label: 'Text Output' },
    { type: 'textProcess', label: 'Text Process' },
    { type: 'conditional', label: 'Conditional' },
    { type: 'httpRequest', label: 'HTTP Request' },
    { type: 'function', label: 'Function' },
  ];

  return (
    <div className="toolbar">
      <h3 className="toolbar-section-title">Add Nodes</h3>
      {nodeTypes.map((nodeType) => (
        <Button 
          key={nodeType.type}
          onClick={() => onAddNode(nodeType.type)} 
          className="toolbar-button"
        >
          {nodeType.label}
        </Button>
      ))}
    </div>
  );
};

export default Toolbar;
```

### AgentNode.jsx

```jsx
import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

const AgentNode = ({ data, isConnectable }) => {
  const [model, setModel] = useState(data.model || 'gpt-3.5-turbo');
  const [systemMessage, setSystemMessage] = useState(data.systemMessage || '');
  const [temperature, setTemperature] = useState(data.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data.maxTokens || 150);

  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  return (
    <div className="agent-node">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      <div className="agent-node-content">
        <h3>OpenAI Agent</h3>
        <label>
          Model:
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
          </select>
        </label>
        <label>
          System Message:
          <textarea
            value={systemMessage}
            onChange={(e) => setSystemMessage(e.target.value)}
            placeholder="Enter system message..."
          />
        </label>
        <label>
          Temperature:
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
        </label>
        <label>
          Max Tokens:
          <input
            type="number"
            step="1"
            min="1"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          />
        </label>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default AgentNode;
```

### App.css

```css
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.toolbar {
  width: 200px;
  background-color: #f0f0f0;
  border-right: 1px solid #ccc;
  padding: 10px;
  overflow-y: auto;
}

.reactflow-wrapper {
  flex-grow: 1;
  height: 100%;
}

.react-flow__node {
  padding: 10px;
  border-radius: 3px;
  width: 150px;
  font-size: 12px;
  color: #222;
  text-align: center;
  border-width: 1px;
  border-style: solid;
  border-color: #1a192b;
  background-color: white;
}

.react-flow__node-default {
  width: auto;
  height: auto;
}

.react-flow__handle {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.toolbar-button {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.toolbar-button:hover {
  background-color: #357abd;
}

.toolbar-section-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.agent-node {
  border: 1px solid #777;
  padding: 10px;
  border-radius: 5px;
  background: white;
  width: 250px;
}

.agent-node-content {
  display: flex;
  flex-direction: column;
}

.agent-node-content h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.agent-node-content label {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.agent-node-content input,
.agent-node-content select,
.agent-node-content textarea {
  margin-top: 5px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.agent-node-content textarea {
  height: 60px;
  resize: vertical;
}
```

## Next Steps

1. Implement other node types (Text Input, Text Output, Text Process, Conditional, HTTP Request, Function)
2. Add functionality to execute the workflow
3. Implement save/load functionality for workflows
4. Enhance the UI/UX with better styling and more intuitive controls
5. Implement error handling and validation for user inputs
6. Add testing to ensure reliability as the project grows
7. Integrate with OpenAI API for actual agent functionality
8. Implement a mechanism to pass data between nodes

## Setup Instructions

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Open `http://localhost:3000` in your browser to view the application

## Dependencies

- React
- React Flow
- OpenAI API (to be integrated)

This summary reflects the current state of the Agentopia project and provides a starting point for future development sessions.