// scripts/updates/App-updates.js
exports.updates = [
    {
      type: 'function',
      name: 'onNodeClick',
      content: `const onNodeClick = useCallback((event, node) => {
        // Only handle node clicks if we're not clicking on an input or button
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'BUTTON' || 
            event.target.closest('.property-panel') || // Don't handle clicks in property panel
            event.defaultPrevented) { // Don't handle if event was already handled
          return;
        }
        setSelectedNode(node);
        setInteractionMode('interact');
      }, []);`,
      description: 'Enhanced node click handler with improved event filtering'
    }
  ];