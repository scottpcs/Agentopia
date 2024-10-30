// src/hooks/useConversation.js
import { useCallback, useEffect } from 'react';
import useConversationStore from '../store/conversationStore';

export function useConversation(conversationId, agents, mode = 'free-form') {
  // Get store actions and state
  const {
    initializeConversation,
    loadConversation,
    addMessage,
    updateParticipantState,
    getConversationState,
    error,
    isLoading,
    conversations,
    setConversation
  } = useConversationStore();

  // Initialize or load conversation
  useEffect(() => {
    async function setupConversation() {
      try {
        if (!conversationId) {
          // Create new conversation
          if (agents && agents.length > 0) {
            const newConversationId = await initializeConversation(
              agents[0]?.workflowId,
              'New Conversation',
              agents,
              mode
            );
            return newConversationId;
          }
        } else {
          // Load existing conversation
          await loadConversation(conversationId);
        }
      } catch (error) {
        console.error('Error setting up conversation:', error);
      }
    }

    setupConversation();
  }, [conversationId, agents, mode, initializeConversation, loadConversation]);

  // Handle message sending
  const sendMessage = useCallback(async (content, sender) => {
    if (!conversationId) {
      console.error('No active conversation');
      return;
    }

    try {
      // Update sender state to show typing/processing
      updateParticipantState(sender.id, { status: 'sending' });
      
      // Add message to conversation
      const messageData = await addMessage(conversationId, sender, content);
      
      // Reset sender state
      updateParticipantState(sender.id, { status: 'idle' });
      
      return messageData;
    } catch (error) {
      // Update sender state to show error
      updateParticipantState(sender.id, { 
        status: 'error',
        error: error.message 
      });
      throw error;
    }
  }, [conversationId, addMessage, updateParticipantState]);

  // Get current conversation state
  const conversationState = conversationId ? 
    getConversationState(conversationId) : 
    { messages: [], participants: [] };

  // Update conversation settings
  const updateSettings = useCallback((settings) => {
    if (!conversationId) return;
    
    setConversation(conversationId, {
      ...conversations.get(conversationId),
      ...settings
    });
  }, [conversationId, setConversation, conversations]);

  return {
    // Basic conversation operations
    sendMessage,
    updateSettings,
    
    // State
    conversationState,
    error,
    isLoading,
    
    // Utility getter
    getMessages: () => conversationState.messages || [],
    getParticipants: () => conversationState.participants || [],
    
    // Status checks
    isActive: Boolean(conversationId && conversationState),
    hasError: Boolean(error),
    isProcessing: isLoading
  };
}

export default useConversation;