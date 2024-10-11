// src/store/workflowStore.js
import { create } from 'zustand';
import AgentNode from '../nodes/AgentNode';

const useWorkflowStore = create((set, get) => ({
  nodes: [],
  edges: [],
  executionQueue: [],
  isExecuting: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  updateNodeData: (nodeId, data) => set((state) => ({
    nodes: state.nodes.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    )
  })),

  queueNodeExecution: (nodeId, inputData) => set((state) => ({
    executionQueue: [...state.executionQueue, { nodeId, inputData }]
  })),

  executeWorkflow: async () => {
    set({ isExecuting: true });
    const { nodes, edges, executionQueue } = get();
    const nodeMap = new Map(nodes.map(node => [node.id, new AgentNode(node.id, node.data)]));
    
    const processQueue = async () => {
      const { executionQueue } = get();
      if (executionQueue.length === 0) {
        set({ isExecuting: false });
        return;
      }

      const { nodeId, inputData } = executionQueue[0];
      const node = nodeMap.get(nodeId);
      if (!node) {
        set((state) => ({ executionQueue: state.executionQueue.slice(1) }));
        processQueue();
        return;
      }

      let output;
      if (node.data.type === 'human') {
        // For human nodes, we wait for input
        set((state) => ({
          nodes: state.nodes.map(n => 
            n.id === nodeId ? { ...n, data: { ...n.data, waitingForInput: true } } : n
          )
        }));
        // The human input will be handled by the UI, which will call updateNodeData
        // That will trigger the continuation of the workflow
      } else {
        output = await node.process(inputData);
        set((state) => ({
          nodes: state.nodes.map(n => 
            n.id === nodeId ? { ...n, data: { ...n.data, lastOutput: output } } : n
          ),
          executionQueue: state.executionQueue.slice(1)
        }));

        // Queue next nodes
        const nextEdges = edges.filter(edge => edge.source === nodeId);
        nextEdges.forEach(edge => {
          get().queueNodeExecution(edge.target, output);
        });

        processQueue();
      }
    };

    processQueue();
  },

  continueWorkflow: (nodeId, humanInput) => {
    const node = get().nodes.find(n => n.id === nodeId);
    if (node && node.data.waitingForInput) {
      set((state) => ({
        nodes: state.nodes.map(n => 
          n.id === nodeId ? { ...n, data: { ...n.data, waitingForInput: false, lastOutput: humanInput } } : n
        ),
        executionQueue: state.executionQueue.slice(1)
      }));

      // Queue next nodes
      const edges = get().edges;
      const nextEdges = edges.filter(edge => edge.source === nodeId);
      nextEdges.forEach(edge => {
        get().queueNodeExecution(edge.target, humanInput);
      });

      get().executeWorkflow();
    }
  },

  getStructuredOutput: () => {
    const { nodes } = get();
    const structuredOutput = {};
    nodes.forEach(node => {
      if (node.type === 'agent' && node.data.structuredOutput) {
        structuredOutput[node.id] = node.data.structuredOutput;
      }
    });
    return structuredOutput;
  }
}));

export default useWorkflowStore;