import React, { useEffect, useRef, useMemo } from 'react';
import ReactFlow, { 
  Controls, 
  MiniMap, 
  Background,
  ReactFlowProvider 
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
  'deleteKeyCode', // Added deleteKeyCode to React Flow props
];

const ReactFlowWrapper = (props) => {
  const wrapperRef = useRef(null);

  // Separate props using useMemo to optimize performance
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

    // Add non-passive event listener only for multi-touch scenarios
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
    maxZoom: 4
  };

  return (
    <ReactFlowProvider>
      <div 
        ref={wrapperRef} 
        className="reactflow-wrapper h-full"
        style={{ 
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
        {...divProps}
      >
        <ReactFlow
          {...defaultReactFlowProps}
          {...reactFlowProps}
        >
          {props.children}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
};

export default ReactFlowWrapper;