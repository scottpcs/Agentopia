// src/store/conversationStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useConversationStore = create(devtools((set, get) => ({
  // State
  conversations: new Map(), // Map of conversationId -> conversation data
  activeConversations: new Set(), // Set of currently active conversation IDs
  participantStates: new Map(), // Map of participantId -> participant state
  error: null,
  isLoading: false,

  // Basic conversation management
  setConversation: (conversationId, data) => {
    set((state) => {
      const newConversations = new Map(state.conversations);
      newConversations.set(conversationId, {
        ...data,
        messages: data.messages || [],
        participants: data.participants || [],
        metadata: data.metadata || {},
      });
      return { conversations: newConversations };
    });
  },

  // Initialize a new conversation
  initializeConversation: async (workflowId, name, agents, mode = 'free-form') => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, name, agents, mode }),
      });

      if (!response.ok) throw new Error('Failed to initialize conversation');
      
      const data = await response.json();
      set((state) => {
        const newConversations = new Map(state.conversations);
        const newActiveConversations = new Set(state.activeConversations);
        
        newConversations.set(data.id, {
          id: data.id,
          name,
          mode,
          messages: [],
          participants: agents,
          metadata: { workflowId },
          status: 'active'
        });
        
        newActiveConversations.add(data.id);
        
        return {
          conversations: newConversations,
          activeConversations: newActiveConversations,
          isLoading: false
        };
      });
      
      return data.id;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Load an existing conversation
  loadConversation: async (conversationId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to load conversation');
      
      const data = await response.json();
      set((state) => {
        const newConversations = new Map(state.conversations);
        const newActiveConversations = new Set(state.activeConversations);
        
        newConversations.set(conversationId, {
          ...data,
          status: 'active'
        });
        newActiveConversations.add(conversationId);
        
        return {
          conversations: newConversations,
          activeConversations: newActiveConversations,
          isLoading: false
        };
      });
      
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Add a message to a conversation
  addMessage: async (conversationId, sender, content, role = 'user') => {
    const conversation = get().conversations.get(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: sender.id,
          content,
          role,
          metadata: sender.metadata || {}
        }),
      });

      if (!response.ok) throw new Error('Failed to add message');
      
      const messageData = await response.json();
      
      set((state) => {
        const newConversations = new Map(state.conversations);
        const conversation = newConversations.get(conversationId);
        
        if (conversation) {
          conversation.messages = [...conversation.messages, messageData];
          conversation.updated_at = new Date().toISOString();
        }
        
        return { conversations: newConversations };
      });

      return messageData;
    } catch (error) {
      set((state) => ({
        error: error.message,
        conversations: new Map(state.conversations)
      }));
      throw error;
    }
  },

  // Update participant states (e.g., typing, processing)
  updateParticipantState: (participantId, state) => {
    set((currentState) => {
      const newParticipantStates = new Map(currentState.participantStates);
      newParticipantStates.set(participantId, {
        ...newParticipantStates.get(participantId),
        ...state,
        lastUpdated: new Date().toISOString()
      });
      return { participantStates: newParticipantStates };
    });
  },

  // Manage conversation state
  updateConversationState: async (conversationId, updates) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update conversation');
      
      const updatedData = await response.json();
      
      set((state) => {
        const newConversations = new Map(state.conversations);
        const conversation = newConversations.get(conversationId);
        
        if (conversation) {
          newConversations.set(conversationId, {
            ...conversation,
            ...updatedData
          });
        }
        
        return { conversations: newConversations };
      });

      return updatedData;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Manage participants
  updateParticipants: async (conversationId, { add = [], remove = [] }) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/participants`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add, remove }),
      });

      if (!response.ok) throw new Error('Failed to update participants');
      
      set((state) => {
        const newConversations = new Map(state.conversations);
        const conversation = newConversations.get(conversationId);
        
        if (conversation) {
          const updatedParticipants = conversation.participants
            .filter(p => !remove.includes(p.id))
            .concat(add);
          
          newConversations.set(conversationId, {
            ...conversation,
            participants: updatedParticipants
          });
        }
        
        return { conversations: newConversations };
      });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Close a conversation
  closeConversation: (conversationId) => {
    set((state) => {
      const newActiveConversations = new Set(state.activeConversations);
      newActiveConversations.delete(conversationId);
      
      const newConversations = new Map(state.conversations);
      const conversation = newConversations.get(conversationId);
      if (conversation) {
        conversation.status = 'closed';
      }
      
      return {
        activeConversations: newActiveConversations,
        conversations: newConversations
      };
    });
  },

  // Get conversation state
  getConversationState: (conversationId) => {
    const state = get();
    return {
      conversation: state.conversations.get(conversationId),
      isActive: state.activeConversations.has(conversationId),
      participants: Array.from(state.participantStates.entries())
        .filter(([pid]) => 
          state.conversations.get(conversationId)?.participants
            .some(p => p.id === pid)
        )
        .map(([_, state]) => state)
    };
  },

  // Clear error state
  clearError: () => set({ error: null }),

  // Reset store
  reset: () => set({
    conversations: new Map(),
    activeConversations: new Set(),
    participantStates: new Map(),
    error: null,
    isLoading: false
  })
})));

export default useConversationStore;