const path = require('path');
const fs = require('fs').promises;
const CodeChangeManager = require('./CodeChangeManager');

// Base source mappings relative to frontend/backend directories
const SOURCE_MAPPINGS = {
  'components': 'src/components',
  'services': 'src/services',
  'store': 'src/store',
  'utils': 'src/utils',
  'nodes': 'src/nodes',
  'hooks': 'src/hooks',
  'lib': 'src/lib'
};

// Update mappings for frontend and backend paths
const UPDATE_MAPPINGS = {
  'frontend/components': SOURCE_MAPPINGS.components,
  'frontend/services': SOURCE_MAPPINGS.services,
  'frontend/store': SOURCE_MAPPINGS.store,
  'frontend/utils': SOURCE_MAPPINGS.utils,
  'frontend/nodes': SOURCE_MAPPINGS.nodes,
  'frontend/hooks': SOURCE_MAPPINGS.hooks,
  'frontend/lib': SOURCE_MAPPINGS.lib,
  'backend/services': 'server/services',
  'backend/routes': 'server/routes',
  'backend/middleware': 'server/middleware',
  'backend/utils': 'server/utils'
};

async function findUpdatesFiles(directory) {
  const updates = [];
  
  try {
    const items = await fs.readdir(directory, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(directory, item.name);
      
      if (item.isDirectory()) {
        if (item.name !== 'completed') {  // Skip the completed directory
          const subDirUpdates = await findUpdatesFiles(fullPath);
          updates.push(...subDirUpdates);
        }
      } else if (item.name.endsWith('-updates.js')) {
        updates.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error);
  }
  
  return updates;
}

async function getSourcePath(updateFile) {
  // Get project root (2 levels up from tools/code-manager)
  const projectRoot = path.resolve(__dirname, '../..');
  
  // Extract the relative path from the updates directory
  const updatesDir = path.join(__dirname, 'updates');
  const relativePath = path.relative(updatesDir, updateFile);
  
  // Split the path and find the category
  const pathParts = relativePath.split(path.sep);
  const categoryPath = pathParts.slice(0, 2).join('/'); // e.g., 'frontend/components'
  
  if (!UPDATE_MAPPINGS[categoryPath]) {
    throw new Error(
      `Unable to determine category for ${updateFile}\n` +
      `Category path: ${categoryPath}\n` +
      `Available mappings: ${Object.keys(UPDATE_MAPPINGS).join(', ')}\n` +
      `Project root: ${projectRoot}\n` +
      `Updates dir: ${updatesDir}\n` +
      `Relative path: ${relativePath}`
    );
  }

  // Get the base name without -updates.js
  const fileName = path.basename(updateFile, '-updates.js');
  
  // Determine the extension based on the category
  const extension = categoryPath.endsWith('components') || 
                   categoryPath.endsWith('nodes') ? '.jsx' : '.js';

  // For frontend files
  if (categoryPath.startsWith('frontend/')) {
    const sourcePath = path.join(projectRoot, 'frontend', UPDATE_MAPPINGS[categoryPath], `${fileName}${extension}`);
    console.log('Resolved frontend path:', {
      projectRoot,
      categoryPath,
      mappedPath: UPDATE_MAPPINGS[categoryPath],
      fileName,
      extension,
      sourcePath
    });
    return sourcePath;
  }
  
  // For backend files
  if (categoryPath.startsWith('backend/')) {
    const sourcePath = path.join(projectRoot, UPDATE_MAPPINGS[categoryPath], `${fileName}${extension}`);
    console.log('Resolved backend path:', {
      projectRoot,
      categoryPath,
      mappedPath: UPDATE_MAPPINGS[categoryPath],
      fileName,
      extension,
      sourcePath
    });
    return sourcePath;
  }

  throw new Error(`Unknown category path: ${categoryPath}`);
}

function processUpdate(update) {
  switch (update.type) {
    case 'function': {
      // Get indentation from the function content's first line
      const firstLine = update.content.split('\n')[0];
      const baseIndent = firstLine.match(/^\s*/)[0].length;
      
      // Clean up the content's indentation to ensure consistent processing
      const cleanContent = update.content
        .split('\n')
        .map(line => line.slice(baseIndent)) // Remove base indentation
        .join('\n');

      return {
        type: 'function',
        name: update.name,
        content: cleanContent
      };
    }

    case 'insert': {
      // Directly pass through insert updates with all required properties
      return {
        type: update.position === 'before' ? 'INSERT_BEFORE' : 'INSERT_AFTER',
        anchor: update.anchor,
        code: update.code
      };
    }

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

async function updateComponent(updateFile) {
  try {
    console.log(`\nProcessing update file: ${updateFile}`);
    
    const manager = new CodeChangeManager({
      rootDir: path.resolve(__dirname, '../..'),
      debug: true
    });

    // Get the source file path
    const sourcePath = await getSourcePath(updateFile);
    console.log(`Source file path: ${sourcePath}`);

    // Load updates
    const updates = require(updateFile).updates;
    console.log(`Found ${updates.length} updates to apply`);

    // Process and apply each update
    for (const update of updates) {
      try {
        const processedUpdate = processUpdate(update);
        const changeSpec = {
          file: path.relative(manager.rootDir, sourcePath),
          changes: [processedUpdate]
        };

        await manager.applyChange(changeSpec);
        console.log(`✓ Successfully applied update: ${update.description || update.type}`);
      } catch (error) {
        console.error(`✗ Failed to apply update:`, error);
        throw error;
      }
    }

    console.log(`\n✓ Successfully processed ${path.basename(updateFile)}`);
    console.log(`Please review the changes in ${path.basename(sourcePath)}.updated`);

    return true;
  } catch (error) {
    console.error(`\n✗ Failed to process ${updateFile}:`, error);
    throw error;
  }
}

async function runBatchUpdates() {
  console.log('\nStarting batch updates...\n');
  
  const updatesDir = path.join(__dirname, 'updates');
  console.log(`Scanning for updates in: ${updatesDir}`);
  
  try {
    // Find all update files
    const updateFiles = await findUpdatesFiles(updatesDir);
    
    if (updateFiles.length === 0) {
      console.log('No updates found.');
      return;
    }
    
    console.log(`\nFound ${updateFiles.length} update files:`);
    updateFiles.forEach(file => console.log(`- ${path.basename(file)}`));
    
    // Process each update file
    console.log('\nProcessing updates...\n');
    
    for (const updateFile of updateFiles) {
      try {
        const success = await updateComponent(updateFile);
        
        if (success) {
          // Move the updates file to completed directory
          const completedDir = path.join(
            updatesDir, 
            'completed',
            path.dirname(path.relative(updatesDir, updateFile))
          );
          
          await fs.mkdir(completedDir, { recursive: true });
          
          const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
          const completedFileName = `${path.basename(updateFile, '.js')}-${timestamp}.js`;
          const completedPath = path.join(completedDir, completedFileName);
          
          await fs.rename(updateFile, completedPath);
          
          console.log(`✓ Update file moved to: ${completedPath}\n`);
        }
      } catch (error) {
        console.error(`✗ Failed to process ${updateFile}:`, error);
      }
    }
    
    console.log('\nBatch updates completed.');
    console.log('Please review the .updated files before applying changes.');
    
  } catch (error) {
    console.error('Error during batch update:', error);
    process.exit(1);
  }
}

// Run all updates if no specific file is provided
if (require.main === module) {
  runBatchUpdates().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runBatchUpdates, updateComponent, getSourcePath };