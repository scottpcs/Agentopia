/**
 * WorkspaceManager.jsx
 * 
 * This component manages the workspace selection and recent workspaces.
 * It allows users to set a new workspace or select from recent ones.
 * 
 * Props:
 * - onSetWorkspace: Function to set the current workspace
 * - recentWorkspaces: Array of recent workspace paths
 * - onSelectRecentWorkspace: Function to select a recent workspace
 * 
 * @component
 */

import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const WorkspaceManager = ({ onSetWorkspace, recentWorkspaces, onSelectRecentWorkspace }) => {
  const [workspacePath, setWorkspacePath] = useState('');

  const handleSetWorkspace = () => {
    if (workspacePath) {
      onSetWorkspace(workspacePath);
    }
  };

  return (
    <div className="workspace-manager">
      <Input
        type="text"
        value={workspacePath}
        onChange={(e) => setWorkspacePath(e.target.value)}
        placeholder="Enter workspace path"
      />
      <Button onClick={handleSetWorkspace}>Set Workspace</Button>
      {recentWorkspaces.length > 0 && (
        <div className="recent-workspaces">
          <h4>Recent Workspaces:</h4>
          {recentWorkspaces.map((workspace, index) => (
            <Button key={index} onClick={() => onSelectRecentWorkspace(workspace)}>
              {workspace}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceManager;