import React, { useState } from 'react';
import { Button } from "./ui/button";

const MenuBar = ({ 
  onSave, 
  onLoad, 
  onDownload, 
  savedWorkflows = [], 
  currentWorkspace,
  onSetWorkspace,
  onExecuteWorkflow, 
  onStopExecution,
  isExecuting,
  onShowCredentialManager
}) => {
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  return (
    <div className="menu-bar">
      <div className="menu-item-group">
        <div className="dropdown">
          <Button 
            className="menu-item" 
            onClick={() => setShowFileDropdown(!showFileDropdown)}
          >
            File
          </Button>
          {showFileDropdown && (
            <div className="dropdown-content">
              <Button onClick={onSave}>Save Workflow</Button>
              <Button onClick={() => setShowFileDropdown(false)}>Load Workflow</Button>
              <Button onClick={() => setShowFileDropdown(false)}>Download Workflow</Button>
            </div>
          )}
        </div>
        <Button className="menu-item">Edit</Button>
        <Button className="menu-item">View</Button>
        <Button className="menu-item">Help</Button>
      </div>
      <div className="menu-item-group">
        <span className="current-workspace">
          Current Workspace: {currentWorkspace || 'Not set'}
        </span>
        <Button onClick={onSetWorkspace}>Set Workspace</Button>
        {isExecuting ? (
          <Button 
            onClick={onStopExecution} 
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Stop Execution
          </Button>
        ) : (
          <Button 
            onClick={onExecuteWorkflow} 
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Execute Workflow
          </Button>
        )}
        <Button onClick={onShowCredentialManager}>
          Manage Credentials
        </Button>
      </div>
    </div>
  );
};

export default MenuBar;