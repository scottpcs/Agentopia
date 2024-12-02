const CodeChangeManager = require('./CodeChangeManager');
const path = require('path');

// Maps source file paths to their update files
const UPDATE_MAPPINGS = {
  'frontend/src/components': 'tools/code-manager/updates/components',
  'frontend/src/services': 'tools/code-manager/updates/services',
  'frontend/src/store': 'tools/code-manager/updates/store'
};

function getUpdatesPath(sourceFilePath) {
  // Convert source path to updates path
  for (const [sourcePath, updatesPath] of Object.entries(UPDATE_MAPPINGS)) {
    if (sourceFilePath.includes(sourcePath)) {
      const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
      return path.join(updatesPath, `${fileName}-updates.js`);
    }
  }
  throw new Error(`No update mapping found for ${sourceFilePath}`);
}

async function updateComponent(componentPath) {
  try {
    const manager = new CodeChangeManager({
      rootDir: path.resolve(__dirname, '../..'),
      debug: true
    });

    // Get the updates file path
    const updatesPath = getUpdatesPath(componentPath);
    console.log(`Looking for updates in: ${updatesPath}`);

    // Load updates
    const updates = require(`../../${updatesPath}`).updates;
    console.log(`Found ${updates.length} updates to apply`);

    // Process and apply each update
    for (const update of updates) {
      const changeSpec = {
        file: componentPath,
        changes: [{
          ...processUpdate(update)
        }]
      };

      try {
        await manager.applyChange(changeSpec);
        console.log(`✓ Successfully applied update: ${update.description || update.type}`);
      } catch (error) {
        console.error(`✗ Failed to apply update:`, error);
        throw error;
      }
    }

    console.log(`\n✓ Successfully updated ${componentPath}`);
    console.log(`Please review the changes in ${componentPath}.updated`);

  } catch (error) {
    console.error(`\n✗ Failed to update ${componentPath}:`, error);
    process.exit(1);
  }
}

function processUpdate(update) {
  switch (update.type) {
    case 'function':
      return {
        type: 'REPLACE',
        anchor: new RegExp(`(const|function)\\s+${update.name}\\s*=`),
        code: update.content
      };

    case 'insert':
      return {
        type: update.position === 'before' ? 'INSERT_BEFORE' : 'INSERT_AFTER',
        anchor: update.anchor,
        code: update.content
      };

    case 'delete':
      return {
        type: 'DELETE',
        start: update.startLine,
        end: update.endLine
      };

    default:
      throw new Error(`Unknown update type: ${update.type}`);
  }
}

// CLI support
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Please provide a file path');
    console.log('Usage: node update-code.js <file-path>');
    process.exit(1);
  }

  updateComponent(filePath).catch(console.error);
}

module.exports = { updateComponent, getUpdatesPath };