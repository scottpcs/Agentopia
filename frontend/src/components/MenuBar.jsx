import React from 'react';
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
  return (
    <div className="menu-bar flex justify-between items-center p-2 bg-gray-100">
      <div className="flex space-x-2">
        <div className="dropdown">
          <Button className="menu-item">File</Button>
          <div className="dropdown-content">
            <Button onClick={onSave}>Save Workflow</Button>
            <div className="dropdown">
              <Button>Load Workflow</Button>
              <div className="dropdown-content">
                {savedWorkflows.length > 0 ? (
                  savedWorkflows.map((workflow) => (
                    <Button key={workflow} onClick={() => onLoad(workflow.replace('.json', ''))}>
                      {workflow.replace('.json', '')}
                    </Button>
                  ))
                ) : (
                  <div>No saved workflows</div>
                )}
              </div>
            </div>
            <div className="dropdown">
              <Button>Download Workflow</Button>
              <div className="dropdown-content">
                {savedWorkflows.length > 0 ? (
                  savedWorkflows.map((workflow) => (
                    <Button key={workflow} onClick={() => onDownload(workflow.replace('.json', ''))}>
                      {workflow.replace('.json', '')}
                    </Button>
                  ))
                ) : (
                  <div>No saved workflows</div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button className="menu-item">Edit</Button>
        <Button className="menu-item">View</Button>
        <Button className="menu-item">Help</Button>
      </div>
      <div className="flex items-center space-x-4">
        <div className="current-workspace text-sm">
          Current Workspace: {currentWorkspace || 'Not set'}
        </div>
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