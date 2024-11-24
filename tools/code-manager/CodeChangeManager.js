const fs = require('fs').promises;
const path = require('path');

/**
 * Manages code changes and validates React/JavaScript code structure
 */
class CodeChangeManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.backupDir = options.backupDir || path.join(this.rootDir, '.code-backups');
    this.debug = options.debug || false;
    this.indentSize = options.indentSize || 2;
  }

  /**
   * Applies a change specification to a file
   * @param {Object} changeSpec - The change specification
   * @returns {Promise<Object>} Result of the change operation
   */
  async applyChange(changeSpec) {
    try {
      // Validate change specification
      this.validateChangeSpec(changeSpec);

      // Read the file
      const filePath = path.join(this.rootDir, changeSpec.file);
      const originalContent = await fs.readFile(filePath, 'utf8');
      
      // Create backup
      await this.createBackup(changeSpec.file, originalContent);

      // Apply the changes
      let newContent = originalContent;
      for (const change of changeSpec.changes) {
        newContent = await this.applyIndividualChange(newContent, change);
      }

      // Format the code
      newContent = this.formatCode(newContent);

      // Validate based on file type
      const fileExt = path.extname(changeSpec.file);
      if (!this.validateResultingCode(newContent, fileExt)) {
        throw new Error('Generated code validation failed');
      }

      // Write the file
      await fs.writeFile(filePath, newContent, 'utf8');

      return {
        success: true,
        file: changeSpec.file,
        changeCount: changeSpec.changes.length
      };
    } catch (error) {
      console.error('Error applying changes:', error);
      // Attempt to restore from backup if we have one
      await this.restoreFromBackup(changeSpec.file).catch(e => {
        console.error('Failed to restore from backup:', e);
      });
      throw error;
    }
  }

  /**
   * Applies a single change to the content
   * @param {string} content - Original content
   * @param {Object} change - Change specification
   * @returns {string} Modified content
   */
  async applyIndividualChange(content, change) {
    const lines = content.split('\n');
    
    switch (change.type) {
      case 'REPLACE': {
        if (change.start <= 0 || change.end <= 0 || change.end < change.start) {
          throw new Error('Invalid line numbers');
        }
        
        const beforeLines = lines.slice(0, change.start - 1);
        const afterLines = lines.slice(change.end);
        const indentation = this.getIndentation(lines[change.start - 1] || '');
        const newLines = change.code.split('\n').map((line, i) => 
          i === 0 ? line : indentation + line.trimLeft()
        );

        return [...beforeLines, ...newLines, ...afterLines].join('\n');
      }

      case 'INSERT_AFTER': {
        const anchorIndex = this.findAnchorLine(lines, change.anchor);
        if (anchorIndex === -1) {
          throw new Error(`Anchor not found: ${change.anchor}`);
        }
        
        const indentation = this.getIndentation(lines[anchorIndex]);
        const newLines = change.code.split('\n').map(line => 
          indentation + line.trimLeft()
        );

        const beforeLines = lines.slice(0, anchorIndex + 1);
        const afterLines = lines.slice(anchorIndex + 1);
        return [...beforeLines, ...newLines, ...afterLines].join('\n');
      }

      case 'INSERT_BEFORE': {
        const anchorIndex = this.findAnchorLine(lines, change.anchor);
        if (anchorIndex === -1) {
          throw new Error(`Anchor not found: ${change.anchor}`);
        }
        
        const indentation = this.getIndentation(lines[anchorIndex]);
        const newLines = change.code.split('\n').map(line => 
          indentation + line.trimLeft()
        );

        const beforeLines = lines.slice(0, anchorIndex);
        const afterLines = lines.slice(anchorIndex);
        return [...beforeLines, ...newLines, ...afterLines].join('\n');
      }

      case 'DELETE': {
        if (change.start <= 0 || change.end <= 0 || change.end < change.start) {
          throw new Error('Invalid line numbers');
        }
        
        const beforeLines = lines.slice(0, change.start - 1);
        const afterLines = lines.slice(change.end);
        return [...beforeLines, ...afterLines].join('\n');
      }

      default:
        throw new Error(`Unknown change type: ${change.type}`);
    }
  }

  /**
   * Formats the code with consistent indentation and spacing
   * @param {string} content - The code to format
   * @returns {string} Formatted code
   */
  formatCode(content) {
    const lines = content.split('\n');
    const formattedLines = [];
    let indentLevel = 0;
    let inComponent = false;
    let inFunction = false;
    let inJSX = false;
    let inReturn = false;
  
    const INDENT_SIZE = 2;
  
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines but preserve them
      if (!line) {
        formattedLines.push('');
        continue;
      }
  
      // Handle imports
      if (line.startsWith('import')) {
        formattedLines.push(line);
        continue;
      }
  
      // Handle exports
      if (line.startsWith('export')) {
        formattedLines.push('');
        formattedLines.push(line);
        continue;
      }
  
      // Handle component declaration
      if (line.includes('=>')) {
        inComponent = true;
        formattedLines.push(line);
        continue;
      }
  
      let indent = '';
      if (inComponent) {
        // Base component indentation
        indent = ' '.repeat(INDENT_SIZE);
  
        // Handle return statement
        if (line.startsWith('return')) {
          inReturn = true;
        }
  
        // Handle JSX
        if (inReturn) {
          if (line.startsWith('<') && !line.startsWith('</')) {
            inJSX = true;
            indent = ' '.repeat(INDENT_SIZE * 2);
          } else if (line.startsWith('</')) {
            inJSX = false;
            indent = ' '.repeat(INDENT_SIZE * 2);
          } else if (inJSX) {
            indent = ' '.repeat(INDENT_SIZE * 3);
          }
        }
  
        // Handle function declarations
        if (line.includes('=>') || line.includes('function')) {
          inFunction = true;
        }
        if (inFunction && !line.startsWith('}')) {
          indent = ' '.repeat(INDENT_SIZE * 2);
        }
      }
  
      // Add the line with proper indentation
      formattedLines.push(indent + line);
  
      // Handle state changes
      if (line.includes('{')) indentLevel++;
      if (line.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
        if (line === '};') {
          inComponent = false;
          inFunction = false;
          inReturn = false;
          inJSX = false;
        }
      }
    }
  
    return formattedLines.join('\n');
  }

  /**
   * Gets the indentation of a line
   * @param {string} line - The line to analyze
   * @returns {string} The indentation string
   */
  getIndentation(line) {
    const match = line.match(/^(\s+)/);
    return match ? match[1] : '';
  }

  /**
   * Finds the line matching the anchor pattern
   * @param {string[]} lines - Array of lines
   * @param {string|RegExp} anchor - Anchor pattern
   * @returns {number} Line index
   */
  findAnchorLine(lines, anchor) {
    if (typeof anchor === 'number') {
      return Math.max(0, Math.min(anchor - 1, lines.length - 1));
    }
    
    const regex = typeof anchor === 'string' ? 
      new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : 
      anchor;

    const index = lines.findIndex(line => regex.test(line));
    if (this.debug && index === -1) {
      console.log('Available lines:', lines);
      console.log('Searching for anchor:', regex);
    }
    return index;
  }

  /**
   * Validates the change specification format
   * @param {Object} spec - Change specification
   */
  validateChangeSpec(spec) {
    if (!spec.file) throw new Error('Missing file path');
    if (!Array.isArray(spec.changes)) throw new Error('Changes must be an array');
    if (spec.changes.length === 0) throw new Error('No changes specified');

    for (const change of spec.changes) {
      if (!change.type) throw new Error('Change missing type');
      switch (change.type) {
        case 'REPLACE':
        case 'DELETE':
          if (!change.start || !change.end) throw new Error('Missing line numbers');
          break;
        case 'INSERT_AFTER':
        case 'INSERT_BEFORE':
          if (!change.anchor) throw new Error('Missing anchor');
          if (!change.code) throw new Error('Missing code');
          break;
        default:
          throw new Error(`Unknown change type: ${change.type}`);
      }
    }
  }

  /**
   * Validates the resulting code based on file type
   * @param {string} content - The code to validate
   * @param {string} fileExt - File extension
   * @returns {boolean} Validation result
   */
  validateResultingCode(content, fileExt) {
    try {
      switch (fileExt.toLowerCase()) {
        case '.jsx':
        case '.tsx':
          return this.validateReactCode(content);
        case '.js':
        case '.ts':
          return this.validateJavaScriptCode(content);
        default:
          return this.validateBasicSyntax(content);
      }
    } catch (error) {
      if (this.debug) {
        console.error('Code validation failed:', error);
      }
      return false;
    }
  }

