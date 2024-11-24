const CodeChangeManager = require('./CodeChangeManager');
const path = require('path');
const fs = require('fs').promises;

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
  // Create test directory structure
  const testDir = path.join(__dirname, 'test-files');
  const backupDir = path.join(__dirname, '.code-backups');
  const testFilePath = path.join(testDir, 'sample-component.jsx');

  try {
    // Clean up previous test files if they exist
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });

    // Ensure test directories exist
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(backupDir, { recursive: true });

    // Create initial test file
    await fs.writeFile(testFilePath, SAMPLE_COMPONENT, 'utf8');
    console.log('\nCreated test file:', testFilePath);
    console.log('Initial content:\n', SAMPLE_COMPONENT);

    // Initialize the manager
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
        type: 'REPLACE',
        start: 4,
        end: 4,
        code: `  const [count, setCount] = useState(0);
  const [name, setName] = useState('');`
      }]
    };

    try {
      await manager.applyChange(addStateSpec);
      let content = await fs.readFile(testFilePath, 'utf8');
      console.log('Content after adding state:\n', content);
      console.log('✓ Add state test completed\n');
    } catch (error) {
      console.error('Add state test failed:', error);
      throw error;
    }

    // Test 2: Add imports
    console.log('Test 2: Add imports');
    const addImportsSpec = {
      file: 'sample-component.jsx',
      changes: [{
        type: 'INSERT_AFTER',
        anchor: 'import React',
        code: 'import { useRef } from \'react\';\nimport { useEffect } from \'react\';'
      }]
    };

    try {
      await manager.applyChange(addImportsSpec);
      let content = await fs.readFile(testFilePath, 'utf8');
      console.log('Content after adding imports:\n', content);
      console.log('✓ Add imports test completed\n');
    } catch (error) {
      console.error('Add imports test failed:', error);
      throw error;
    }

    // Test 3: Add comment
    console.log('Test 3: Add comment');
    const addCommentSpec = {
      file: 'sample-component.jsx',
      changes: [{
        type: 'INSERT_AFTER',
        anchor: 'const handleClick',
        code: '  // Handle button click event'
      }]
    };

    try {
      await manager.applyChange(addCommentSpec);
      let content = await fs.readFile(testFilePath, 'utf8');
      console.log('Content after adding comment:\n', content);
      console.log('✓ Add comment test completed\n');
    } catch (error) {
      console.error('Add comment test failed:', error);
      throw error;
    }

    // Test 4: Multiple changes
    console.log('Test 4: Multiple changes');
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

    try {
      await manager.applyChange(multipleSpec);
      let content = await fs.readFile(testFilePath, 'utf8');
      console.log('Content after multiple changes:\n', content);
      console.log('✓ Multiple changes test completed\n');
    } catch (error) {
      console.error('Multiple changes test failed:', error);
      throw error;
    }

    // Verify final structure
    console.log('\nVerifying final component structure...');
    const finalContent = await fs.readFile(testFilePath, 'utf8');

    function verifyComponentStructure(content) {
      const checks = {
        imports: (content.match(/import\s+.*from/g) || []).length >= 1,
        componentDeclaration: /const\s+\w+\s*=\s*\(\s*\{\s*[^}]*\}\s*\)\s*=>/m.test(content),
        stateDeclarations: (content.match(/useState/g) || []).length >= 1,
        eventHandler: content.includes('handleClick'),
        returnStatement: content.includes('return') && content.includes('</div>'),
        exportStatement: content.includes('export default')
      };

      const results = Object.entries(checks).map(([key, value]) => {
        if (!value && manager.debug) {
          console.log(`Missing expected part: ${key}`);
        }
        return value;
      });

      if (manager.debug) {
        console.log('Structure verification results:', checks);
      }

      return results.every(result => result);
    }

    if (verifyComponentStructure(finalContent)) {
      console.log('✓ Final component structure verified\n');
    } else {
      throw new Error('Final component structure verification failed');
    }

    console.log('All tests completed successfully!\n');
    console.log('Final component content:\n', finalContent);

    // Verify indentation
    console.log('\nVerifying code indentation...');
    const lines = finalContent.split('\n');
    let hasIndentationError = false;
    let currentIndentLevel = 0;
    let inComponent = false;
    let inFunction = false;
    let inJSX = false;
    let inReturn = false;

    function getExpectedIndent(line) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) return 0;
      
      // Skip import statements
      if (trimmedLine.startsWith('import')) return 0;
      
      // Skip export statement
      if (trimmedLine.startsWith('export')) return 0;
      
      // Skip standalone comments
      if (trimmedLine.startsWith('//') && !inComponent) return 0;

      let expectedSpaces = currentIndentLevel * 2;

      // Component declaration starts indentation context
      if (trimmedLine.startsWith('const') && trimmedLine.includes('=>')) {
        inComponent = true;
        return 0;
      }

      // Inside component body
      if (inComponent) {
        expectedSpaces = 2;  // Base component indentation

        // Function handling
        if (trimmedLine.includes('=>') || trimmedLine.includes('function')) {
          inFunction = true;
          return expectedSpaces;
        }

        // Function body
        if (inFunction && !trimmedLine.startsWith('}')) {
          return expectedSpaces + 2;
        }

        // Return statement handling
        if (trimmedLine === 'return (') {
          inReturn = true;
          return expectedSpaces;
        }

        // JSX handling
        if (inReturn) {
          if (trimmedLine.startsWith('<') || trimmedLine.startsWith(')')) {
            return expectedSpaces + 2;
          }
          if (trimmedLine.startsWith('</')) {
            return expectedSpaces + 2;
          }
          if (inJSX || trimmedLine.startsWith('<')) {
            inJSX = true;
            return expectedSpaces + 4;
          }
        }

        // Component closing
        if (trimmedLine === '};') {
          inComponent = false;
          return 0;
        }
      }

      return expectedSpaces;
    }

    for (const line of lines) {
      if (!line.trim()) continue;

      const actualIndent = line.length - line.trimLeft().length;
      const expectedIndent = getExpectedIndent(line);

      if (actualIndent !== expectedIndent) {
        console.log(`Indentation error on line: "${line}"`);
        console.log(`Expected ${expectedIndent} spaces, got ${actualIndent}`);
        hasIndentationError = true;
      }

      // Update state based on line content
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('</')) {
        inJSX = false;
      }
      if (trimmedLine.includes('{')) currentIndentLevel++;
      if (trimmedLine.includes('}')) {
        currentIndentLevel = Math.max(0, currentIndentLevel - 1);
        if (trimmedLine === '};') {
          inComponent = false;
          inFunction = false;
          inReturn = false;
          inJSX = false;
        }
      }
    }

    if (!hasIndentationError) {
      console.log('✓ Code indentation verified\n');
    } else {
      throw new Error('Code indentation verification failed');
    }

  } catch (error) {
    console.error('Test failed:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);