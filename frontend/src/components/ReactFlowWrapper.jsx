import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import ReactFlow, { 
  Controls, 
  MiniMap, 
  Background,
  ReactFlowProvider,
  useKeyPress 
} from 'reactflow';

const REACT_FLOW_PROPS = [
  'nodes',
  'edges',
  'onNodesChange',
  'onEdgesChange',
  'onConnect',
  'onInit',
  'nodeTypes',
  'onDragOver',
  'onDrop',
  'onNodeClick',
  'onNodeContextMenu',
  'onPaneClick',
  'defaultViewport',
  'zoomOnScroll',
  'zoomOnPinch',
  'panOnScroll',
  'panOnScrollMode',
  'preventScrolling',
  'snapToGrid',
  'snapGrid',
  'minZoom',
  'maxZoom',
  'fitView',
  'proOptions',
  'deleteKeyCode',
  'onNodeDragStart',
  'onNodeDrag',
  'onNodeDragStop',
  'onNodesDelete',
];

const ReactFlowWrapper = (props) => {
  const wrapperRef = useRef(null);
  const deletePressed = useKeyPress('Delete');
  const backspacePressed = useKeyPress('Backspace');

  // Separate props using useMemo
  const { reactFlowProps, divProps } = useMemo(() => {
    const flowProps = {};
    const containerProps = {};
    
    Object.entries(props).forEach(([key, value]) => {
      if (REACT_FLOW_PROPS.includes(key)) {
        flowProps[key] = value;
      } else if (key !== 'children') {
        containerProps[key] = value;
      }
    });

    return { reactFlowProps: flowProps, divProps: containerProps };
  }, [props]);

  // Handle node deletion
  useEffect(() => {
    if (deletePressed || backspacePressed) {
      const selectedNodes = reactFlowProps.nodes?.filter(node => node.selected);
      if (selectedNodes?.length && reactFlowProps.onNodesDelete) {
        reactFlowProps.onNodesDelete(selectedNodes);
      }
    }
  }, [deletePressed, backspacePressed, reactFlowProps.nodes, reactFlowProps.onNodesDelete]);

  // Set up passive and non-passive event handlers
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Passive event handlers
    const passiveHandlers = {
      wheel: (e) => {
        // Handle wheel events
      },
      touchstart: (e) => {
        // Handle single touch events
        if (e.touches?.length <= 1) return;
      },
      touchmove: (e) => {
        // Handle single touch move events
        if (e.touches?.length <= 1) return;
      }
    };

    // Non-passive event handler for multi-touch
    const handleMultiTouch = (e) => {
      if (e.touches?.length > 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add passive event listeners
    Object.entries(passiveHandlers).forEach(([event, handler]) => {
      wrapper.addEventListener(event, handler, { passive: true });
    });

    // Add non-passive event listener for multi-touch scenarios
    const multiTouchOptions = { 
      passive: false,
      capture: true
    };

    wrapper.addEventListener('touchstart', handleMultiTouch, multiTouchOptions);
    wrapper.addEventListener('touchmove', handleMultiTouch, multiTouchOptions);

    // Cleanup
    return () => {
      Object.entries(passiveHandlers).forEach(([event, handler]) => {
        wrapper.removeEventListener(event, handler);
      });
      wrapper.removeEventListener('touchstart', handleMultiTouch);
      wrapper.removeEventListener('touchmove', handleMultiTouch);
    };
  }, []);

  const defaultReactFlowProps = {
    proOptions: { hideAttribution: true },
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    zoomOnScroll: false,
    zoomOnPinch: true,
    panOnScroll: true,
    panOnScrollMode: "free",
    preventScrolling: false,
    snapToGrid: true,
    snapGrid: [15, 15],
    minZoom: 0.2,
    maxZoom: 4,
    fitView: true,
    deleteKeyCode: ['Delete', 'Backspace']
  };

  return (
    <ReactFlowProvider>
      <div 
        ref={wrapperRef} 
        className="reactflow-wrapper h-full"
        style={{ 
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          width: '100%',
          height: '100%'
        }}
        {...divProps}
      >
        <ReactFlow
          {...defaultReactFlowProps}
          {...reactFlowProps}
        >
          <Controls 
            showZoom={true}
            showFitView={true}
            showInteractive={true}
            position="bottom-right"
          />
          <MiniMap 
            nodeStrokeColor={(n) => {
              if (n.type === 'aiAgent') return '#0ea5e9';
              if (n.type === 'humanAgent') return '#22c55e';
              return '#64748b';
            }}
            nodeColor={(n) => {
              if (n.type === 'aiAgent') return '#bfdbfe';
              if (n.type === 'humanAgent') return '#bbf7d0';
              return '#f1f5f9';
            }}
            nodeBorderRadius={2}
          />
          <Background
            variant="dots"
            gap={12}
            size={1}
            color="#e2e8f0"
          />
          {props.children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};

export default ReactFlowWrapper;