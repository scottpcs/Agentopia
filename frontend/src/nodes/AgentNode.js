import BaseNode from './BaseNode';
import { callOpenAI } from '../services/openaiService';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';

class AgentNode extends BaseNode {
  constructor(id, data) {
    super(id, 'agent', {
      name: data.name || 'AI Agent',
      type: data.type || 'ai',
      role: data.role,
      personality: data.personality,
      expertise: data.expertise,
      modelConfig: data.modelConfig || {
        model: 'gpt-4o',
        provider: 'openai',
        parameters: {
          temperature: 0.7,
          maxTokens: 2048
        }
      },
      apiKeyId: data.apiKeyId,
      instructions: data.instructions,
      context: [],
      structuredOutput: {},
      onChange: data.onChange,
      onCreateAgent: data.onCreateAgent,
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
    console.log('Processing AI node input:', {
      nodeId: this.id,
      model: this.data.modelConfig?.model,
      apiKey: this.data.apiKeyId,
      inputType: typeof inputData
    });

    // Parse the input data to extract any structured information
    const { text, structuredData } = this.parseInput(inputData);

    // Update the context with the new input
    this.data.context.push({ role: 'user', content: text });

    try {
      // Generate the complete agent configuration including system prompt
      const agentConfig = generateAgentConfiguration({
        personality: this.data.personality || {},
        role: this.data.role || {},
        expertise: this.data.expertise || {}
      });

      // Prepare the messages for the API call
      const messages = [
        { 
          role: 'system', 
          content: agentConfig.systemPrompt 
        },
        ...this.data.context
      ];

      console.log('Calling OpenAI with configuration:', {
        model: this.data.modelConfig?.model,
        temperature: this.data.modelConfig?.parameters?.temperature,
        maxTokens: this.data.modelConfig?.parameters?.maxTokens,
        messageCount: messages.length
      });

      const response = await callOpenAI(
        this.data.apiKeyId,
        this.data.modelConfig?.model || 'gpt-4o',
        messages,
        this.data.modelConfig?.parameters?.temperature || 0.7,
        this.data.modelConfig?.parameters?.maxTokens || 2048,
        this.data.instructions
      );
      
      // Parse the response and update the structured output
      const { text: responseText, structuredData: responseData } = this.parseOutput(response);
      
      this.data.context.push({ role: 'assistant', content: responseText });
      this.updateStructuredOutput(responseData);
      
      // If there's an onChange handler, call it with the updated data
      if (this.data.onChange) {
        this.data.onChange(this.id, { 
          context: this.data.context,
          lastOutput: responseText,
          structuredOutput: this.data.structuredOutput
        });
      }

      // Combine the response text with any structured data
      return {
        text: responseText,
        structuredData: this.data.structuredOutput
      };
    } catch (error) {
      console.error('Error in AI processing:', error);
      
      // Update node state with error
      if (this.data.onChange) {
        this.data.onChange(this.id, { 
          error: error.message,
          lastOutput: `Error: ${error.message}`
        });
      }
      
      throw error;
    }
  }

  processHuman(inputData) {
    console.log('Processing Human node input:', {
      nodeId: this.id,
      inputType: typeof inputData
    });

    // For human nodes, we simply pass through the input
    // In a real implementation, this might involve waiting for actual human input
    this.data.context.push({ role: 'human', content: inputData.text });

    // If there's an onChange handler, call it with the updated data
    if (this.data.onChange) {
      this.data.onChange(this.id, { 
        context: this.data.context,
        lastInput: inputData.text
      });
    }

    return inputData;
  }

  generateSystemMessage() {
    // Use the agent configuration to generate a comprehensive system message
    const agentConfig = generateAgentConfiguration({
      personality: this.data.personality || {},
      role: this.data.role || {},
      expertise: this.data.expertise || {}
    });

    return agentConfig.systemPrompt;
  }

  parseInput(inputData) {
    // If the input is already structured, return it as is
    if (typeof inputData === 'object' && inputData.text) {
      return inputData;
    }
    
    // If input is a string, convert it to the expected format
    if (typeof inputData === 'string') {
      return { text: inputData, structuredData: {} };
    }

    // Default case
    return { text: String(inputData), structuredData: {} };
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

  // Helper method to get the current context
  getContext() {
    return this.data.context;
  }

  // Helper method to clear the context
  clearContext() {
    this.data.context = [];
    if (this.data.onChange) {
      this.data.onChange(this.id, { context: [] });
    }
  }
}

export default AgentNode;