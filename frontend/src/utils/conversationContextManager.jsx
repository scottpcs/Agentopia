// src/utils/conversationContextManager.js

/**
 * Manages conversation context, social dynamics, and participant interactions
 */
export class ConversationContextManager {
    constructor(config = {}) {
      this.mode = config.mode || 'free-form';
      this.participants = new Map(); // participant ID -> participant data
      this.speakingQueue = [];
      this.currentSpeaker = null;
      this.turnHistory = [];
      this.contextualMemory = new Map(); // topic -> related messages/decisions
      this.socialState = {
        activeDiscussion: null,
        openQuestions: new Set(),
        unaddressedPoints: new Set(),
        recentMentions: new Map(), // participantId -> last mention timestamp
        interactionPatterns: new Map() // participantId -> interaction stats
      };
    }
  
    // Participant Management
    addParticipant(participant) {
      this.participants.set(participant.id, {
        ...participant,
        stats: {
          turnsToken: 0,
          contributions: 0,
          questionsAsked: 0,
          responsesGiven: 0,
          lastSpoke: null
        }
      });
    }
  
    // Turn Management
    requestTurn(participantId, priority = 'normal') {
      const participant = this.participants.get(participantId);
      if (!participant) return false;
  
      const turnRequest = {
        participantId,
        priority,
        timestamp: Date.now(),
        type: 'request'
      };
  
      if (priority === 'high') {
        this.speakingQueue.unshift(turnRequest);
      } else {
        this.speakingQueue.push(turnRequest);
      }
  
      return true;
    }
  
    getNextSpeaker() {
      if (this.speakingQueue.length === 0) return null;
      
      // Consider social dynamics when selecting next speaker
      const priorityRequests = this.speakingQueue.filter(req => req.priority === 'high');
      if (priorityRequests.length > 0) {
        return this.speakingQueue.shift().participantId;
      }
  
      // Consider participants who haven't spoken recently
      const sortedQueue = [...this.speakingQueue].sort((a, b) => {
        const aLastSpoke = this.participants.get(a.participantId).stats.lastSpoke || 0;
        const bLastSpoke = this.participants.get(b.participantId).stats.lastSpoke || 0;
        return aLastSpoke - bLastSpoke;
      });
  
      return sortedQueue.length > 0 ? this.speakingQueue.shift().participantId : null;
    }
  
    // Interaction Pattern Tracking
    recordInteraction(fromId, toId, type) {
      const timestamp = Date.now();
      const from = this.participants.get(fromId);
      const to = this.participants.get(toId);
      
      if (!from || !to) return;
  
      // Update interaction patterns
      const pattern = this.socialState.interactionPatterns.get(fromId) || {};
      pattern[toId] = pattern[toId] || { direct: 0, responses: 0, mentions: 0 };
      pattern[toId][type]++;
      this.socialState.interactionPatterns.set(fromId, pattern);
  
      // Update recent mentions
      if (type === 'mention') {
        this.socialState.recentMentions.set(toId, timestamp);
      }
    }
  
    // Context Management
    updateContext(message) {
      const { topic, content, participantId, type } = message;
      
      // Update contextual memory
      const topicContext = this.contextualMemory.get(topic) || [];
      topicContext.push({
        content,
        participantId,
        type,
        timestamp: Date.now()
      });
      this.contextualMemory.set(topic, topicContext);
  
      // Track questions and unaddressed points
      if (type === 'question') {
        this.socialState.openQuestions.add(message.id);
      } else if (type === 'point') {
        this.socialState.unaddressedPoints.add(message.id);
      }
    }
  
    // Generate Context Summary for Participants
    generateContextPrompt(participantId) {
      const participant = this.participants.get(participantId);
      if (!participant) return '';
  
      const otherParticipants = Array.from(this.participants.values())
        .filter(p => p.id !== participantId)
        .map(p => `${p.name} (${p.role.type})`);
  
      const recentContext = Array.from(this.contextualMemory.entries())
        .map(([topic, messages]) => {
          const recentMessages = messages.slice(-3);
          return `${topic}:\n${recentMessages.map(m => 
            `- ${this.participants.get(m.participantId).name}: ${m.content}`
          ).join('\n')}`;
        })
        .join('\n\n');
  
      return `You are participating in a ${this.mode} conversation with ${otherParticipants.join(', ')}.
      
  Your role is ${participant.role.type}.
  
  Current context:
  ${recentContext}
  
  ${this.socialState.openQuestions.size > 0 ? 'There are open questions that need addressing.' : ''}
  ${this.socialState.unaddressedPoints.size > 0 ? 'There are points that haven\'t been fully discussed.' : ''}
  
  Conversation guidelines:
  1. Stay on topic and build upon others' contributions
  2. Ask for clarification when needed
  3. Address open questions when possible
  4. Acknowledge and respond to others' points
  5. Follow the turn-taking protocol for this ${this.mode} conversation`;
    }
  
