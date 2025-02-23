// src/hooks/useConversationManager.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { ConversationIntegrator } from '../utils/conversationIntegration';

export function useConversationManager(initialConfig = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const integratorRef = useRef(null);
  const [conversationState, setConversationState] = useState({
    activeTopics: new Set(),
    openQuestions: new Set(),
    unaddressedPoints: new Set(),
    participantMetrics: {},
    turnHistory: []
  });

  // Initialize conversation integrator
  useEffect(() => {
    integratorRef.current = new ConversationIntegrator(initialConfig);
  }, []);

  // Setup conversation with participants
  const setupConversation = useCallback((participants, mode) => {
    if (!integratorRef.current) return;
    integratorRef.current.setupConversation(participants, mode);
    
    // Initialize conversation state
    setConversationState(prev => ({
      ...prev,
      participants: new Map(participants.map(p => [p.id, p])),
      mode,
      startTime: Date.now()
    }));
  }, []);

  // Process a new message
  const processMessage = useCallback(async (message, senderId) => {
    if (!integratorRef.current) return null;
    setIsProcessing(true);
    setError(null);

    try {
      const result = await integratorRef.current.processMessage(message, senderId);
      
      // Update conversation state
      setConversationState(prev => ({
        ...prev,
        activeTopics: new Set([...prev.activeTopics, ...result.analysis.topics]),
        openQuestions: new Set([
          ...prev.openQuestions,
          ...(result.analysis.type === 'question' ? [message.id] : [])
        ]),
        unaddressedPoints: new Set([
          ...prev.unaddressedPoints,
          ...(result.analysis.type === 'point' ? [message.id] : [])
        ]),
        participantMetrics: result.updatedContext.participationBalance,
        turnHistory: [...prev.turnHistory, {
          messageId: message.id,
          senderId,
          timestamp: Date.now(),
          type: result.analysis.type
        }]
      }));

      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Generate instructions for an AI agent
  const getAgentInstructions = useCallback((agentId) => {
    if (!integratorRef.current) return '';
    return integratorRef.current.generateAgentInstructions(agentId);
  }, []);

  // Update metrics after a response
  const updateMetrics = useCallback((participantId, responseType) => {
    if (!integratorRef.current) return;
    integratorRef.current.updateConversationMetrics(participantId, responseType);
    
    // Update state with new metrics
    const dynamics = integratorRef.current.contextManager.analyzeSocialDynamics();
    setConversationState(prev => ({
      ...prev,
      participantMetrics: dynamics.participationBalance
    }));
  }, []);

  // Get conversation statistics
  const getStatistics = useCallback(() => {
    if (!conversationState.startTime) return null;

    const duration = Date.now() - conversationState.startTime;
    const messageCount = conversationState.turnHistory.length;
    const participantStats = {};

    conversationState.participants?.forEach((participant, id) => {
      const turns = conversationState.turnHistory.filter(t => t.senderId === id);
      participantStats[id] = {
        messageCount: turns.length,
        participationRate: turns.length / messageCount,
        averageResponseTime: calculateAverageResponseTime(turns),
        topicContributions: calculateTopicContributions(turns, participant)
      };
    });

    return {
      duration,
      messageCount,
      participantStats,
      activeTopics: Array.from(conversationState.activeTopics),
      openQuestions: conversationState.openQuestions.size,
      unaddressedPoints: conversationState.unaddressedPoints.size
    };
  }, [conversationState]);

  return {
    setupConversation,
    processMessage,
    getAgentInstructions,
    updateMetrics,
    getStatistics,
    conversationState,
    isProcessing,
    error
  };
}

// Helper functions
function calculateAverageResponseTime(turns) {
  if (turns.length < 2) return 0;
  const responseTimes = turns.slice(1).map((turn, i) => 
    turn.timestamp - turns[i].timestamp
  );
  return responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
}

function calculateTopicContributions(turns, participant) {
  if (!participant.expertise?.selectedSkills) return {};
  
  const contributions = {};
  participant.expertise.selectedSkills.forEach(skill => {
    contributions[skill] = turns.filter(turn => 
      turn.content?.toLowerCase().includes(skill.toLowerCase())
    ).length;
  });
  
  return contributions;
}