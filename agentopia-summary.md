# Agentopia Project Summary

## Project Description

### Author: Scott Thielman prompting with Claude Sonnet 3.5 on 9/13/2024

Agentopia is a React-based web application that provides a graphical user interface for organizing workflows involving multiple AI agents. It allows users to visually create, connect, and manage AI agent nodes in a flow-based interface. The project uses React Flow for the node-based interface and aims to support multi-agent conversations and sequential agent interactions of varying complexity.

Key features:
- Visual representation of AI agent workflows
- Ability to add and connect agent nodes
- Customizable instructions for each agent node
- Expandable to support integration with AI backends (e.g., Langchain, Autogen)

## Current Implementation

The current implementation provides a basic proof of concept with the following functionality:
- A full-screen canvas for the workflow
- Ability to add new agent nodes
- Draggable and connectable nodes
- Editable instructions for each node

## Latest Code

Here's the latest version of the main component (`App.jsx`):

```jsx
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Handle
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 250, y: 5 },
  },
];

const AgentNode = ({ data }) => {
  return (
    <Card className="w-64">
      <Handle type="target" position="top" />
      <CardHeader className="font-bold">{data.label}</CardHeader>
      <CardContent>
        <Label>Instructions:</Label>
        <Input 
          value={data.instructions} 
          onChange={(e) => data.onInstructionsChange(e.target.value)} 
          placeholder="Enter instructions..."
        />
      </CardContent>
      <Handle type="source" position="bottom" />
    </Card>
  );
};

const nodeTypes = {
  agentNode: AgentNode,
};

const AiWorkflowPOC = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState([]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addAgentNode = () => {
    const newNode = {
      id: (nodes.length + 1).toString(),
      type: 'agentNode',
      data: { 
        label: `Agent ${nodes.length}`,
        instructions: '',
        onInstructionsChange: (newInstructions) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === newNode.id
                ? { ...node, data: { ...node.data, instructions: newInstructions } }
                : node
            )
          );
        },
      },
      position: { x: Math.random() * 500, y: Math.random() * 500 },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem', backgroundColor: '#f3f4f6' }}>
        <Button onClick={addAgentNode}>Add Agent Node</Button>
      </div>
      <div style={{ flexGrow: 1, width: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default AiWorkflowPOC;
```

## Setup Instructions

1. Create a new React project using Vite:
   ```
   npm create vite@latest agentopia -- --template react
   cd agentopia
   ```

2. Install dependencies:
   ```
   npm install reactflow @radix-ui/react-slot @radix-ui/react-label class-variance-authority clsx tailwind-merge tailwindcss-animate tailwindcss postcss autoprefixer
   ```

3. Set up Tailwind CSS:
   ```
   npx tailwindcss init -p
   ```

4. Update `tailwind.config.js`:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {},
     },
     plugins: [],
   }
   ```

5. Add Tailwind directives to `src/index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   body, #root {
     margin: 0;
     padding: 0;
     width: 100%;
     height: 100%;
   }
   ```

6. Replace the content of `src/App.jsx` with the code provided above.

7. Create necessary UI components (`button.jsx`, `card.jsx`, `input.jsx`, `label.jsx`) in `src/components/ui/`.

8. Run the development server:
   ```
   npm run dev
   ```

## Next Steps

1. Integrate with AI backends (e.g., Langchain, Autogen) to enable actual agent functionality.
2. Implement save/load functionality for workflows.
3. Add more customization options for agent nodes (e.g., different types of agents, more properties).
4. Improve the UI/UX with better styling and more intuitive controls.
5. Implement error handling and validation for user inputs.
6. Add testing to ensure reliability as the project grows.