    // Social Dynamics Analysis
    analyzeSocialDynamics() {
      const dynamics = {
        participationBalance: {},
        interactionNetwork: {},
        unaddressedNeeds: {
          questions: Array.from(this.socialState.openQuestions),
          points: Array.from(this.socialState.unaddressedPoints)
        }
      };
  
      // Calculate participation metrics
      for (const [id, participant] of this.participants) {
        dynamics.participationBalance[id] = {
          contributionShare: participant.stats.contributions / this.turnHistory.length,
          responseRate: participant.stats.responsesGiven / participant.stats.questionsAsked,
          interactionDiversity: this.calculateInteractionDiversity(id)
        };
      }
  
      return dynamics;
    }
  
    calculateInteractionDiversity(participantId) {
      const interactions = this.socialState.interactionPatterns.get(participantId);
      if (!interactions) return 0;
  
      const totalInteractions = Object.values(interactions)
        .reduce((sum, types) => sum + Object.values(types).reduce((a, b) => a + b, 0), 0);
      
      const interactionCounts = Object.values(interactions)
        .map(types => Object.values(types).reduce((a, b) => a + b, 0));
      
      // Calculate Shannon diversity index
      return interactionCounts.reduce((diversity, count) => {
        const p = count / totalInteractions;
        return diversity - (p * Math.log(p));
      }, 0);
    }
  }
  
  // Conversation mode definitions
  export const CONVERSATION_MODES = {
    'free-form': {
      name: 'Free-form Discussion',
      turnManagement: 'dynamic',
      description: 'Open discussion with natural turn-taking',
      rules: [
        'Participants can speak when appropriate',
        'Build on others\' contributions naturally',
        'Address points and questions as they arise'
      ]
    },
    'round-robin': {
      name: 'Round-robin Discussion',
      turnManagement: 'structured',
      description: 'Each participant takes turns in order',
      rules: [
        'Speak only during your turn',
        'Complete your point before passing',
        'Follow the established order'
      ]
    },
    'moderated': {
      name: 'Moderated Discussion',
      turnManagement: 'managed',
      description: 'Facilitator manages turn-taking and discussion flow',
      rules: [
        'Wait for facilitator recognition',
        'Stay focused on current topic',
        'Follow facilitator\'s guidance'
      ]
    },
    'brainstorming': {
      name: 'Brainstorming Session',
      turnManagement: 'rapid',
      description: 'Quick idea generation and building',
      rules: [
        'Share ideas freely',
        'Build on others\' ideas',
        'Defer evaluation',
        'Quantity over quality initially'
      ]
    },
    'structured-debate': {
      name: 'Structured Debate',
      turnManagement: 'formal',
      description: 'Formal discussion with clear positions',
      rules: [
        'Present arguments clearly',
        'Support claims with evidence',
        'Address counterpoints directly',
        'Maintain respectful discourse'
      ]
    }
  };
  
  // Helper functions for conversation management
  export const conversationUtils = {
    // Analyze interruption appropriateness
    analyzeInterruption: (context, interrupter, currentSpeaker) => {
      const interrupterStats = context.participants.get(interrupter);
      const speakerStats = context.participants.get(currentSpeaker);
      
      if (!interrupterStats || !speakerStats) return false;
  
      // Consider various factors
      const urgency = interrupterStats.stats.questionsAsked === 0;
      const turnBalance = interrupterStats.stats.turnsToken < speakerStats.stats.turnsToken;
      const timeSinceLastSpoke = Date.now() - (interrupterStats.stats.lastSpoke || 0);
  
      return {
        allowed: urgency || (turnBalance && timeSinceLastSpoke > 30000),
        reason: urgency ? 'urgent_question' : 'turn_balance'
      };
    },
  
    // Generate turn-taking suggestions
    suggestNextTurn: (context) => {
      const participants = Array.from(context.participants.values());
      
      // Consider various factors for turn suggestions
      const suggestions = participants.map(p => ({
        participantId: p.id,
        score: calculateParticipantScore(p, context),
        reason: determineReason(p, context)
      }));
  
      return suggestions.sort((a, b) => b.score - a.score);
    }
  };
  
  // Private helper functions
  function calculateParticipantScore(participant, context) {
    const timeSinceLastSpoke = Date.now() - (participant.stats.lastSpoke || 0);
    const participationBalance = participant.stats.turnsToken / context.turnHistory.length;
    const hasOpenQuestions = context.socialState.openQuestions.size > 0;
    const hasUnaddressedPoints = context.socialState.unaddressedPoints.size > 0;
  
    return (
      (timeSinceLastSpoke * 0.5) +
      ((1 - participationBalance) * 0.3) +
      (hasOpenQuestions ? 0.1 : 0) +
      (hasUnaddressedPoints ? 0.1 : 0)
    );
  }
  
  function determineReason(participant, context) {
    const stats = participant.stats;
    
    if (stats.turnsToken === 0) return 'hasn\'t_spoken';
    if (stats.questionsAsked > stats.responsesGiven) return 'has_unanswered_questions';
    if (context.socialState.openQuestions.size > 0) return 'open_questions_exist';
    if (context.socialState.unaddressedPoints.size > 0) return 'unaddressed_points_exist';
    
    return 'natural_turn';
  }