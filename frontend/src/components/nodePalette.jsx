import React from 'react';

const NodePalette = () => {
  const nodeTypes = [
    { type: 'textInputNode', label: 'Text Input' },
    { type: 'textOutputNode', label: 'Text Output' },
    { type: 'conversationNode', label: 'Conversation' },
  ];

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette mb-4">
      <h3 className="font-bold mb-2">Nodes</h3>
      {nodeTypes.map((node) => (
        <div
          key={node.type}
          className="node-item bg-white p-2 mb-2 rounded shadow cursor-move"
          onDragStart={(event) => onDragStart(event, node)}
          draggable
        >
          {node.label}
        </div>
      ))}
    </div>
  );
};

export default NodePalette;