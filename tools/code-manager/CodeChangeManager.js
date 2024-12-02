const fs = require('fs').promises;
const path = require('path');

class CodeChangeManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.backupDir = options.backupDir || path.join(this.rootDir, '.code-backups');
    this.debug = options.debug || false;
  }

  getIndentLevel(line) {
    const match = line.match(/^(\s+)/);
    return match ? match[1].length : 0;
  }

  applyIndent(line, spaces) {
    if (!line.trim()) return line;
    return ' '.repeat(spaces) + line.trimLeft();
  }

  analyzeCodeStructure(lines) {
    const structure = {
      imports: new Set(),
      functions: new Map(), // name -> {start, end, indent}
      jsx: [], // array of {start, end, indent, depth}
      scopes: [] // track nested scopes
    };

    let currentScope = null;
    let jsxDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const indent = this.getIndentLevel(lines[i]);

      // Track imports
      if (line.startsWith('import ')) {
        structure.imports.add(i);
      }

      // Track function declarations
      const functionMatch = line.match(/^(const|function)\s+(\w+)\s*=/);
      if (functionMatch) {
        currentScope = {
          type: 'function',
          name: functionMatch[2],
          start: i,
          indent,
          brackets: 0
        };
        structure.scopes.push(currentScope);
      }

      // Track JSX
      if (currentScope && line.includes('return') && lines[i + 1]?.trim().startsWith('(')) {
        jsxDepth = 0;
        structure.jsx.push({
          start: i + 1,
          indent: indent + 2,
          depth: jsxDepth
        });
      }

      // Track brackets and JSX
      if (currentScope) {
        const openBrackets = (line.match(/{/g) || []).length;
        const closeBrackets = (line.match(/}/g) || []).length;
        
        currentScope.brackets += openBrackets - closeBrackets;

        if (currentScope.brackets === 0 && currentScope.type === 'function') {
          structure.functions.set(currentScope.name, {
            start: currentScope.start,
            end: i,
            indent: currentScope.indent
          });
          structure.scopes.pop();
          currentScope = structure.scopes[structure.scopes.length - 1];
        }
      }

      // Track JSX depth
      if (line.match(/<\w+[^>]*>/) && !line.match(/<\/\w+>/)) {
        jsxDepth++;
      }
      if (line.match(/<\/\w+>/)) {
        jsxDepth--;
      }
    }

    return structure;
  }

  async applyChange(changeSpec) {
    try {
      this.validateChangeSpec(changeSpec);
      const filePath = path.resolve(this.rootDir, changeSpec.file);
      const updatedPath = `${filePath}.updated`;

      if (this.debug) {
        console.log('Applying changes:', {
          rootDir: this.rootDir,
          file: changeSpec.file,
          resolvedPath: filePath,
          updatedPath: updatedPath,
          changes: changeSpec.changes.length
        });
      }

      const originalContent = await fs.readFile(filePath, 'utf8');
      await this.createBackup(changeSpec.file, originalContent);

      let newContent = originalContent;
      const structure = this.analyzeCodeStructure(originalContent.split('\n'));

      for (const change of changeSpec.changes) {
        newContent = await this.applyIndividualChange(newContent, change, structure);
      }

      await fs.writeFile(updatedPath, newContent, 'utf8');

      if (this.debug) {
        console.log(`Created updated file: ${updatedPath}`);
      }

      return {
        success: true,
        file: changeSpec.file,
        changeCount: changeSpec.changes.length
      };
    } catch (error) {
      console.error('Error applying changes:', error);
      throw error;
    }
  }

  async applyIndividualChange(content, change, structure) {
    const lines = content.split('\n');

    switch (change.type) {
      case 'function': {
        // Find the function and its indentation
        const functionRegex = new RegExp(`(const|function)\\s+${change.name}\\s*=`);
        const startIndex = lines.findIndex(line => functionRegex.test(line));
        if (startIndex === -1) {
          throw new Error(`Function ${change.name} not found`);
        }

        // Get the base indentation of the original function
        const baseIndent = this.getIndentLevel(lines[startIndex]);
        
        // Process the new function content with proper indentation
        const newLines = change.content.split('\n').map((line, index, array) => {
          if (!line.trim()) return line; // Preserve empty lines

          // Get current line's indentation level
          const currentIndent = line.match(/^\s*/)[0].length;
          const cleanLine = line.trimLeft();

          // Special handling for first and last lines
          if (index === 0) {
            // Function declaration
            return ' '.repeat(baseIndent) + cleanLine;
          } else if (index === array.length - 1 && cleanLine === '};') {
            // Closing brace of the function
            return ' '.repeat(baseIndent) + cleanLine;
          } else {
            // Function content - maintain relative indentation from base
            const contentBase = baseIndent + 2;
            
            // Calculate relative indentation based on nesting
            let relativeIndent = 0;
            const openBrackets = (cleanLine.match(/{/g) || []).length;
            const closeBrackets = (cleanLine.match(/}/g) || []).length;
            
            // Adjust indentation based on brackets
            if (closeBrackets > 0) {
              relativeIndent = Math.max(0, currentIndent - 2);
            } else {
              relativeIndent = currentIndent;
            }

            return ' '.repeat(contentBase + relativeIndent) + cleanLine;
          }
        });

        // Find the end of the function
        let endIndex = startIndex;
        let bracketCount = 0;
        let foundFirstBracket = false;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          if (!foundFirstBracket && line.includes('{')) {
            foundFirstBracket = true;
          }
          if (foundFirstBracket) {
            bracketCount += (line.match(/{/g) || []).length;
            bracketCount -= (line.match(/}/g) || []).length;
            if (bracketCount === 0) {
              endIndex = i;
              break;
            }
          }
        }

        // Replace the function while preserving surrounding whitespace
        lines.splice(startIndex, endIndex - startIndex + 1, ...newLines);
        break;
      }

      case 'INSERT_AFTER':
      case 'INSERT_BEFORE': {
        const anchorIndex = this.findAnchorLine(lines, change.anchor);
        if (anchorIndex === -1) {
          throw new Error(`Anchor not found: ${change.anchor}`);
        }

        const baseIndent = this.getIndentLevel(lines[anchorIndex]);
        const newLines = change.code.split('\n').map(line => {
          if (!line.trim()) return line;
          // Don't indent imports
          if (line.trim().startsWith('import')) {
            return line.trim();
          }
          return this.applyIndent(line, baseIndent);
        });

        const insertIndex = change.type === 'INSERT_AFTER' ? anchorIndex + 1 : anchorIndex;
        lines.splice(insertIndex, 0, ...newLines);
        break;
      }

      case 'DELETE': {
        const { start, end } = change;
        if (!start || !end || end < start) {
          throw new Error('Invalid line numbers for delete');
        }
        lines.splice(start - 1, end - start + 1);
        break;
      }

      default:
        throw new Error(`Unknown change type: ${change.type}`);
    }

    return lines.join('\n');
  }

  validateChangeSpec(spec) {
    if (!spec.file) {
      throw new Error('Missing file path');
    }
    if (!Array.isArray(spec.changes)) {
      throw new Error('Changes must be an array');
    }
    if (spec.changes.length === 0) {
      throw new Error('No changes specified');
    }

    for (const change of spec.changes) {
      if (!change.type) {
        throw new Error('Change missing type');
      }

      switch (change.type) {
        case 'function':
          if (!change.name || !change.content) {
            throw new Error('Function change requires name and content');
          }
          break;

        case 'INSERT_AFTER':
        case 'INSERT_BEFORE':
          if (!change.anchor || !change.code) {
            throw new Error('Insert change requires anchor and code');
          }
          break;

        case 'DELETE':
          if (!change.start || !change.end) {
            throw new Error('Delete change requires start and end lines');
          }
          break;

        default:
          throw new Error(`Unknown change type: ${change.type}`);
      }
    }
  }

  findAnchorLine(lines, anchor) {
    if (typeof anchor === 'number') {
      return Math.max(0, Math.min(anchor - 1, lines.length - 1));
    }

    const regex = anchor instanceof RegExp ? anchor : 
      new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const index = lines.findIndex(line => regex.test(line));

    if (this.debug && index === -1) {
      console.log('Available lines:', lines);
      console.log('Searching for anchor:', regex);
    }

    return index;
  }

  async createBackup(filePath, content) {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        this.backupDir,
        `${path.basename(filePath)}.${timestamp}.bak`
      );
      await fs.writeFile(backupPath, content, 'utf8');

      if (this.debug) {
        console.log(`Created backup at: ${backupPath}`);
      }

      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }
}

module.exports = CodeChangeManager;