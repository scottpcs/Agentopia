// src/utils/conversationIntegration.js

import { ConversationContextManager, CONVERSATION_MODES } from './conversationContextManager';
import { analyzeMessage } from './conversationHelpers';

export class ConversationIntegrator {
  constructor(initialConfig = {}) {
    this.contextManager = new ConversationContextManager(initialConfig);
    this.activeTopics = new Set();
    this.messageQueue = [];
    this.responseTimeout = initialConfig.responseTimeout || 30000; // 30 seconds
  }

  // Initialize conversation with participants
  setupConversation(participants, mode = 'free-form') {
    participants.forEach(participant => {
      this.contextManager.addParticipant(participant);
    });
    this.contextManager.mode = mode;
  }

  // Generate system instructions for an AI agent
  generateAgentInstructions(agentId) {
    const baseContext = this.contextManager.generateContextPrompt(agentId);
    const modeRules = CONVERSATION_MODES[this.contextManager.mode].rules;
    const participantContext = this.getParticipantContext(agentId);

    return `${baseContext}

Specific Guidelines for ${this.contextManager.mode}:
${modeRules.map(rule => `- ${rule}`).join('\n')}

Current Conversation State:
${participantContext}

Remember to:
1. Stay in character as per your role and expertise
2. Follow the conversation mode rules
3. Engage naturally with other participants
4. Address any relevant open questions or points
5. Acknowledge and build upon others' contributions`;
  }

  // Process incoming message and determine appropriate responses
  async processMessage(message, senderId) {
    const analysis = analyzeMessage(message.content);
    
    // Update conversation context
    this.contextManager.updateContext({
      ...message,
      analysis,
      type: analysis.type
    });

    // Handle mentions and questions
    if (analysis.mentions.length > 0) {
      analysis.mentions.forEach(mention => {
        const mentionedParticipant = this.findParticipantByName(mention);
        if (mentionedParticipant) {
          this.contextManager.recordInteraction(senderId, mentionedParticipant.id, 'mention');
        }
      });
    }

    // Determine who should respond
    const responseQueue = this.determineRespondents(message, analysis);
    
    return {
      analysis,
      responseQueue,
      updatedContext: this.contextManager.analyzeSocialDynamics()
    };
  }

  // Determine who should respond to a message
  determineRespondents(message, analysis) {
    const respondents = new Set();

    // Add directly mentioned participants
    analysis.mentions.forEach(mention => {
      const participant = this.findParticipantByName(mention);
      if (participant) {
        respondents.add(participant.id);
      }
    });

    // Add participants based on expertise and role
    if (analysis.type === 'question') {
      const expertParticipants = this.findExpertsForTopics(analysis.topics);
      expertParticipants.forEach(expert => respondents.add(expert.id));
    }

    // Add participants based on conversation mode rules
    switch (this.contextManager.mode) {
      case 'round-robin':
        const nextSpeaker = this.contextManager.getNextSpeaker();
        if (nextSpeaker) respondents.add(nextSpeaker);
        break;
      
      case 'moderated':
        // Add moderator to response queue
        const moderator = Array.from(this.contextManager.participants.values())
          .find(p => p.role.type === 'moderator');
        if (moderator) respondents.add(moderator.id);
        break;

      case 'structured-debate':
        // Add participants with opposing viewpoints
        const opposingView = this.findOpposingViewpoint(message.senderId);
        if (opposingView) respondents.add(opposingView.id);
        break;
    }

    return Array.from(respondents);
  }

  // Get relevant context for a participant
  getParticipantContext(participantId) {
    const participant = this.contextManager.participants.get(participantId);
    if (!participant) return '';

    const dynamics = this.contextManager.analyzeSocialDynamics();
    const participantMetrics = dynamics.participationBalance[participantId];

    let context = `Active Topics: ${Array.from(this.activeTopics).join(', ')}

Your Participation Metrics:
- Contribution Share: ${(participantMetrics.contributionShare * 100).toFixed(1)}%
- Response Rate: ${(participantMetrics.responseRate * 100).toFixed(1)}%
- Interaction Diversity: ${participantMetrics.interactionDiversity.toFixed(2)}

Current Discussion State:`;

    // Add unaddressed points if relevant
    if (dynamics.unaddressedNeeds.points.length > 0) {
      context += '\n\nUnaddressed Points:';
      dynamics.unaddressedNeeds.points.slice(0, 3).forEach(point => {
        context += `\n- ${point}`;
      });
    }

    // Add open questions if relevant
    if (dynamics.unaddressedNeeds.questions.length > 0) {
      context += '\n\nOpen Questions:';
      dynamics.unaddressedNeeds.questions.slice(0, 3).forEach(question => {
        context += `\n- ${question}`;
      });
    }

    return context;
  }

  // Find participants based on expertise
  findExpertsForTopics(topics) {
    return Array.from(this.contextManager.participants.values())
      .filter(participant => {
        if (!participant.expertise?.selectedSkills) return false;
        return topics.some(topic => 
          participant.expertise.selectedSkills.some(skill => 
            skill.toLowerCase().includes(topic.toLowerCase())
          )
        );
      });
  }

  // Find participant with opposing viewpoint (for debates)
  findOpposingViewpoint(currentSpeakerId) {
    const currentSpeaker = this.contextManager.participants.get(currentSpeakerId);
    if (!currentSpeaker?.role?.viewpoint) return null;

    return Array.from(this.contextManager.participants.values())
      .find(p => 
        p.id !== currentSpeakerId && 
        p.role?.viewpoint && 
        p.role.viewpoint !== currentSpeaker.role.viewpoint
      );
  }

  // Helper to find participant by name
  findParticipantByName(name) {
    return Array.from(this.contextManager.participants.values())
      .find(p => p.name.toLowerCase() === name.toLowerCase());
  }

  // Update conversation metrics after a response
  updateConversationMetrics(participantId, responseType) {
    const participant = this.contextManager.participants.get(participantId);
    if (!participant) return;

    participant.stats.contributions++;
    participant.stats.lastSpoke = Date.now();

    if (responseType === 'question') {
      participant.stats.questionsAsked++;
    } else if (responseType === 'answer') {
      participant.stats.responsesGiven++;
    }

    this.contextManager.participants.set(participantId, participant);
  }
}