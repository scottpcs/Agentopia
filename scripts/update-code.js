// update-code.js
const fs = require('fs').promises;
const path = require('path');

class CodeUpdater {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = '';
  }

  async load() {
    console.log(`Loading file: ${this.filePath}`);
    try {
      this.content = await fs.readFile(this.filePath, 'utf8');
      console.log(`Successfully loaded file (${this.content.length} characters)`);
    } catch (error) {
      console.error(`Error loading file: ${error.message}`);
      throw error;
    }
  }

  async save() {
    const outputPath = this.filePath + '.updated';
    console.log(`Saving updated file to: ${outputPath}`);
    try {
      await fs.writeFile(outputPath, this.content);
      console.log('File saved successfully');
    } catch (error) {
      console.error(`Error saving file: ${error.message}`);
      throw error;
    }
  }

  async applyUpdates(updates) {
    const changes = [];
    console.log(`Applying ${updates.length} updates...`);

    for (const update of updates) {
      try {
        console.log(`\nProcessing update: ${update.description}`);
        console.log(`Update type: ${update.type}`);
        
        switch (update.type) {
          case 'function':
            await this.updateFunction(update);
            break;
          case 'state':
            await this.updateState(update);
            break;
          case 'jsx':
            await this.updateJSX(update);
            break;
          case 'method':
            await this.updateMethod(update);
            break;
          default:
            console.warn(`Unknown update type: ${update.type}`);
            continue;
        }
        changes.push(`✓ Applied: ${update.description}`);
        console.log(`Successfully applied update: ${update.description}`);
      } catch (error) {
        console.error(`Error applying update: ${error.message}`);
        changes.push(`✗ Failed: ${update.description} - ${error.message}`);
      }
    }

    return changes;
  }

  async updateFunction(update) {
    const { name, content } = update;
    console.log(`Updating function: ${name}`);
    
    const functionRegex = new RegExp(
      `(const|function)\\s+${name}\\s*=?\\s*[({][\\s\\S]*?[)}];?`,
      'gm'
    );
    
    const originalContent = this.content;
    this.content = this.content.replace(functionRegex, content);
    
    if (this.content === originalContent) {
      console.log(`Function ${name} not found, adding as new function`);
      const insertPoint = this.findInsertionPoint('functions');
      this.content = this.insertAtPoint(this.content, content, insertPoint);
    } else {
      console.log(`Successfully updated function: ${name}`);
    }
  }

  async updateState(update) {
    const { content } = update;
    console.log(`Updating state declarations`);
    
    // Find the component definition
    const componentStart = this.content.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>/);
    if (!componentStart) {
      throw new Error('Could not find component definition');
    }

    const insertPoint = componentStart.index + componentStart[0].length;
    this.content = this.insertAtPoint(this.content, content, insertPoint);
  }

  async updateJSX(update) {
    const { name, content } = update;
    console.log(`Updating JSX for: ${name}`);
    
    // Look for return statement
    let jsxRegex;
    if (name === 'mainContainer') {
      jsxRegex = /return\s*\(\s*<div[^>]*className="conversation-node[^>]*>[^]*?<\/div>\s*\)/s;
    } else {
      jsxRegex = /return\s*\([^]*?\);/s;
    }
    
    const originalContent = this.content;
    this.content = this.content.replace(jsxRegex, `return (${content})`);
    
    if (this.content === originalContent) {
      console.log(`JSX block not found, attempting to add new block`);
      const insertPoint = this.findInsertionPoint('jsx');
      this.content = this.insertAtPoint(this.content, `return (${content});`, insertPoint);
    }
  }

  async updateMethod(update) {
    const { name, content } = update;
    console.log(`Updating method: ${name}`);
    
    const methodRegex = new RegExp(
      `${name}\\s*\\([^)]*\\)\\s*{[^}]*}`,
      'gm'
    );
    
    const originalContent = this.content;
    this.content = this.content.replace(methodRegex, content);
    
    if (this.content === originalContent) {
      console.log(`Method ${name} not found, adding as new method`);
      const insertPoint = this.findInsertionPoint('methods');
      this.content = this.insertAtPoint(this.content, content, insertPoint);
    }
  }

  findInsertionPoint(type) {
    console.log(`Finding insertion point for type: ${type}`);
    switch (type) {
      case 'functions':
        // Look for the last import statement or the start of the file
        const lastImport = this.content.lastIndexOf('import');
        const afterImports = this.content.indexOf(';', lastImport) + 1;
        return afterImports > 0 ? afterImports : 0;
        
      case 'state':
        // Look for component definition
        const componentStart = this.content.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>/);
        return componentStart ? componentStart.index + componentStart[0].length : 0;
        
      case 'jsx':
        // Look for existing return statement
        const returnMatch = this.content.match(/return\s*\(/m);
        return returnMatch ? returnMatch.index : 0;
        
      case 'methods':
        // Look for class definition
        const classMatch = this.content.match(/class\s+\w+/);
        return classMatch ? classMatch.index + classMatch[0].length : 0;
        
      default:
        return 0;
    }
  }

  insertAtPoint(content, newCode, point) {
    return content.slice(0, point) + '\n\n' + newCode + '\n\n' + content.slice(point);
  }
}

// Get command line arguments and run the update
const targetFile = process.argv[2];
if (!targetFile) {
  console.error('Please provide a target file path.');
  console.log('Usage: node update-code.js <file-path>');
  process.exit(1);
}

async function run() {
  try {
    const resolvedPath = path.resolve(process.cwd(), targetFile);
    console.log(`\nStarting code update process...`);
    console.log(`Target file: ${resolvedPath}`);
    
    // Check if target file exists
    try {
      await fs.access(resolvedPath);
      console.log('Target file found');
    } catch (error) {
      console.error(`Target file not found: ${resolvedPath}`);
      process.exit(1);
    }

    // Import updates from a separate file
    const updatesFile = path.join(
      process.cwd(),
      'scripts',
      'updates',
      path.basename(targetFile, path.extname(targetFile)) + '-updates.js'
    );
    console.log(`Looking for updates file: ${updatesFile}`);

    // Check if updates file exists and load updates
    let updates;
    try {
      updates = require(updatesFile).updates;
      console.log(`Found ${updates.length} updates to apply`);
    } catch (error) {
      console.error(`Updates file not found or invalid: ${updatesFile}`);
      console.error('Please create an updates file with your changes.');
      process.exit(1);
    }

    const updater = new CodeUpdater(resolvedPath);
    await updater.load();
    const changes = await updater.applyUpdates(updates);
    await updater.save();

    console.log('\nUpdate Summary:');
    changes.forEach(change => console.log(change));
    
    console.log(`\nUpdated file written to: ${resolvedPath}.updated`);
    console.log('Review the changes and rename the file to apply updates.');

  } catch (error) {
    console.error('Error updating code:', error);
    process.exit(1);
  }
}

run();