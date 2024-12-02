// Test script with improved change handling and validation
const CodeChangeManager = require('./CodeChangeManager');
const fs = require('fs').promises;
const path = require('path');

const SAMPLE_COMPONENT = `import React, { useState } from 'react';

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

export default SampleComponent;`;

async function runTests() {
  const testDir = path.join(__dirname, 'test-files');
  const backupDir = path.join(__dirname, '.code-backups');
  const testFilePath = path.join(testDir, 'sample-component.jsx');

  try {
    // Clean up and setup
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(testFilePath, SAMPLE_COMPONENT, 'utf8');

    const manager = new CodeChangeManager({
      rootDir: testDir,
      backupDir: backupDir,
      debug: true
    });

    console.log('\nRunning tests...\n');

    // Test 1: Add state variable
    console.log('Test 1: Add state variable');
    const addStateSpec = {
      file: 'sample-component.jsx',
      changes: [{
        type: 'INSERT_AFTER',
        anchor: /const \[count, setCount\] = useState\(0\);/,
        code: '  const [name, setName] = useState(\'\');'
      }]
    };

    await testChange(manager, addStateSpec, testFilePath, 'Add state variable');

    // Test 2: Add imports
    console.log('\nTest 2: Add imports');
    const addImportsSpec = {
      file: 'sample-component.jsx',
      changes: [{
        type: 'INSERT_AFTER',
        anchor: /import React/,
        code: 'import { useRef, useEffect } from \'react\';'
      }]
    };

    await testChange(manager, addImportsSpec, testFilePath, 'Add imports');

    // Test 3: Add comment
    console.log('\nTest 3: Add comment');
    const addCommentSpec = {
      file: 'sample-component.jsx',
      changes: [{
        type: 'INSERT_BEFORE',
        anchor: /const handleClick/,
        code: '  // Handle button click event'
      }]
    };

    await testChange(manager, addCommentSpec, testFilePath, 'Add comment');

    // Test 4: Multiple changes
    console.log('\nTest 4: Multiple changes');
    const multipleSpec = {
      file: 'sample-component.jsx',
      changes: [
        {
          type: 'INSERT_BEFORE',
          anchor: /export default/,
          code: '\n// Component created for testing purposes'
        },
        {
          type: 'INSERT_AFTER',
          anchor: /const SampleComponent = \(\{/,
          code: '  // Component props'
        }
      ]
    };

    await testChange(manager, multipleSpec, testFilePath, 'Multiple changes');

    // Verify final state
    await verifyFinalState(testFilePath);

  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

async function testChange(manager, spec, testFilePath, description) {
  try {
    await manager.applyChange(spec);
    const content = await fs.readFile(`${testFilePath}.updated`, 'utf8');
    console.log(`\nContent after ${description}:\n${content}\n`);
    
    // Move updated content to original file for next test
    await fs.writeFile(testFilePath, content, 'utf8');
    
    console.log(`✓ ${description} completed successfully`);
  } catch (error) {
    console.error(`✗ ${description} failed:`, error);
    throw error;
  }
}

async function verifyFinalState(testFilePath) {
  const content = await fs.readFile(testFilePath, 'utf8');
  
  // Verify all changes were applied
  const checks = {
    hasNewState: content.includes('const [name, setName] = useState(\'\')'),
    hasNewImports: content.includes('useRef, useEffect'),
    hasComment: content.includes('// Handle button click event'),
    hasComponentComment: content.includes('// Component created for testing purposes'),
    hasPropsComment: content.includes('// Component props')
  };

  console.log('\nFinal verification results:');
  Object.entries(checks).forEach(([check, result]) => {
    console.log(`${result ? '✓' : '✗'} ${check}`);
  });

  if (Object.values(checks).every(Boolean)) {
    console.log('\n✓ All changes verified successfully');
  } else {
    throw new Error('Some changes were not applied correctly');
  }
}

runTests().catch(console.error);