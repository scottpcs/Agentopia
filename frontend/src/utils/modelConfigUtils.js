// src/utils/modelConfigUtils.js

/**
 * Model configuration definitions including limits and capabilities
 */
export const MODEL_CONFIGS = {
  'gpt-4o-mini': {
    description: 'Cost-effective model for most tasks',
    maxTokens: 128000,
    temperatureRange: { min: 0.1, max: 1.0 },
    costPerToken: 0.00015,
    defaultMaxTokens: 4096
  },
  'o3-mini': {
    description: 'Advanced model with improved capabilities',
    maxTokens: 128000,
    temperatureRange: { min: 0.0, max: 2.0 },
    costPerToken: 0.0011,
    defaultMaxTokens: 4096
  },
  'o1-mini': {
    description: 'Powerful model for specialized tasks',
    maxTokens: 128000,
    temperatureRange: { min: 0.0, max: 2.0 },
    costPerToken: 0.0011,
    defaultMaxTokens: 4096
  },
  'gpt-4o': {
    description: 'High-intelligence flagship model for complex tasks',
    maxTokens: 128000,
    temperatureRange: { min: 0.1, max: 1.0 },
    costPerToken: 0.0025,
    defaultMaxTokens: 4096
  }
};

/**
 * Default model configuration for fallback
 */
const DEFAULT_MODEL_CONFIG = {
  maxTokens: 2048,
  temperatureRange: { min: 0.0, max: 1.0 },
  costPerToken: 0.00015,
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