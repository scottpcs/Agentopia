import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const PreviewAgentBehavior = ({ settings }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  const handleTest = async () => {
    // TODO: Replace this with actual API call to test agent
    const mockResponse = `This is a mock response based on your settings:
    Creativity: X=${settings.creativity.x}, Y=${settings.creativity.y}
    Preset: ${settings.selectedPreset || 'Custom'}
    
    Your prompt: "${prompt}"
    
    Agent response: Based on the creativity settings, I would respond with 
    ${settings.creativity.x > 50 ? 'more imaginative' : 'more grounded'} and 
    ${settings.creativity.y > 50 ? 'more effusive' : 'more reserved'} language.`;
    
    setResponse(mockResponse);
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-2">Preview Agent Behavior</h3>
      <Input 
        placeholder="Enter test prompt here..." 
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mb-2"
      />
      <Button onClick={handleTest} className="mb-2">Test Agent</Button>
      {response && (
        <div className="bg-gray-100 p-4 rounded-lg mt-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-700">{response}</pre>
        </div>
      )}
    </div>
  );
};

export default PreviewAgentBehavior;