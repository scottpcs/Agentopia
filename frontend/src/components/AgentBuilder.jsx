import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from 'lucide-react';
import { Cross2Icon } from '@radix-ui/react-icons';
import ModelConfig from './ModelConfig';

// Constants
const COMMON_ROLES = [
  { value: 'researcher', label: 'Researcher' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'planner', label: 'Project Planner' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'reviewer', label: 'Technical Reviewer' },
  { value: 'writer', label: 'Technical Writer' },
  { value: 'consultant', label: 'Consultant' }
];

const SPECIALIZED_SKILLS = [
  'Statistics',
  'Machine Learning',
  'Data Analysis',
  'Software Development',
  'Technical Writing',
  'Project Management',
  'Quality Assurance',
  'Requirements Analysis'
];

// Slider Component
const PersonalitySlider = ({ label, value, onChange, leftLabel, rightLabel }) => {
  console.log(`Rendering slider: ${label} with value: ${value}`);
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
          onChange={(e) => {
            const newValue = parseInt(e.target.value);
            console.log(`Slider ${label} changed to: ${newValue}`);
            onChange(newValue);
          }}
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

const AgentBuilder = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onUpdate, 
  onDelete, 
  agents = [], 
  apiKeys = [] 
}) => {
  // State Management
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentName, setAgentName] = useState('');
  const [nameError, setNameError] = useState('');
  const [activeTab, setActiveTab] = useState('personality');
  const [isSaving, setIsSaving] = useState(false);

  // Configuration States
  const [personality, setPersonality] = useState({
    creativity: 50,
    tone: 50,
    empathy: 50,
    assertiveness: 50,
    humor: 50,
    optimism: 50
  });

  const [role, setRole] = useState({
    type: '',
    customRole: '',
    goalOrientation: 50,
    contributionStyle: 50,
    taskEmphasis: 50,
    domainScope: 50
  });

  const [expertise, setExpertise] = useState({
    level: 'intermediate',
    knowledgeBalance: 50,
    selectedSkills: [],
    certainty: 50,
    responsibilityScope: 50
  });

  const [modelConfig, setModelConfig] = useState({
    model: 'gpt-4o',
    provider: 'openai',
    parameters: {
      temperature: 0.7,
      maxTokens: 2048
    }
  });

  // Effects
  useEffect(() => {
    if (selectedAgentId) {
      const selectedAgent = agents.find(a => a.id === selectedAgentId);
      if (selectedAgent) {
        setAgentName(selectedAgent.name);
        setPersonality(selectedAgent.personality || personality);
        setRole(selectedAgent.role || role);
        setExpertise(selectedAgent.expertise || expertise);
        setModelConfig(selectedAgent.modelConfig || modelConfig);
      }
    }
  }, [selectedAgentId, agents]);

  // Reset Form Function
  const resetForm = () => {
    console.log('Resetting form');
    setAgentName('');
    setPersonality({
      creativity: 50,
      tone: 50,
      empathy: 50,
      assertiveness: 50,
      humor: 50,
      optimism: 50
    });
    setRole({
      type: '',
      customRole: '',
      goalOrientation: 50,
      contributionStyle: 50,
      taskEmphasis: 50,
      domainScope: 50
    });
    setExpertise({
      level: 'intermediate',
      knowledgeBalance: 50,
      selectedSkills: [],
      certainty: 50,
      responsibilityScope: 50
    });
    setModelConfig({
      model: 'gpt-4o',
      provider: 'openai',
      parameters: {
        temperature: 0.7,
        maxTokens: 2048
      }
    });
    setNameError('');
  };

  // Handler Functions
  const handleCreateNew = () => {
    console.log('Creating new agent');
    setIsCreatingNew(true);
    setSelectedAgentId(null);
    resetForm();
  };

  const handleSelectAgent = (agentId) => {
    console.log('Selecting agent:', agentId);
    setIsCreatingNew(false);
    setSelectedAgentId(agentId);
    setNameError('');
  };

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

  const handleSave = async () => {
    if (!validateName()) {
      setActiveTab('info');
      return;
    }

    try {
      setIsSaving(true);
      const agentConfig = {
        name: agentName.trim(),
        personality,
        role: {
          ...role,
          type: role.type === 'custom' ? role.customRole : role.type
        },
        expertise,
        modelConfig
      };

      if (isCreatingNew) {
        await onSave(agentConfig);
      } else {
        await onUpdate(selectedAgentId, agentConfig);
      }

      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      setNameError('Failed to save agent: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

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

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'personality':
        return (
          <div className="space-y-6">
            <PersonalitySlider
              label="Creativity Level"
              value={personality.creativity}
              onChange={(value) => setPersonality(prev => ({ ...prev, creativity: value }))}
              leftLabel="Practical"
              rightLabel="Imaginative"
            />
            <PersonalitySlider
              label="Communication Tone"
              value={personality.tone}
              onChange={(value) => setPersonality(prev => ({ ...prev, tone: value }))}
              leftLabel="Formal"
              rightLabel="Casual"
            />
            <PersonalitySlider
              label="Empathy Level"
              value={personality.empathy}
              onChange={(value) => setPersonality(prev => ({ ...prev, empathy: value }))}
              leftLabel="Analytical"
              rightLabel="Empathetic"
            />
            <PersonalitySlider
              label="Assertiveness"
              value={personality.assertiveness}
              onChange={(value) => setPersonality(prev => ({ ...prev, assertiveness: value }))}
              leftLabel="Reserved"
              rightLabel="Direct"
            />
            <PersonalitySlider
              label="Humor"
              value={personality.humor}
              onChange={(value) => setPersonality(prev => ({ ...prev, humor: value }))}
              leftLabel="Serious"
              rightLabel="Playful"
            />
            <PersonalitySlider
              label="Outlook"
              value={personality.optimism}
              onChange={(value) => setPersonality(prev => ({ ...prev, optimism: value }))}
              leftLabel="Cautious"
              rightLabel="Optimistic"
            />
          </div>
        );

      case 'role':
        return (
          <div className="space-y-6">
            <div className="mb-4">
              <Label>Role Type</Label>
              <Select
                value={role.type}
                onChange={(e) => setRole(prev => ({ ...prev, type: e.target.value }))}
                className="mt-1"
              >
                <option value="">Select a role...</option>
                {COMMON_ROLES.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
                <option value="custom">Custom Role</option>
              </Select>
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
              <Select
                value={expertise.level}
                onChange={(e) => setExpertise(prev => ({ ...prev, level: e.target.value }))}
                className="mt-1"
              >
                <option value="novice">Novice</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </Select>
            </div>

            <PersonalitySlider
              label="Knowledge Balance"
              value={expertise.knowledgeBalance}
              onChange={(value) => setExpertise(prev => ({ ...prev, knowledgeBalance: value }))}
              leftLabel="Broad Knowledge"
              rightLabel="Deep Specialization"
            />

            <div className="mb-4">
              <Label className="block mb-2">Specialized Skills</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPECIALIZED_SKILLS.map(skill => (
                  <div key={skill} className="flex items-center">
                    <input
                      type="checkbox"
                      id={skill}
                      checked={expertise.selectedSkills.includes(skill)}
                      onChange={() => {
                        setExpertise(prev => ({
                          ...prev,
                          selectedSkills: expertise.selectedSkills.includes(skill)
                            ? expertise.selectedSkills.filter(s => s !== skill)
                            : [...expertise.selectedSkills, skill]
                        }));
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={skill}>{skill}</label>
                  </div>
                ))}
              </div>
            </div>

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
          <ModelConfig
            config={modelConfig}
            onChange={setModelConfig}
            apiKeys={apiKeys}
            systemInstructions={generateCustomInstructions({
              personality,
              role,
              expertise
            })}
            customInstructions={role.customRole || ''}
            error={nameError}
          />
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl">
          <div className="flex h-full">
            {/* Left sidebar for agent selection */}
            <div className="w-64 border-r border-gray-200 p-4 bg-gray-50">
              <div className="mb-4">
                <Button 
                  className="w-full mb-4"
                  onClick={handleCreateNew}
                >
                  Create New Agent
                </Button>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
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
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-gray-500">
                        {agent.role?.type || 'Custom Agent'}
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
                    aria-label="Close"
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
                    <button
                      key={tab}
                      className={`px-4 py-2 rounded-t-lg ${
                        activeTab === tab
                          ? 'bg-white text-blue-600 border-t border-x border-gray-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
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
                    >
                      {isSaving ? 'Saving...' : (isCreatingNew ? 'Create Agent' : 'Update Agent')}
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

// Add function to generate custom instructions based on agent configuration
const generateCustomInstructions = ({ personality, role, expertise }) => {
  const instructions = [];

  // Add personality-based instructions
  instructions.push(`You are an AI assistant with the following personality traits:`);
  if (personality.creativity < 33) {
    instructions.push("- You prioritize practical, proven solutions and conventional approaches");
  } else if (personality.creativity > 66) {
    instructions.push("- You often suggest innovative and creative approaches");
  } else {
    instructions.push("- You balance practical solutions with creative thinking");
  }
  
  // Add role-based instructions
  instructions.push(`\nYour role is: ${role.type === 'custom' ? role.customRole : role.type}`);
  
  // Add expertise-based instructions
  instructions.push(`\nExpertise level: ${expertise.level}`);
  if (expertise.selectedSkills.length > 0) {
    instructions.push(`Specialized in: ${expertise.selectedSkills.join(', ')}`);
  }

  return instructions.join('\n');
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
      role: PropTypes.shape({
        type: PropTypes.string,
      }),
      personality: PropTypes.object,
      expertise: PropTypes.object,
      modelConfig: PropTypes.object,
    })
  ),
  apiKeys: PropTypes.array,
};

AgentBuilder.defaultProps = {
  agents: [],
  apiKeys: [],
};

export default AgentBuilder;