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
    // Parse the input data to extract any structured information
    const { text, structuredData } = this.parseInput(inputData);

    // Update the context with the new input
    this.data.context.push({ role: 'user', content: text });

    // Prepare the messages for the API call
    const messages = [
      { role: 'system', content: this.generateSystemMessage() },
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
      
      // Parse the response and update the structured output
      const { text: responseText, structuredData: responseData } = this.parseOutput(response);
      
      this.data.context.push({ role: 'assistant', content: responseText });
      this.updateStructuredOutput(responseData);
      
      // Combine the response text with any structured data
      return {
        text: responseText,
        structuredData: this.data.structuredOutput
      };
    } catch (error) {
      console.error('Error in AI processing:', error);
      return { text: `Error: ${error.message}`, structuredData: {} };
    }
  }

  processHuman(inputData) {
    // For human nodes, we simply pass through the input
    // In a real implementation, this might involve waiting for actual human input
    this.data.context.push({ role: 'human', content: inputData.text });
    return inputData;
  }

  generateSystemMessage() {
    // Combine the role and instructions to create a comprehensive system message
    return `You are a ${this.data.role}. ${this.data.instructions}\n\nPlease format any structured data in your response using JSON, enclosed in triple backticks.`;
  }

  parseInput(inputData) {
    // If the input is already structured, return it as is
    if (typeof inputData === 'object' && inputData.text) {
      return inputData;
    }
    // Otherwise, assume it's just text
    return { text: inputData, structuredData: {} };
  }

  parseOutput(response) {
    const jsonRegex = /```json\n([\s\S]*?)\n```/;
    const match = response.match(jsonRegex);
    
    let structuredData = {};
    let text = response;

    if (match) {
      try {
        structuredData = JSON.parse(match[1]);
        // Remove the JSON block from the text
        text = response.replace(match[0], '').trim();
      } catch (error) {
        console.error('Error parsing JSON from response:', error);
      }
    }

    return { text, structuredData };
  }

  updateStructuredOutput(newData) {
    this.data.structuredOutput = {
      ...this.data.structuredOutput,
      ...newData
    };
  }

  getStructuredOutput() {
    return this.data.structuredOutput;
  }
}

export default AgentNode;