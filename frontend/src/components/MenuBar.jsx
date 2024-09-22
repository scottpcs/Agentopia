/**
 * MenuBar.jsx
 * 
 * This component renders the top menu bar of the application.
 * It provides options for file operations, workspace management,
 * and workflow execution.
 * 
 * Props:
 * - onSave: Function to handle saving the workflow
 * - onOpen: Function to handle opening a workflow
 * - onSetWorkspace: Function to set the current workspace
 * - recentFiles: Array of recent file paths
 * - onOpenRecentFile: Function to open a recent file
 * - currentWorkspace: String representing the current workspace path
 * - onExecuteWorkflow: Function to execute the current workflow
 * - isExecuting: Boolean indicating if a workflow is currently executing
 * 
 * @component
 */

import React from 'react';
import { Button } from "./ui/button";

const MenuBar = ({ onSave, onOpen, onSetWorkspace, recentFiles, onOpenRecentFile, currentWorkspace, onExecuteWorkflow, isExecuting }) => {
  return (
    <div className="menu-bar flex justify-between items-center p-2 bg-gray-100">
      <div className="flex space-x-2">
        <div className="dropdown">
          <Button className="menu-item">File</Button>
          <div className="dropdown-content">
            <Button onClick={onSave} title="Downloads the workflow to your default download location">Download Workflow</Button>
            <Button onClick={onOpen}>Open Workflow</Button>
            <Button onClick={onSetWorkspace}>Set Workspace</Button>
            {recentFiles.length > 0 && (
              <div className="recent-files">
                <span>Recent Files:</span>
                {recentFiles.map((file, index) => (
                  <Button key={index} onClick={() => onOpenRecentFile(file)}>
                    {file}
                  </Button>
                ))}
              </div>
            )}
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
        <Button onClick={onExecuteWorkflow} disabled={isExecuting}>
          {isExecuting ? 'Executing...' : 'Execute Workflow'}
        </Button>
      </div>
    </div>
  );
};

export default MenuBar;