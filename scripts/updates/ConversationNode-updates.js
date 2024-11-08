// scripts/updates/ConversationNode-updates.js

exports.updates = [
  {
    type: 'state',
    name: 'memoizedValues',
    content: `
  // Memoized values
  const participants = useMemo(() => data?.agents || [], [data?.agents]);
  const conversationMode = useMemo(() => data?.mode || 'free-form', [data?.mode]);
  const allowHumanParticipation = useMemo(() => data?.allowHumanParticipation !== false, [data?.allowHumanParticipation]);
  const turnManagement = useMemo(() => data?.turnManagement || 'dynamic', [data?.turnManagement]);
  const contextHandling = useMemo(() => data?.contextHandling || 'cumulative', [data?.contextHandling]);`,
    description: 'Added memoized values for conversation settings with proper data access'
  },

  {
    type: 'function',
    name: 'handleParticipantConfig',
    content: `const handleParticipantConfig = useCallback((event, participant) => {
    // Stop the event from bubbling up to the node click handler
    event.stopPropagation();
    setSelectedParticipant(participant);
    setShowParticipantConfig(true);
  }, []);`,
    description: 'Updated participant configuration handler with event propagation control'
  },

  {
    type: 'function',
    name: 'handleRemoveParticipant',
    content: `const handleRemoveParticipant = useCallback((event, agentId) => {
    event.stopPropagation();
    if (data?.onChange) {
      const newAgents = participants.filter(p => p.id !== agentId);
      data.onChange(id, { agents: newAgents });
    }
  }, [data, id, participants]);`,
    description: 'Updated remove participant handler with event propagation control'
  },

  {
    type: 'function',
    name: 'handleParticipantChange',
    content: `const handleParticipantChange = useCallback((participantId, changes) => {
    if (data?.onChange) {
      const updatedParticipants = participants.map(p => {
        if (p.id === participantId) {
          return {
            ...p,
            ...changes,
            model: changes.model || p.model,
            apiKeyId: changes.apiKeyId || p.apiKeyId,
            temperature: changes.temperature || p.temperature,
            maxTokens: changes.maxTokens || p.maxTokens,
          };
        }
        return p;
      });
      
      console.log('Updating participant:', participantId, {
        original: participants.find(p => p.id === participantId),
        changes,
        updated: updatedParticipants.find(p => p.id === participantId)
      });
      
      data.onChange(id, { agents: updatedParticipants });
    }
  }, [data?.onChange, id, participants]);`,
    description: 'Updated participant change handler to properly preserve properties'
  },

  {
    type: 'function',
    name: 'renderParticipantList',
    content: `const renderParticipantList = useCallback(() => {
    return participants.map((agent) => (
      <div
        key={agent.id}
        className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {agent.type === 'ai' ? (
            <Bot className="w-4 h-4 text-blue-500" />
          ) : (
            <User className="w-4 h-4 text-green-500" />
          )}
          <span className="text-sm font-medium">{agent.name}</span>
          <span className="text-xs text-gray-500">
            ({getRoleDisplay(agent.role)})
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleParticipantConfig(e, agent)}
            title="Configure Agent"
          >
            <Settings2 className="w-4 h-4 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleRemoveParticipant(e, agent.id)}
            title="Remove Agent"
          >
            <X className="w-4 h-4 text-gray-500" />
          </Button>
        </div>
      </div>
    ));
  }, [participants, handleParticipantConfig, handleRemoveParticipant]);`,
    description: 'Updated participant list rendering with event propagation control'
  },

  {
    type: 'jsx',
    name: 'mainContainer',
    content: `<div 
    className="conversation-node bg-white border border-gray-200 rounded-lg shadow-lg w-96"
    onClick={(e) => e.stopPropagation()}
  >
    {/* ... existing content ... */}
  </div>`,
    description: 'Added event propagation control to main container'
  },

  {
    type: 'jsx',
    name: 'propertyPanel',
    content: `{showParticipantConfig && selectedParticipant && (
    <PropertyPanel
      node={{
        id: selectedParticipant.id,
        type: selectedParticipant.type === 'ai' ? 'aiAgent' : 'humanAgent',
        data: {
          ...selectedParticipant,
          onChange: (id, changes) => handleParticipantChange(id, changes)
        }
      }}
      onChange={(_, changes) => handleParticipantChange(selectedParticipant.id, changes)}
      onClose={(e) => {
        e?.stopPropagation();
        setShowParticipantConfig(false);
        setSelectedParticipant(null);
      }}
      apiKeys={data?.apiKeys}
    />
  )}`,
    description: 'Updated property panel rendering with proper event handling and data access'
  }
];