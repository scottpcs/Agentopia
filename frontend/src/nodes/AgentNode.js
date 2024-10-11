// src/nodes/AgentNode.js
import BaseNode from './BaseNode';
import { callOpenAI } from '../services/openaiService';

class AgentNode extends BaseNode {
  constructor(id, data) {
    super(id, 'agent', {
      name: data.name,
      type: data.type,
      role: data.role,
      model: data.model,
      apiKeyId: data.apiKeyId,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      instructions: data.instructions,
      context: [],
      structuredOutput: {},
      ...data
    });
    this.addInput('input');
    this.addOutput('output');
  }

  async process(inputData) {
    if (this.data.type === 'ai') {
      return this.processAI(inputData);
    } else {
      return this.processHuman(inputData);
    }
  }

  async processAI(inputData) {
    this.data.context.push({ role: 'user', content: inputData });
    const messages = [
      { role: 'system', content: this.data.instructions },
      ...this.data.context
    ];

    try {
      const response = await callOpenAI(
        this.data.apiKeyId,
        this.data.model,
        messages,
        this.data.temperature,
        this.data.maxTokens
      );
      
      this.data.context.push({ role: 'assistant', content: response });
      this.updateStructuredOutput(response);
      
      return response;
    } catch (error) {
      console.error('Error in AI processing:', error);
      return `Error: ${error.message}`;
    }
  }

  processHuman(inputData) {
    this.data.context.push({ role: 'human', content: inputData });
    return inputData; // In a real implementation, this would wait for actual human input
  }

  updateStructuredOutput(response) {
    // This is a simplified parser. In a real implementation, you'd use more sophisticated NLP techniques
    const lines = response.split('\n');
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        this.data.structuredOutput[key.trim()] = value.trim();
      }
    });
  }

  getStructuredOutput() {
    return this.data.structuredOutput;
  }
}

export default AgentNode;