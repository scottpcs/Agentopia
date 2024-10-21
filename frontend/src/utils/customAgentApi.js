// src/utils/customAgentApi.js

class Agent {
    constructor(id, name, role) {
      this.id = id;
      this.name = name;
      this.role = role;
      this.memory = [];
    }
  
    async processMessage(message) {
      throw new Error('processMessage method must be implemented by subclasses');
    }
  
    addToMemory(message) {
      this.memory.push(message);
      if (this.memory.length > 10) {  // Limit memory to last 10 messages
        this.memory.shift();
      }
    }
  
    getMemory() {
      return this.memory;
    }
  }
  
  class AssistantAgent extends Agent {
    async processMessage(message) {
      console.log(`Assistant ${this.name} processing message:`, message);
      this.addToMemory(message);
      // In a real implementation, this would call an AI model API
      return `As an assistant named ${this.name}, I would respond: "${message}"`;
    }
  }
  
  class ExpertAgent extends Agent {
    constructor(id, name, role, expertise) {
      super(id, name, role);
      this.expertise = expertise;
    }
  
    async processMessage(message) {
      console.log(`Expert ${this.name} processing message:`, message);
      this.addToMemory(message);
      return `As an expert in ${this.expertise} named ${this.name}, I would provide a detailed analysis of: "${message}"`;
    }
  }
  
  class CriticAgent extends Agent {
    async processMessage(message) {
      console.log(`Critic ${this.name} processing message:`, message);
      this.addToMemory(message);
      return `As a critic named ${this.name}, I would critique the following aspects of: "${message}"`;
    }
  }
  
  class AgentRegistry {
    constructor() {
      this.agentTypes = new Map();
    }
  
    registerAgentType(typeName, AgentClass) {
      if (!(AgentClass.prototype instanceof Agent)) {
        throw new Error('AgentClass must extend the Agent base class');
      }
      this.agentTypes.set(typeName, AgentClass);
    }
  
    createAgent(typeName, id, name, role, additionalParams = {}) {
      const AgentClass = this.agentTypes.get(typeName);
      if (!AgentClass) {
        throw new Error(`Unknown agent type: ${typeName}`);
      }
      return new AgentClass(id, name, role, ...Object.values(additionalParams));
    }
  
    listAgentTypes() {
      return Array.from(this.agentTypes.keys());
    }
  }
  
  export const agentRegistry = new AgentRegistry();
  
  // Register default agent types
  agentRegistry.registerAgentType('assistant', AssistantAgent);
  agentRegistry.registerAgentType('expert', ExpertAgent);
  agentRegistry.registerAgentType('critic', CriticAgent);
  
  export { Agent, AssistantAgent, ExpertAgent, CriticAgent };