/**
   * Validates React component code
   * @param {string} content - The code to validate
   * @returns {boolean} Validation result
   */
validateReactCode(content) {
    try {
      if (!this.validateBasicSyntax(content)) {
        if (this.debug) console.log('Basic syntax validation failed');
        return false;
      }

      // Verify React structural elements
      const hasReactImport = /import\s+.*React.*from\s+['"]react['"]/m.test(content);
      const hasComponent = /const\s+\w+\s*=\s*\(\s*\{[^}]*\}\s*\)\s*=>/m.test(content);
      const hasJSX = /\breturn\s*\(\s*<|\breturn\s+</m.test(content);
      const hasExport = /export\s+default\s+\w+/m.test(content);

      const isValid = hasReactImport && hasComponent && hasExport;

      if (this.debug) {
        console.log('React validation details:', {
          hasReactImport,
          hasComponent,
          hasJSX,
          hasExport,
          contentPreview: content.slice(0, 100) + '...'
        });
      }

      return isValid;
    } catch (error) {
      if (this.debug) {
        console.error('React validation error:', error);
      }
      return false;
    }
  }

  /**
   * Validates JavaScript code
   * @param {string} content - The code to validate
   * @returns {boolean} Validation result
   */
  validateJavaScriptCode(content) {
    try {
      if (!this.validateBasicSyntax(content)) return false;

      // Additional JavaScript-specific validation could be added here
      return true;
    } catch (error) {
      if (this.debug) {
        console.error('JavaScript validation error:', error);
      }
      return false;
    }
  }

  /**
   * Validates basic code syntax
   * @param {string} content - The code to validate
   * @returns {boolean} Validation result
   */
  validateBasicSyntax(content) {
    try {
      let braceCount = 0;
      let parenCount = 0;
      let inString = false;
      let inComment = false;
      let inJSX = false;
      let stringChar = '';
      
      const lines = content.split('\n');
      for (const line of lines) {
        let i = 0;
        while (i < line.length) {
          const char = line[i];
          const nextChar = line[i + 1];

          // Skip comments
          if (!inString && !inJSX && char === '/' && nextChar === '/') break;
          if (!inString && !inJSX && char === '/' && nextChar === '*') {
            inComment = true;
            i += 2;
            continue;
          }
          if (inComment && char === '*' && nextChar === '/') {
            inComment = false;
            i += 2;
            continue;
          }
          if (inComment) {
            i++;
            continue;
          }

          // Handle JSX
          if (char === '<' && /[A-Z]/.test(nextChar)) {
            inJSX = true;
          }
          if (inJSX && char === '>') {
            inJSX = false;
          }

          // Handle strings
          if (!inString && !inJSX && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && line[i - 1] !== '\\') {
            inString = false;
          } else if (inString) {
            i++;
            continue;
          }

          // Count braces and parentheses when not in JSX
          if (!inJSX) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
          }

          i++;
        }
      }

      const valid = braceCount === 0 && parenCount === 0;
      if (!valid && this.debug) {
        console.log('Syntax validation details:', {
          braceCount,
          parenCount
        });
      }

      return valid;
    } catch (error) {
      if (this.debug) {
        console.error('Syntax validation error:', error);
      }
      return false;
    }
  }

  /**
   * Creates a backup of the file
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to backup
   * @returns {Promise<string>} Backup file path
   */
  async createBackup(filePath, content) {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        this.backupDir, 
        `${path.basename(filePath)}.${timestamp}.bak`
      );
      await fs.writeFile(backupPath, content, 'utf8');
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

