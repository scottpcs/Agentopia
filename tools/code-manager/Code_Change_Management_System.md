# Code Change Management System Documentation

## Overview
The Code Change Management System is a tool designed to manage, validate, and apply code changes to JavaScript/React components while maintaining code structure, formatting, and providing backup capabilities. It's particularly useful for making programmatic changes to React components while preserving their integrity.

## System Components

### 1. CodeChangeManager
Main class that handles code changes, validation, and formatting.

**Location**: `tools/code-manager/CodeChangeManager.js`

#### Key Features:
- Change application with validation
- Automatic backup creation
- Format preservation
- React/JSX-aware validation
- Indentation management
- Error recovery

### 2. Test Suite
Comprehensive test suite for validating the change manager functionality.

**Location**: `tools/code-manager/test.js`

## Directory Structure
```
tools/
└── code-manager/
    ├── CodeChangeManager.js      # Main implementation
    ├── test.js                  # Test suite
    ├── test-files/              # Test file directory
    └── .code-backups/           # Backup directory
```

## Change Specification Format
```javascript
{
  file: 'path/to/file.jsx',
  changes: [
    {
      type: 'REPLACE' | 'INSERT_AFTER' | 'INSERT_BEFORE' | 'DELETE',
      start?: number,        // Required for REPLACE and DELETE
      end?: number,          // Required for REPLACE and DELETE
      anchor?: string,       // Required for INSERT_AFTER and INSERT_BEFORE
      code?: string         // Required for REPLACE and INSERT operations
    }
  ]
}
```

## Usage Examples

### 1. Basic Usage
```javascript
const manager = new CodeChangeManager({
  rootDir: './src',
  debug: true
});

await manager.applyChange({
  file: 'components/MyComponent.jsx',
  changes: [{
    type: 'INSERT_AFTER',
    anchor: 'import React',
    code: 'import { useState } from "react";'
  }]
});
```

### 2. Multiple Changes
```javascript
await manager.applyChange({
  file: 'components/MyComponent.jsx',
  changes: [
    {
      type: 'REPLACE',
      start: 4,
      end: 4,
      code: '  const [state, setState] = useState(null);'
    },
    {
      type: 'INSERT_BEFORE',
      anchor: 'export default',
      code: '\n// Component created programmatically'
    }
  ]
});
```

## Code Validation Rules

### React Component Validation
- Must have React import
- Must have component declaration
- Must have export statement
- Valid JSX structure
- Proper function structure

### Indentation Rules
1. Top-level statements: 0 spaces
2. Component body: 2 spaces
3. Function body: 4 spaces
4. JSX content: 
   - Container elements: 4 spaces
   - Nested elements: 6 spaces

### Syntax Validation
- Matching braces
- Matching parentheses
- Valid JSX tags
- Proper import/export syntax

## Backup System

### Backup Creation
- Automatic backup before changes
- Timestamped backup files
- Maintains backup history
- Configurable backup location

### Backup Format
```
filename.jsx.YYYY-MM-DDThh-mm-ss-mmmZ.bak
```

### Recovery Process
1. Automatically triggered on error
2. Uses most recent backup
3. Maintains original file extension
4. Preserves file permissions

## Error Handling

### Types of Errors
1. Validation Errors
   - Code structure
   - Syntax
   - Indentation
2. File System Errors
   - Read/Write
   - Permissions
   - Path
3. Change Application Errors
   - Invalid specifications
   - Missing anchors
   - Line numbers

### Error Recovery
1. Automatic backup restoration
2. Detailed error logging
3. Stack trace preservation
4. Clean state restoration

## Future Development

### Planned Features
1. Custom Formatting Rules
   - Configurable indent size
   - Style preferences
   - Line wrapping
2. Enhanced Validation
   - Type checking
   - Import validation
   - Dependency checking
3. Snapshot Testing
   - Before/after comparisons
   - State verification
   - Format verification

### Integration Points
1. CI/CD Pipeline Integration
   - Automated testing
   - Validation checks
   - Format verification
2. IDE Integration
   - VSCode extension
   - Real-time validation
   - Change preview

## Usage in Chat Sessions

### Example Commands
```
// Initialize new manager
let's create a new code change manager for project X

// Apply changes
please update Component Y to add state management

// Validate changes
verify the changes made to Component Z

// Format code
format the updated component according to our standards
```

### Best Practices
1. Always specify file paths relative to project root
2. Use descriptive anchor text for insertions
3. Provide complete code blocks for replacements
4. Include proper indentation in change specifications
5. Verify changes before committing

## Notes for Future Development
1. Keep backups available during multi-step changes
2. Maintain formatting rules consistent with project standards
3. Update validation rules when new patterns emerge
4. Add support for new file types as needed
5. Enhance error messages for better debugging

## Common Issues and Solutions

### Invalid JSX Structure
**Problem**: JSX validation fails after changes
**Solution**: Ensure complete JSX blocks in changes, including all closing tags

### Indentation Errors
**Problem**: Code fails indentation validation
**Solution**: Use the formatCode method before validation

### Missing Anchors
**Problem**: Insert operations fail to find anchor
**Solution**: Use more specific anchor text or line numbers

## Future Chat Instructions
When working with code changes in future chats:
1. Specify file path clearly
2. Provide complete change specifications
3. Use formatted code blocks
4. Include context about existing code
5. Specify any special formatting requirements