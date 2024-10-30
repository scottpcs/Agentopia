// src/utils/modelConfigUtils.js

/**
 * Model configuration definitions including limits and capabilities
 */
export const MODEL_CONFIGS = {
    'gpt-4o': {
      description: 'High-intelligence flagship model for complex, multi-step tasks',
      maxTokens: 4096,
      temperatureRange: { min: 0.1, max: 1.0 },
      costPerToken: 0.01,
      defaultMaxTokens: 2048
    },
    'gpt-4o-mini': {
      description: 'Affordable and intelligent small model for fast, lightweight tasks',
      maxTokens: 2048,
      temperatureRange: { min: 0.1, max: 1.0 },
      costPerToken: 0.005,
      defaultMaxTokens: 1024
    },
    'gpt-4-turbo': {
      description: 'The latest GPT-4 Turbo model with vision capabilities',
      maxTokens: 4096,
      temperatureRange: { min: 0.0, max: 2.0 },
      costPerToken: 0.01,
      defaultMaxTokens: 2048
    },
    'gpt-4': {
      description: 'Powerful model for complex tasks, 8k context window',
      maxTokens: 8192,
      temperatureRange: { min: 0.0, max: 2.0 },
      costPerToken: 0.03,
      defaultMaxTokens: 2048
    },
    'gpt-3.5-turbo': {
      description: 'Fast, inexpensive model for many tasks',
      maxTokens: 4096,
      temperatureRange: { min: 0.0, max: 2.0 },
      costPerToken: 0.002,
      defaultMaxTokens: 1024
    },
    'gpt-3.5-turbo-16k': {
      description: 'GPT-3.5 Turbo with extended 16k token context',
      maxTokens: 16384,
      temperatureRange: { min: 0.0, max: 2.0 },
      costPerToken: 0.003,
      defaultMaxTokens: 2048
    }
  };
  
  /**
   * Default model configuration for fallback
   */
  const DEFAULT_MODEL_CONFIG = {
    maxTokens: 2048,
    temperatureRange: { min: 0.0, max: 1.0 },
    costPerToken: 0.002,
    defaultMaxTokens: 1024
  };
  
  /**
   * Validates and normalizes model configuration parameters
   */
  export function validateModelConfig(model, temperature, maxTokens) {
    const config = MODEL_CONFIGS[model] || DEFAULT_MODEL_CONFIG;
    
    const validatedTemp = Math.max(
      config.temperatureRange.min,
      Math.min(config.temperatureRange.max, temperature || 0.7)
    );
  
    const validatedTokens = Math.min(
      config.maxTokens,
      maxTokens || config.defaultMaxTokens
    );
  
    return {
      model,
      temperature: validatedTemp,
      maxTokens: validatedTokens,
      config // Include the full config for reference
    };
  }
  
  /**
   * Estimates the cost for a given number of tokens
   */
  export function estimateCost(model, tokenCount) {
    const config = MODEL_CONFIGS[model] || DEFAULT_MODEL_CONFIG;
    if (!tokenCount || tokenCount <= 0) return 0;
    return tokenCount * config.costPerToken;
  }
  
  /**
   * Gets the recommended max tokens for a model
   */
  export function getDefaultMaxTokens(model) {
    const config = MODEL_CONFIGS[model] || DEFAULT_MODEL_CONFIG;
    return config.defaultMaxTokens;
  }
  
  /**
   * Checks if a model exists in our configuration
   */
  export function isValidModel(model) {
    return model in MODEL_CONFIGS;
  }
  
  /**
   * Gets the allowed temperature range for a model
   */
  export function getTemperatureRange(model) {
    const config = MODEL_CONFIGS[model] || DEFAULT_MODEL_CONFIG;
    return config.temperatureRange;
  }