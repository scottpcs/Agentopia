import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Cross2Icon } from '@radix-ui/react-icons';
import { 
  Settings2, 
  MessageCircle, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Bot,
  User,
  Loader,
  AlertCircle,  // Added this import
  X,
  Plus,
  Grip
} from 'lucide-react';
import { MODEL_CONFIGS } from '../utils/modelConfigUtils';
import { validateModelConfig } from '../utils/modelConfigUtils';
import { generateAgentConfiguration } from '../utils/agentConfigConverter';
import ModelConfig from './ModelConfig';

const MODEL_OPTIONS = [
  { 
    value: 'gpt-4o-mini', 
    label: 'GPT-4o Mini', 
    description: 'Cost-effective model for most tasks ($0.15/1M tokens)' 
  },
  { 
    value: 'o3-mini', 
    label: 'O3 Mini', 
    description: 'Advanced model with improved capabilities ($1.10/1M tokens)' 
  },
  { 
    value: 'o1-mini', 
    label: 'O1 Mini', 
    description: 'Powerful model for specialized tasks ($1.10/1M tokens)' 
  },
  { 
    value: 'gpt-4o', 
    label: 'GPT-4o', 
    description: 'High-intelligence flagship model for complex tasks ($2.50/1M tokens)' 
  }
];

// Personality trait definitions
const PERSONALITY_TRAITS = [
  {
    name: 'creativity',
    label: 'Creativity Level',
    leftLabel: 'Practical',
    rightLabel: 'Imaginative'
  },
  {
    name: 'tone',
    label: 'Communication Tone',
    leftLabel: 'Formal',
    rightLabel: 'Casual'
  },
  {
    name: 'empathy',
    label: 'Empathy Level',
    leftLabel: 'Analytical',
    rightLabel: 'Empathetic'
  },
  {
    name: 'assertiveness',
    label: 'Assertiveness',
    leftLabel: 'Reserved',
    rightLabel: 'Direct'
  },
  {
    name: 'humor',
    label: 'Humor',
    leftLabel: 'Serious',
    rightLabel: 'Playful'
  },
  {
    name: 'optimism',
    label: 'Outlook',
    leftLabel: 'Cautious',
    rightLabel: 'Optimistic'
  }
];

// Role configuration options
const ROLE_TYPES = [
  { value: 'researcher', label: 'Researcher' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'planner', label: 'Project Planner' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'reviewer', label: 'Technical Reviewer' },
  { value: 'writer', label: 'Technical Writer' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'custom', label: 'Custom Role' }
];

const EXPERTISE_LEVELS = [
  { value: 'novice', label: 'Novice' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' }
];

// Initial state for a new agent
const initialAgentState = {
  personality: {
    creativity: 50,
    tone: 50,
    empathy: 50,
    assertiveness: 50,
    humor: 50,
    optimism: 50
  },
  role: {
    type: '',
    customRole: '',
    goalOrientation: 50,
    contributionStyle: 50,
    taskEmphasis: 50,
    domainScope: 50
  },
  expertise: {
    level: 'intermediate',
    knowledgeBalance: 50,
    selectedSkills: [],
    certainty: 50,
    responsibilityScope: 50
  },
  modelConfig: {
    model: 'gpt-4o',
    provider: 'openai',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048
    }
  }
};

