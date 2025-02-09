// agentIdentityManager.js

export class AgentState {
    constructor(agent) {
      this.id = agent.id;
      this.name = agent.name;
      this.role = agent.role;
      this.type = agent.type;
      this.context = [];
      this.lastInteraction = null;
      this.personality = agent.personality;
      this.expertise = agent.expertise;
      this.modelConfig = agent.modelConfig;
    }
  
    addContext(message) {
      this.context.push({
        ...message,
        timestamp: new Date().toISOString()
      });
      this.lastInteraction = new Date();
    }
  
    getContext() {
      return this.context;
    }
  
    getSystemPrompt() {
      const roleDesc = this.role?.type ? ` acting as ${this.role.type}` : '';
      return `You are ${this.name}${roleDesc}. Maintain this identity throughout the conversation. 
      Your responses should reflect your assigned role and expertise.`;
    }
  }
  
  export class AgentIdentityManager {
    constructor() {
      this.agentStates = new Map();
      this.workflowStates = new Map();
    }
  
    getOrCreateAgentState(agent, workflowId) {
      const stateKey = `${workflowId}-${agent.id}`;
      if (!this.agentStates.has(stateKey)) {
        this.agentStates.set(stateKey, new AgentState(agent));
      }
      return this.agentStates.get(stateKey);
    }
  
    updateAgentContext(workflowId, agentId, message) {
      const stateKey = `${workflowId}-${agentId}`;
      const agentState = this.agentStates.get(stateKey);
      if (agentState) {
        agentState.addContext(message);
      }
    }
  
    getAgentContext(workflowId, agentId) {
      const stateKey = `${workflowId}-${agentId}`;
      return this.agentStates.get(stateKey)?.getContext() || [];
    }
  
    clearWorkflowState(workflowId) {
      // Remove all agent states for this workflow
      for (const [key] of this.agentStates) {
        if (key.startsWith(`${workflowId}-`)) {
          this.agentStates.delete(key);
        }
      }
    }
  }
  
  // Export singleton instance
  export const agentIdentityManager = new AgentIdentityManager();