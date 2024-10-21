import React, { useState } from 'react';
import { Button } from "./ui/button";

const AgentBuilder = ({ onSave, onClose, availableAgentTypes }) => {
  const [agent, setAgent] = useState({ name: '', role: '', expertise: '' });

  const handleChange = (e) => {
    setAgent({ ...agent, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(agent);
  };

  return (
    <div className="agent-builder bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Agent Builder</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input
            id="name"
            name="name"
            value={agent.name}
            onChange={handleChange}
            placeholder="Agent Name"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
          <select
            id="role"
            name="role"
            value={agent.role}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">Select Role</option>
            {availableAgentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        {agent.role === 'expert' && (
          <div>
            <label htmlFor="expertise" className="block text-sm font-medium text-gray-700">Expertise</label>
            <input
              id="expertise"
              name="expertise"
              value={agent.expertise}
              onChange={handleChange}
              placeholder="Area of Expertise"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
        )}
        <div className="flex justify-between">
          <Button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Save Agent
          </Button>
          <Button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AgentBuilder;