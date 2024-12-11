// src/utils/distillUtils.js

/**
 * Validates the structure of extracted information
 */
export const validateDistillation = (distillation, requiredFields) => {
    if (!distillation || typeof distillation !== 'object') {
      throw new Error('Invalid distillation format');
    }
  
    // Check for required structure
    const requiredKeys = ['fields', 'confidence', 'missing_required', 'output'];
    const missingKeys = requiredKeys.filter(key => !(key in distillation));
    if (missingKeys.length > 0) {
      throw new Error(`Missing required keys: ${missingKeys.join(', ')}`);
    }
  
    // Check required fields
    const missingRequired = requiredFields
      .filter(field => field.required && !distillation.fields[field.id])
      .map(field => field.label);
  
    if (missingRequired.length > 0) {
      throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
    }
  
    // Validate confidence scores
    Object.entries(distillation.confidence).forEach(([field, score]) => {
      if (typeof score !== 'number' || score < 0 || score > 1) {
        throw new Error(`Invalid confidence score for field: ${field}`);
      }
    });
  
    return true;
  };
  
  /**
   * Formats extracted information for display
   */
  export const formatDistillation = (distillation) => {
    const formatted = {
      fields: {},
      summary: distillation.output,
      confidence: {}
    };
  
    Object.entries(distillation.fields).forEach(([field, value]) => {
      // Format arrays
      if (Array.isArray(value)) {
        formatted.fields[field] = value.map(item => item.trim());
      }
      // Format objects (like budget or timeline)
      else if (typeof value === 'object') {
        formatted.fields[field] = JSON.stringify(value, null, 2);
      }
      // Format simple values
      else {
        formatted.fields[field] = value.toString().trim();
      }
  
      // Format confidence scores as percentages
      formatted.confidence[field] = Math.round(distillation.confidence[field] * 100);
    });
  
    return formatted;
  };
  
  /**
   * Gets the confidence level classification
   */
  export const getConfidenceLevel = (score) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };
  
  /**
   * Generates a prompt for the distillation agent
   */
  export const generateDistillationPrompt = (extractionFields, context = '') => {
    const fieldRequirements = extractionFields
      .map(field => `${field.label}${field.required ? ' (Required)' : ' (Optional)'}`)
      .join('\n- ');
  
    return `
      Your task is to extract and structure key information from the provided input.
      ${context ? `\nContext: ${context}\n` : ''}
      
      Extract information for the following fields:
      - ${fieldRequirements}
  
      For each field:
      1. Extract relevant information
      2. Structure it appropriately (array for multiple items, object for complex data)
      3. Assign a confidence score (0.0 to 1.0)
      4. Note any required fields that couldn't be found
  
      Respond with a JSON object containing:
      - fields: Extracted information for each field
      - confidence: Confidence score for each field
      - missing_required: Array of required fields that couldn't be found
      - output: A concise summary of the extracted information
    `.trim();
  };
  
  /**
   * Pre-processes input text for distillation
   */
  export const preprocessInput = (input) => {
    return input
      .replace(/\s+/g, ' ')             // Normalize whitespace
      .replace(/[""]/g, '"')            // Normalize quotes
      .replace(/['']/g, "'")            // Normalize apostrophes
      .trim();
  };
  
  /**
   * Combines multiple distillation results
   */
  export const combineDistillations = (distillations) => {
    const combined = {
      fields: {},
      confidence: {},
      missing_required: [],
      output: ''
    };
  
    // Combine fields and calculate average confidence
    Object.keys(distillations[0].fields).forEach(field => {
      // Combine arrays
      if (Array.isArray(distillations[0].fields[field])) {
        combined.fields[field] = [...new Set(
          distillations.flatMap(d => d.fields[field])
        )];
      }
      // Combine objects
      else if (typeof distillations[0].fields[field] === 'object') {
        combined.fields[field] = distillations.reduce((acc, d) => ({
          ...acc,
          ...d.fields[field]
        }), {});
      }
      // Use highest confidence value
      else {
        const mostConfident = distillations.reduce((prev, curr) => 
          curr.confidence[field] > prev.confidence[field] ? curr : prev
        );
        combined.fields[field] = mostConfident.fields[field];
      }
  
      // Average confidence scores
      combined.confidence[field] = distillations.reduce(
        (sum, d) => sum + d.confidence[field],
        0
      ) / distillations.length;
    });
  
    // Combine missing required fields
    combined.missing_required = [...new Set(
      distillations.flatMap(d => d.missing_required)
    )];
  
    // Concatenate and summarize outputs
    combined.output = distillations
      .map(d => d.output)
      .join('\n\n');
  
    return combined;
  };