# CodeChangeManager Documentation

## System Overview

The CodeChangeManager system enables systematic code updates while preserving formatting and structure. It consists of:
- CodeChangeManager.js: Core change management class
- batch-update.js: Script for running multiple updates
- Directory structure for storing updates

## Directory Structure
```
tools/
  code-manager/
    CodeChangeManager.js
    batch-update.js
    updates/
      frontend/
        components/
        hooks/
        nodes/
        services/
        store/
        utils/
        lib/
      backend/
        services/
        routes/
        middleware/
        utils/
      completed/
```

## Creating Updates

Place update files in the appropriate directory under `updates/`. Example:

```javascript
// updates/frontend/components/ComponentName-updates.js
exports.updates = [
  {
    type: 'function',
    name: 'functionName',
    content: `const functionName = () => {
  // Function content
  const nestedObject = {
    prop1: 'value1',
    prop2: {
      nestedProp: 'value2'
    }
  };
};`,
    description: 'Change description'
  }
];
```

### Update Types

1. Function Update:
```javascript
{
  type: 'function',
  name: 'functionName',  // Must match existing function name
  content: `// Complete function content
  // Including declaration and closing brace`,
  description: 'Description of changes'
}
```

2. Insert Update:
```javascript
{
  type: 'insert',
  position: 'before' | 'after',
  anchor: /regex/ | 'string',
  code: 'content to insert',
  description: 'Description of changes'
}
```

3. Delete Update:
```javascript
{
  type: 'delete',
  start: lineNumber,
  end: lineNumber,
  description: 'Description of changes'
}
```

## Indentation Rules

The system preserves indentation based on these rules:

1. Function Updates:
   - Base indentation matches original function
   - Content is indented relative to base
   - Nested blocks maintain relative indentation
   - Object literals preserve structure
   - Empty lines are preserved

2. Insert Updates:
   - Match indentation of anchor line
   - Imports remain at base level
   - Preserve relative indentation of multi-line content

## Usage

Run all pending updates:
```bash
node tools/code-manager/batch-update.js
```

Run specific update:
```bash
node tools/code-manager/batch-update.js frontend/components/ComponentName-updates.js
```

### Process Flow
1. Script scans updates directory
2. Maps update files to source files
3. Analyzes code structure
4. Processes each update preserving format
5. Creates .updated files next to originals
6. Moves processed updates to completed directory

### Output Files
- Source files remain unchanged
- .updated files created next to originals
- Backups stored in .code-backups directory

## Best Practices

1. Updates:
   - One logical change per update
   - Clear descriptions
   - Include complete function content
   - Maintain proper indentation in content
   
2. Running:
   - Review .updated files before applying
   - Check debug output for path issues
   - Verify backups exist
   - Test changes before committing

3. Maintenance:
   - Regular cleanup of completed directory
   - Version control for update files
   - Document major changes
   - Review indentation in updated files

## Example Usage

1. Create Update:
```javascript
// ComponentName-updates.js
exports.updates = [{
  type: 'function',
  name: 'handleSubmit',
  content: `const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await processData({
        id: selectedId,
        data: {
          name: name.trim(),
          type: 'custom',
          config: {
            ...baseConfig,
            parameters: {
              enabled: true,
              mode: 'advanced'
            }
          }
        }
      });
      onSuccess(result);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };`,
  description: 'Add error handling and loading state'
}];
```

2. Run Update:
```bash
node batch-update.js
```

3. Review generated .updated file
4. Apply changes if satisfied

## Prompt for Future Chats

When creating code updates using this system, follow this format:
```javascript
exports.updates = [{
  type: 'function',  // or 'insert' or 'delete'
  name: 'functionName', // only for function updates
  content: `
  // Indent relative to the original code position
  // Each level of nesting increases by 2 spaces
  // Functions start at original base indent
  // Maintain whitespace between sections
  `,
  description: 'Clear description of the changes',
  // For insert updates:
  position: 'before' | 'after',  // required for insert
  anchor: /regex/ | 'string',    // required for insert
  // For delete updates:
  start: lineNumber,  // required for delete
  end: lineNumber    // required for delete
}];
```

## Troubleshooting

Common issues and solutions:
- Path errors: Check PROJECT_ROOT setting
- Function not found: Verify function name/pattern
- Indentation issues: Check content formatting
- Missing files: Verify source file paths

Debug mode shows detailed logging:
```javascript
const manager = new CodeChangeManager({ debug: true });
```