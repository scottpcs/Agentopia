import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import CreativityAxes from './CreativityAxes';
import PreviewAgentBehavior from './PreviewAgentBehavior';
import { convertCreativityToModelSettings, generateCustomInstructions } from '../utils/creativityConverter';

const AgentWizardModal = ({ isOpen, onClose, onSave }) => {
  const [creativity, setCreativity] = useState({ x: 50, y: 50 });
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = () => {
    const modelSettings = convertCreativityToModelSettings(creativity);
    const customInstructions = generateCustomInstructions(creativity);
    
    const personalitySettings = {
      creativity,
      selectedPreset,
      modelSettings,
      customInstructions,
    };
    onSave(personalitySettings);
  };

  const applyPreset = (presetName) => {
    setSelectedPreset(presetName);
    // TODO: Implement preset application logic
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Customize Your Agent</h2>
          <Button onClick={onClose} variant="ghost" className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="mb-4">
          <Label htmlFor="preset-select" className="block mb-1 text-sm">Choose a preset:</Label>
          <select
            id="preset-select"
            value={selectedPreset}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full p-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Custom</option>
            <option value="creativeAssistant">Creative Assistant</option>
            <option value="analyticalAdvisor">Analytical Advisor</option>
          </select>
        </div>

        <div className="flex">
          <div className="w-2/3 pr-4">
            <CreativityAxes value={creativity} onChange={setCreativity} />
          </div>
          <div className="w-1/3">
            {/* Add additional personality traits or information here */}
          </div>
        </div>
        
        <PreviewAgentBehavior settings={{ creativity, selectedPreset }} />

        <div className="flex justify-end mt-4 space-x-2">
          <Button onClick={onClose} variant="outline" className="text-sm">Cancel</Button>
          <Button onClick={handleSave} className="text-sm">Save</Button>
        </div>
      </div>
    </div>
  );
};

export default AgentWizardModal;