// Slider component for configuration values
const PersonalitySlider = ({ label, value, onChange, leftLabel, rightLabel }) => {
  return (
    <div className="mb-4">
      <Label className="block mb-2">{label}</Label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-24">{leftLabel}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-grow h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-500 w-24 text-right">{rightLabel}</span>
      </div>
      <div className="text-xs text-gray-500 text-center mt-1">
        Current Value: {value}
      </div>
    </div>
  );
};
// Main AgentBuilder component
const AgentBuilder = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onUpdate, 
  onDelete, 
  agents = [], 
  apiKeys = [] 
}) => {
  // State management
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentName, setAgentName] = useState('');
  const [nameError, setNameError] = useState('');
  const [activeTab, setActiveTab] = useState('personality');
  const [isSaving, setIsSaving] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');
  const [modelError, setModelError] = useState('');
  const [generatedInstructions, setGeneratedInstructions] = useState('');
  const [isUsingCustomInstructions, setIsUsingCustomInstructions] = useState(false);

  // Configuration states
  const [personality, setPersonality] = useState(initialAgentState.personality);
  const [role, setRole] = useState(initialAgentState.role);
  const [expertise, setExpertise] = useState(initialAgentState.expertise);
  const [modelConfig, setModelConfig] = useState(initialAgentState.modelConfig);

  // Effect to load selected agent data
  useEffect(() => {
    if (selectedAgentId) {
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      if (selectedAgent) {
        setAgentName(selectedAgent.name);
        setPersonality(selectedAgent.personality || initialAgentState.personality);
        setRole(selectedAgent.role || initialAgentState.role);
        setExpertise(selectedAgent.expertise || initialAgentState.expertise);
        setModelConfig(selectedAgent.modelConfig || initialAgentState.modelConfig);
      }
    }
  }, [selectedAgentId, agents]);

  useEffect(() => {
    if (activeTab === 'model') {  // Only generate when model tab is active
      const config = generateAgentConfiguration({
        personality,
        role,
        expertise
      });
      
      setGeneratedInstructions(config.systemPrompt);
      
      if (!isUsingCustomInstructions) {
        setCustomInstructions(config.systemPrompt);
      }
    }
  }, [personality, role, expertise, activeTab, isUsingCustomInstructions]);

  const validateModelConfig = (config) => {
    if (!config.apiKeyId) {
      setModelError('API key is required');
      return false;
    }
    if (!config.model) {
      setModelError('Model selection is required');
      return false;
    }
    
    const modelLimits = MODEL_CONFIGS[config.model];
    if (!modelLimits) {
      setModelError('Invalid model selected');
      return false;
    }

    if (config.parameters) {
      const { temperature, maxTokens } = config.parameters;
      if (temperature < modelLimits.temperatureRange.min || 
          temperature > modelLimits.temperatureRange.max) {
        setModelError(`Temperature must be between ${modelLimits.temperatureRange.min} and ${modelLimits.temperatureRange.max}`);
        return false;
      }
      if (maxTokens <= 0 || maxTokens > modelLimits.maxTokens) {
        setModelError(`Max tokens must be between 1 and ${modelLimits.maxTokens}`);
        return false;
      }
    }

    setModelError('');
    return true;
  };

  // Reset form to initial state
  const resetForm = () => {
    setAgentName('');
    setPersonality(initialAgentState.personality);
    setRole(initialAgentState.role);
    setExpertise(initialAgentState.expertise);
    setModelConfig(initialAgentState.modelConfig);
    setGeneratedInstructions('');
    setCustomInstructions('');
    setIsUsingCustomInstructions(false);
    setNameError('');
  };

  // Handle creating new agent
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedAgentId(null);
    resetForm();
  };

  // Handle selecting existing agent
  const handleSelectAgent = (agentId) => {
    setIsCreatingNew(false);
    setSelectedAgentId(agentId);
    setNameError('');
  };

  // Validate agent name
  const validateName = () => {
    if (!agentName.trim()) {
      setNameError('Agent name is required');
      return false;
    }
    if (!isCreatingNew && selectedAgentId === null) {
      setNameError('Please select an agent to edit');
      return false;
    }
    const nameExists = agents.some(a => 
      a.name.toLowerCase() === agentName.trim().toLowerCase() && 
      a.id !== selectedAgentId
    );
    if (nameExists) {
      setNameError('An agent with this name already exists');
      return false;
    }
    setNameError('');
    return true;
  };

  // Validate before saving
  const validateForm = () => {
    if (!agentName.trim()) {
      setNameError('Agent name is required');
      setActiveTab('info');
      return false;
    }

    if (!modelConfig.apiKeyId) {
      setNameError('API key is required');
      setActiveTab('model');
      return false;
    }

    if (!modelConfig.model) {
      setNameError('Model selection is required');
      setActiveTab('model');
      return false;
    }

    return true;
  };

  // Handle saving agent
  const handleSave = async () => {
    if (!validateForm()) return;
  
    try {
      setIsSaving(true);
      const agentConfig = {
        id: selectedAgentId || `aiAgent-${Date.now()}`,
        name: agentName.trim(),
        type: 'ai',
        apiKeyId: modelConfig.apiKeyId, // Ensure this is set
        modelConfig: {
          ...modelConfig,
          apiKeyId: modelConfig.apiKeyId
        },
        data: {
          name: agentName.trim(),
          type: 'ai',
          personality,
          role: {
            ...role,
            type: role.type === 'custom' ? role.customRole : role.type
          },
          expertise,
          modelConfig: {
            ...modelConfig,
            apiKeyId: modelConfig.apiKeyId
          },
          apiKeyId: modelConfig.apiKeyId
        }
      };
  
      console.log('Saving agent configuration:', agentConfig);
      
      if (isCreatingNew) {
        await onSave(agentConfig);
      } else {
        await onUpdate(selectedAgentId, agentConfig);
      }
  
      onClose();
    } catch (error) {
      setNameError('Failed to save agent: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deleting agent
  const handleDelete = async () => {
    if (selectedAgentId && window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await onDelete(selectedAgentId);
        handleCreateNew();
      } catch (error) {
        console.error('Error deleting agent:', error);
        setNameError('Failed to delete agent: ' + error.message);
      }
    }
  };

  // Filter agents based on search term
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'personality':
        return (
          <div className="space-y-6">
            {PERSONALITY_TRAITS.map(trait => (
              <PersonalitySlider
                key={trait.name}
                label={trait.label}
                value={personality[trait.name]}
                onChange={(value) => setPersonality(prev => ({ ...prev, [trait.name]: value }))}
                leftLabel={trait.leftLabel}
                rightLabel={trait.rightLabel}
              />
            ))}
          </div>
        );

      case 'role':
        return (
          <div className="space-y-6">
            <div className="mb-4">
              <Label>Role Type</Label>
              <select
                value={role.type}
                onChange={(e) => setRole(prev => ({ ...prev, type: e.target.value }))}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Select a role...</option>
                {ROLE_TYPES.map(roleType => (
                  <option key={roleType.value} value={roleType.value}>
                    {roleType.label}
                  </option>
                ))}
              </select>
            </div>

            {role.type === 'custom' && (
              <div className="mb-4">
                <Label>Custom Role Name</Label>
                <Input
                  value={role.customRole}
                  onChange={(e) => setRole(prev => ({ ...prev, customRole: e.target.value }))}
                  placeholder="Enter custom role name"
                  className="mt-1"
                />
              </div>
            )}

            <PersonalitySlider
              label="Goal Orientation"
              value={role.goalOrientation}
              onChange={(value) => setRole(prev => ({ ...prev, goalOrientation: value }))}
              leftLabel="Execution-focused"
              rightLabel="Exploration-focused"
            />
            <PersonalitySlider
              label="Contribution Style"
              value={role.contributionStyle}
              onChange={(value) => setRole(prev => ({ ...prev, contributionStyle: value }))}
              leftLabel="Generator"
              rightLabel="Evaluator"
            />
            <PersonalitySlider
              label="Task Emphasis"
              value={role.taskEmphasis}
              onChange={(value) => setRole(prev => ({ ...prev, taskEmphasis: value }))}
              leftLabel="Problem-Solving"
              rightLabel="Planning"
            />
            <PersonalitySlider
              label="Domain Scope"
              value={role.domainScope}
              onChange={(value) => setRole(prev => ({ ...prev, domainScope: value }))}
              leftLabel="Specialized"
              rightLabel="Broad"
            />
          </div>
        );

      case 'expertise':
        return (
          <div className="space-y-6">
            <div className="mb-4">
              <Label>Expertise Level</Label>
              <select
                value={expertise.level}
                onChange={(e) => setExpertise(prev => ({ ...prev, level: e.target.value }))}
                className="w-full mt-1 p-2 border rounded-md"
              >
                {EXPERTISE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <PersonalitySlider
              label="Knowledge Balance"
              value={expertise.knowledgeBalance}
              onChange={(value) => setExpertise(prev => ({ ...prev, knowledgeBalance: value }))}
              leftLabel="Broad Knowledge"
              rightLabel="Deep Specialization"
            />

            <PersonalitySlider
              label="Certainty Level"
              value={expertise.certainty}
              onChange={(value) => setExpertise(prev => ({ ...prev, certainty: value }))}
              leftLabel="Cautious"
              rightLabel="Confident"
            />

            <PersonalitySlider
              label="Responsibility Scope"
              value={expertise.responsibilityScope}
              onChange={(value) => setExpertise(prev => ({ ...prev, responsibilityScope: value }))}
              leftLabel="Advisory"
              rightLabel="Decisive"
            />
          </div>
        );

        case 'model':
          return (
            <div className="space-y-6">
              <div>
                <Label>Model Selection</Label>
                <select
                  value={modelConfig.model || 'gpt-4o-mini'}
                  onChange={(e) => setModelConfig(prev => ({
                    ...prev,
                    model: e.target.value
                  }))}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  {MODEL_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  {MODEL_OPTIONS.find(m => m.value === modelConfig.model)?.description}
                </p>
              </div>
  
              <div>
                <Label>API Key</Label>
                <select
                  value={modelConfig.apiKeyId || ''}
                  onChange={(e) => setModelConfig(prev => ({
                    ...prev,
                    apiKeyId: e.target.value
                  }))}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="">Select API Key</option>
                  {apiKeys.map(key => (
                    <option key={key.id} value={key.name}>
                      {key.name}
                    </option>
                  ))}
                </select>
                {!modelConfig.apiKeyId && (
                  <p className="text-sm text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    API key required for model usage
                  </p>
                )}
              </div>
  
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Model Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <Label>Temperature</Label>
                      <span className="text-sm text-gray-500">
                        {modelConfig.parameters?.temperature?.toFixed(2) || '0.70'}
                      </span>
                    </div>
                    <Input
                      type="range"
                      min={0}
                      max={2}
                      step="0.1"
                      value={modelConfig.parameters?.temperature || 0.7}
                      onChange={(e) => setModelConfig(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          temperature: parseFloat(e.target.value)
                        }
                      }))}
                      className="mt-1.5"
                    />
                  </div>
  
                  <div>
                    <div className="flex justify-between">
                      <Label>Max Tokens</Label>
                      <span className="text-sm text-gray-500">
                        {modelConfig.parameters?.maxTokens || '2048'}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max={MODEL_CONFIGS[modelConfig.model || 'gpt-4o-mini']?.maxTokens || 4096}
                      value={modelConfig.parameters?.maxTokens || 2048}
                      onChange={(e) => setModelConfig(prev => ({
                        ...prev,
                        parameters: {
                          ...prev.parameters,
                          maxTokens: parseInt(e.target.value)
                        }
                      }))}
                      className="mt-1.5"
                    />
                  </div>
                </CardContent>
              </Card>
  
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Generated Instructions</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setCustomInstructions(generatedInstructions);
                          setIsUsingCustomInstructions(false);
                        }}
                        disabled={!isUsingCustomInstructions}
                      >
                        Reset to Generated
                      </Button>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap border border-gray-200">
                      {generatedInstructions}
                    </div>
                  </div>
  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Custom Instructions</Label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="useCustom" className="text-sm">Use Custom</Label>
                        <input
                          type="checkbox"
                          id="useCustom"
                          checked={isUsingCustomInstructions}
                          onChange={(e) => setIsUsingCustomInstructions(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </div>
                    </div>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => {
                        setCustomInstructions(e.target.value);
                        setIsUsingCustomInstructions(true);
                      }}
                      placeholder="Modify instructions or use generated ones..."
                      className="w-full h-48 p-2 text-sm border rounded-md"
                      disabled={!isUsingCustomInstructions}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl">
          <div className="flex h-full">
            {/* Left sidebar for agent selection */}
            <div className="w-64 border-r border-gray-200 p-4">
              <div className="mb-4">
                <Button 
                  onClick={handleCreateNew}
                  className="w-full mb-4"
                >
                  Create New Agent
                </Button>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[calc(90vh-200px)]">
                {filteredAgents.map(agent => (
                  <Card
                    key={agent.id}
                    className={`cursor-pointer transition-colors ${
                      selectedAgentId === agent.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectAgent(agent.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500">
                            {agent.role?.type || 'Custom Agent'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
  
            {/* Main content area */}
            <div className="flex-1 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {isCreatingNew ? 'Create New Agent' : 'Edit Agent'}
                  </h2>
                  <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="p-1 h-auto"
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </Button>
                </div>
  
                {/* Agent name input */}
                <div className="mb-6">
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input
                    id="agentName"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Enter agent name"
                    className={`mt-1 ${nameError ? 'border-red-500' : ''}`}
                  />
                  {nameError && (
                    <p className="text-red-500 text-sm mt-1">{nameError}</p>
                  )}
                </div>
  
                {/* Configuration tabs */}
                <div className="flex gap-2 mb-4 border-b border-gray-200">
                  {['personality', 'role', 'expertise', 'model'].map(tab => (
                    <Button
                      key={tab}
                      variant={activeTab === tab ? 'default' : 'ghost'}
                      onClick={() => setActiveTab(tab)}
                      className="relative px-4 py-2"
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
  
              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">
                {renderTabContent()}
              </div>
  
              {/* Footer with action buttons */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    {!isCreatingNew && (
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isSaving}
                      >
                        Delete Agent
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={onClose}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="min-w-[100px]"
                    >
                      {isSaving ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-opacity-50 border-t-white mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        isCreatingNew ? 'Create Agent' : 'Update Agent'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AgentBuilder.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  agents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      role: PropTypes.shape({
        type: PropTypes.string,
        customRole: PropTypes.string,
      }),
      personality: PropTypes.object,
      expertise: PropTypes.object,
      modelConfig: PropTypes.object,
    })
  ),
  apiKeys: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

AgentBuilder.defaultProps = {
  agents: [],
  apiKeys: [],
};

export default AgentBuilder;