// Continuing the CodeChangeManager class...

  /**
   * Restores from the most recent backup
   * @param {string} filePath - Path to the file
   * @returns {Promise<void>}
   */
  async restoreFromBackup(filePath) {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith(path.basename(filePath)))
        .sort()
        .reverse();

      if (backups.length === 0) {
        throw new Error('No backup found');
      }

      const latestBackup = path.join(this.backupDir, backups[0]);
      const content = await fs.readFile(latestBackup, 'utf8');
      await fs.writeFile(path.join(this.rootDir, filePath), content, 'utf8');
      
      if (this.debug) {
        console.log(`Restored from backup: ${latestBackup}`);
      }
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Lists all backups for a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<Array>} List of backup files
   */
  async listBackups(filePath) {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter(f => f.startsWith(path.basename(filePath)))
        .sort()
        .reverse();
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Cleans up old backups
   * @param {number} keepCount - Number of recent backups to keep
   * @returns {Promise<number>} Number of backups removed
   */
  async cleanupBackups(keepCount = 5) {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupsByFile = {};

      // Group backups by original file
      files.forEach(file => {
        const originalFile = file.split('.').slice(0, -2).join('.');
        if (!backupsByFile[originalFile]) {
          backupsByFile[originalFile] = [];
        }
        backupsByFile[originalFile].push(file);
      });

      let removedCount = 0;
      // Process each group
      for (const [_, backups] of Object.entries(backupsByFile)) {
        if (backups.length > keepCount) {
          const toRemove = backups
            .sort()
            .reverse()
            .slice(keepCount);

          for (const file of toRemove) {
            await fs.unlink(path.join(this.backupDir, file));
            removedCount++;
          }
        }
      }

      if (this.debug) {
        console.log(`Cleaned up ${removedCount} old backups`);
      }

      return removedCount;
    } catch (error) {
      console.error('Failed to clean up backups:', error);
      return 0;
    }
  }

  /**
   * Validates JSX content
   * @param {string} content - The JSX content to validate
   * @returns {boolean} Validation result
   */
  validateJSXContent(content) {
    try {
      const jsxTags = content.match(/<[^>]+>/g) || [];
      const openTags = [];
      const selfClosingTags = new Set(['img', 'input', 'br', 'hr']);

      for (const tag of jsxTags) {
        if (tag.endsWith('/>')) continue; // Self-closing tag
        
        if (tag.startsWith('</')) {
          // Closing tag
          const tagName = tag.match(/<\/([^\s>]+)/)[1];
          const lastOpen = openTags.pop();
          if (lastOpen !== tagName) {
            if (this.debug) {
              console.error(`Mismatched JSX tags: expected ${lastOpen}, got ${tagName}`);
            }
            return false;
          }
        } else {
          // Opening tag
          const tagName = tag.match(/<([^\s>]+)/)[1];
          if (!selfClosingTags.has(tagName.toLowerCase())) {
            openTags.push(tagName);
          }
        }
      }

      const valid = openTags.length === 0;
      if (!valid && this.debug) {
        console.error('Unclosed JSX tags:', openTags);
      }
      return valid;
    } catch (error) {
      if (this.debug) {
        console.error('JSX validation error:', error);
      }
      return false;
    }
  }

  /**
   * Gets a diff between original and modified content
   * @param {string} original - Original content
   * @param {string} modified - Modified content
   * @returns {Array} Array of diff objects
   */
  getDiff(original, modified) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff = [];
    let i = 0;
    let j = 0;

    while (i < originalLines.length || j < modifiedLines.length) {
      if (i >= originalLines.length) {
        diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
        j++;
      } else if (j >= modifiedLines.length) {
        diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
        i++;
      } else if (originalLines[i] !== modifiedLines[j]) {
        if (modifiedLines.indexOf(originalLines[i], j) === -1) {
          diff.push({ type: 'remove', line: i + 1, content: originalLines[i] });
          i++;
        } else {
          diff.push({ type: 'add', line: j + 1, content: modifiedLines[j] });
          j++;
        }
      } else {
        i++;
        j++;
      }
    }

    return diff;
  }

  /**
   * Applies formatting rules to code
   * @param {string} content - Content to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted content
   */
  applyFormattingRules(content, options = {}) {
    const {
      indentSize = 2,
      useTabs = false,
      maxLineLength = 80,
      insertFinalNewline = true
    } = options;

    let lines = content.split('\n');

    // Apply indentation
    lines = lines.map(line => {
      const indent = line.match(/^\s*/)[0];
      const spaces = indent.length;
      const newIndent = useTabs 
        ? '\t'.repeat(Math.floor(spaces / indentSize))
        : ' '.repeat(spaces);
      return newIndent + line.trimLeft();
    });

    // Handle line length
    if (maxLineLength > 0) {
      lines = lines.map(line => {
        if (line.length <= maxLineLength) return line;
        
        // Try to break at a sensible point
        const breakPoints = [' ', ',', '{', '}', '(', ')', '[', ']'];
        let breakPoint = maxLineLength;
        for (const char of breakPoints) {
          const pos = line.lastIndexOf(char, maxLineLength);
          if (pos > 0) {
            breakPoint = pos + 1;
            break;
          }
        }

        const firstPart = line.slice(0, breakPoint);
        const remainingPart = line.slice(breakPoint).trim();
        return remainingPart 
          ? `${firstPart}\n${' '.repeat(indentSize)}${remainingPart}` 
          : firstPart;
      });
    }

    // Ensure final newline if requested
    if (insertFinalNewline && !lines[lines.length - 1].trim() === '') {
      lines.push('');
    }

    return lines.join('\n');
  }
}

module.exports = CodeChangeManager;