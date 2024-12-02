// tools/code-manager/create-updates-structure.js
const fs = require('fs').promises;
const path = require('path');

const STRUCTURE = {
  'updates': {
    'frontend': {
      'components': {},
      'hooks': {},
      'nodes': {},
      'services': {},
      'store': {},
      'utils': {},
      'lib': {},
    },
    'backend': {
      'services': {},
      'routes': {},
      'middleware': {},
      'utils': {},
    },
    'completed': {
      'frontend': {},
      'backend': {}
    }
  }
};

// Add a basic README to each directory explaining its purpose
const README_CONTENT = {
  'updates': `# Code Updates Directory

This directory contains structured code updates for the Agentopia project.

## Structure
- frontend/: Updates for frontend code
- backend/: Updates for backend code
- completed/: Archive of applied updates

## Usage
Place update files in the appropriate directory following the naming convention:
\`{componentName}-updates.js\`

Example:
\`components/AgentBuilder-updates.js\`

Updates will be automatically processed by the batch-update script.`,

  'frontend': `# Frontend Updates

Contains updates for frontend code organized by type:
- components/: React component updates
- hooks/: Custom hook updates
- nodes/: Flow node component updates
- services/: Service layer updates
- store/: State management updates
- utils/: Utility function updates
- lib/: Library code updates`,

  'backend': `# Backend Updates

Contains updates for backend code organized by type:
- services/: Service layer updates
- routes/: API route updates
- middleware/: Middleware updates
- utils/: Utility function updates`,

  'completed': `# Completed Updates

Archive of successfully applied updates.
Each update file is moved here after successful application with a timestamp suffix.

Structure mirrors the main updates directory to maintain organization.`
};

async function createDirectory(basePath, structure, level = 0) {
  for (const [name, content] of Object.entries(structure)) {
    const dirPath = path.join(basePath, name);
    
    // Create directory
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`${' '.repeat(level * 2)}Created directory: ${dirPath}`);

    // Add README if exists
    if (README_CONTENT[name]) {
      const readmePath = path.join(dirPath, 'README.md');
      await fs.writeFile(readmePath, README_CONTENT[name]);
      console.log(`${' '.repeat(level * 2)}Added README to: ${dirPath}`);
    }

    // Recursively create subdirectories
    if (Object.keys(content).length > 0) {
      await createDirectory(dirPath, content, level + 1);
    }
  }
}

// Add example update file
const EXAMPLE_UPDATE = `// Example update file structure
exports.updates = [
  {
    type: 'function',
    name: 'functionName',
    content: \`// New function content
const functionName = () => {
  // Implementation
};\`,
    description: 'Description of the changes'
  },
  {
    type: 'insert',
    position: 'after',
    anchor: /existing code pattern/,
    code: 'new code to insert',
    description: 'Description of the insertion'
  }
];
`;

async function createExampleUpdate(basePath) {
  const examplePath = path.join(basePath, 'updates/frontend/components/Example-updates.js');
  await fs.writeFile(examplePath, EXAMPLE_UPDATE);
  console.log(`Created example update file: ${examplePath}`);
}

async function setup() {
  try {
    const basePath = path.resolve(__dirname);
    console.log('Creating updates directory structure...\n');
    
    await createDirectory(basePath, STRUCTURE);
    await createExampleUpdate(basePath);

    console.log('\nDirectory structure created successfully!');
    console.log('\nTo use this structure:');
    console.log('1. Place update files in the appropriate directory');
    console.log('2. Run updates using: node batch-update.js');
    console.log('3. Review .updated files before applying changes');

  } catch (error) {
    console.error('Error creating directory structure:', error);
    process.exit(1);
  }
}

// Run setup if script is executed directly
if (require.main === module) {
  setup();
}

module.exports = { setup };