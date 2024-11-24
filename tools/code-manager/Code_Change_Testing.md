# Code Change Management System Testing Documentation

## Test Suite Overview

The test suite validates the Code Change Manager's ability to modify React components while maintaining their structure, formatting, and functionality.

## Test Environment Setup

### Directory Structure
```
tools/code-manager/
├── test.js                     # Main test script
├── CodeChangeManager.js        # System under test
├── test-files/                # Test file directory
│   └── sample-component.jsx   # Test component
└── .code-backups/            # Backup directory for tests
```

### Initial Test Component
```jsx
import React, { useState } from 'react';

const SampleComponent = ({ title }) => {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(prev => prev + 1);
  };

  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
};

export default SampleComponent;
```

## Test Sequence

### 1. Environment Preparation
```javascript
// Clean up previous test files
await fs.rm(testDir, { recursive: true, force: true });
await fs.rm(backupDir, { recursive: true, force: true });

// Create fresh test directories
await fs.mkdir(testDir, { recursive: true });
await fs.mkdir(backupDir, { recursive: true });

// Create initial test file
await fs.writeFile(testFilePath, SAMPLE_COMPONENT, 'utf8');
```

### 2. Test Cases

#### Test 1: Add State Variable
**Purpose**: Verify ability to add new state declarations
```javascript
const addStateSpec = {
  file: 'sample-component.jsx',
  changes: [{
    type: 'REPLACE',
    start: 4,
    end: 4,
    code: `  const [count, setCount] = useState(0);
  const [name, setName] = useState('');`
  }]
};
```

#### Test 2: Add Imports
**Purpose**: Verify ability to add new import statements
```javascript
const addImportsSpec = {
  file: 'sample-component.jsx',
  changes: [{
    type: 'INSERT_AFTER',
    anchor: 'import React',
    code: 'import { useRef } from \'react\';\nimport { useEffect } from \'react\';'
  }]
};
```

#### Test 3: Add Comment
**Purpose**: Verify ability to add inline comments
```javascript
const addCommentSpec = {
  file: 'sample-component.jsx',
  changes: [{
    type: 'INSERT_AFTER',
    anchor: 'const handleClick',
    code: '  // Handle button click event'
  }]
};
```

#### Test 4: Multiple Changes
**Purpose**: Verify ability to handle multiple changes in one operation
```javascript
const multipleSpec = {
  file: 'sample-component.jsx',
  changes: [
    {
      type: 'INSERT_BEFORE',
      anchor: 'export default SampleComponent;',
      code: '// Component created for testing purposes'
    },
    {
      type: 'INSERT_AFTER',
      anchor: 'const SampleComponent = ({',
      code: '  // Component props'
    }
  ]
};
```

## Validation Steps

### 1. Structure Validation
```javascript
const checks = {
  imports: (content.match(/import\s+.*from/g) || []).length >= 1,
  componentDeclaration: /const\s+\w+\s*=\s*\(\s*\{\s*[^}]*\}\s*\)\s*=>/m.test(content),
  stateDeclarations: (content.match(/useState/g) || []).length >= 1,
  eventHandler: content.includes('handleClick'),
  returnStatement: content.includes('return') && content.includes('</div>'),
  exportStatement: content.includes('export default')
};
```

### 2. Indentation Validation
```javascript
function getExpectedIndent(line) {
  // Rules:
  // - Top level: 0 spaces
  // - Component body: 2 spaces
  // - Function body: 4 spaces
  // - JSX content: 4/6 spaces
  // [See detailed rules in implementation]
}
```

## Error Handling and Reporting

### 1. Test Case Error Handling
```javascript
try {
  await manager.applyChange(spec);
  console.log('✓ Test completed\n');
} catch (error) {
  console.error('Test failed:', error);
  throw error;
}
```

### 2. Validation Error Reporting
```javascript
// Structure errors
if (!value && manager.debug) {
  console.log(`Missing expected part: ${key}`);
}

// Indentation errors
console.log(`Indentation error on line: "${line}"`);
console.log(`Expected ${expectedIndent} spaces, got ${actualIndent}`);
```

## Test Results Verification

### Expected Output Format
```
Created test file: [path]
Initial content: [content]

Running tests...

Test 1: Add state variable
Content after adding state: [content]
✓ Add state test completed

[Additional test outputs...]

Verifying final component structure...
Structure verification results: [results]
✓ Final component structure verified

Verifying code indentation...
[Any indentation errors]
✓ Code indentation verified

All tests completed successfully!
```

### Failure Conditions
1. Structure validation failures
2. Indentation errors
3. Invalid changes
4. File system errors
5. Backup/restore failures

## Test Cases Matrix

| Test Case | Changes | Validation | Expected Result |
|-----------|---------|------------|-----------------|
| Add State | REPLACE | Structure  | Pass |
| Add Imports | INSERT_AFTER | Imports | Pass |
| Add Comment | INSERT_AFTER | Format | Pass |
| Multiple Changes | Multiple | All | Pass |

## Common Test Issues and Solutions

### 1. Indentation Failures
**Issue**: Incorrect indentation after changes
**Solution**: Verify indentation rules match React conventions

### 2. JSX Structure Breaks
**Issue**: Invalid JSX after changes
**Solution**: Ensure changes maintain complete JSX structure

### 3. Validation Failures
**Issue**: Structure validation fails
**Solution**: Check change specifications match component patterns

## Running Tests

### Command Line
```bash
node test.js
```

### Debug Mode
```bash
DEBUG=true node test.js
```

### Test Options
- `DEBUG`: Enable detailed logging
- `SKIP_CLEANUP`: Keep test files after run
- `BACKUP_COUNT`: Number of backups to maintain

## Adding New Tests

### Test Case Template
```javascript
console.log(`Test ${n}: [Description]`);
const testSpec = {
  file: 'sample-component.jsx',
  changes: [{
    type: '[CHANGE_TYPE]',
    // ... change specifications
  }]
};

try {
  await manager.applyChange(testSpec);
  let content = await fs.readFile(testFilePath, 'utf8');
  console.log('Content after changes:\n', content);
  console.log('✓ Test completed\n');
} catch (error) {
  console.error('Test failed:', error);
  throw error;
}
```

### Validation Template
```javascript
function validateSpecificFeature(content) {
  // Validation logic
  return {
    valid: boolean,
    errors: []
  };
}
```

## Future Test Improvements

### Planned Additions
1. Snapshot testing
2. Performance benchmarks
3. Edge case coverage
4. Integration tests
5. Stress testing

### Test Coverage Goals
1. All change types
2. All validation rules
3. Error conditions
4. Recovery scenarios
5. Edge cases

Would you like me to:
1. Add more test case examples?
2. Expand on validation rules?
3. Add more debugging strategies?
4. Include more failure scenarios?