import React from 'react';
import { Button } from "./ui/button";

const MenuBar = ({ onSave, onOpen, onSetWorkspace, recentFiles, onOpenRecentFile, currentWorkspace }) => {
  return (
    <div className="menu-bar">
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
      <div className="current-workspace">
        Current Workspace: {currentWorkspace || 'Not set'}
      </div>
    </div>
  );
};

export default MenuBar;