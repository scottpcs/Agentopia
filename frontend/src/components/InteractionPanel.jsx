import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { callOpenAI } from '../services/openaiService';

const InteractionPanel = ({ node, onChange, onClose }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (input.trim()) {
      setIsLoading(true);
      const updatedContext = [...(node.data.context || []), { role: 'user', content: input }];
      onChange(node.id, { context: updatedContext, lastInput: input });

      if (node.type === 'agent' && node.data.type === 'ai') {
        try {
          const { apiKeyId, model, temperature, maxTokens, instructions } = node.data;
          const messages = [
            { role: 'system', content: instructions || 'You are a helpful assistant.' },
            ...updatedContext
          ];

          const response = await callOpenAI(
            apiKeyId,
            model,
            messages,
            temperature,
            maxTokens
          );

          const newContext = [...updatedContext, { role: 'assistant', content: response }];
          onChange(node.id, { context: newContext, lastOutput: response });
        } catch (error) {
          console.error('Error calling OpenAI:', error);
          onChange(node.id, { lastOutput: `Error: ${error.message}` });
        }
      }

      setInput('');
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (node.type) {
      case 'agent':
        return (
          <>
            <div className="mb-4">
              <Label>Interaction History:</Label>
              <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto">
                {node.data.context && node.data.context.map((message, index) => (
                  <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                    <strong>{message.role === 'user' ? 'You: ' : 'Agent: '}</strong>{message.content}
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="input">Your message:</Label>
              <Input
                id="input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Type your message here..."
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleSend} disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
            {node.data.type === 'ai' && (
              <div className="mt-4">
                <p>Current AI Model: {node.data.model}</p>
                <p>Temperature: {node.data.temperature}</p>
                <p>Max Tokens: {node.data.maxTokens}</p>
              </div>
            )}
          </>
        );
      case 'textInput':
        return (
          <div className="mb-4">
            <Label htmlFor="inputText">Input Text:</Label>
            <Input
              id="inputText"
              value={node.data.inputText || ''}
              onChange={(e) => onChange(node.id, { inputText: e.target.value })}
              placeholder="Enter input text..."
            />
          </div>
        );
      case 'textOutput':
        return (
          <div className="mb-4">
            <Label>Output Text:</Label>
            <div className="bg-gray-100 p-2 rounded">{node.data.text || 'No output yet'}</div>
          </div>
        );
      case 'humanInteraction':
        return (
          <>
            <div className="mb-4">
              <Label>Received Message:</Label>
              <div className="bg-gray-100 p-2 rounded">{node.data.receivedMessage || 'No message received yet'}</div>
            </div>
            <div className="mb-4">
              <Label htmlFor="response">Your Response:</Label>
              <Input
                id="response"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your response here..."
              />
            </div>
            <Button onClick={handleSend}>Send Response</Button>
          </>
        );
      default:
        return <div>No interaction available for this node type.</div>;
    }
  };

  return (
    <div className="interaction-panel fixed right-0 top-0 h-full w-96 bg-white shadow-lg p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Node Interaction: {node.data.name || node.id}</h3>
        <Button onClick={onClose}>Close</Button>
      </div>
      {renderContent()}
    </div>
  );
};

export default InteractionPanel;