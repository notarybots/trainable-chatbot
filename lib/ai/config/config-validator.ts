
/**
 * Configuration Validation System
 */

import { 
  BaseAIConfig, 
  LLMConfig, 
  EmbeddingsConfig, 
  ChatConfig,
  ConfigValidationResult 
} from '../types/config';
import { AIProvider, AIServiceType } from '../types/common';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean | string;
  errorMessage?: string;
}

export interface ValidationSchema {
  rules: ValidationRule[];
  dependencies?: Record<string, string[]>;
  customValidators?: Array<(config: any) => ValidationError[]>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class ConfigValidator {
  private schemas = new Map<string, ValidationSchema>();

  constructor() {
    this.initializeDefaultSchemas();
  }

  public async validateConfig(config: any): Promise<ConfigValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Determine config type
      const configType = this.getConfigType(config);
      const schema = this.schemas.get(configType);

      if (!schema) {
        errors.push({
          field: 'config',
          message: `Unknown configuration type: ${configType}`,
          severity: 'error'
        });
      } else {
        // Validate against schema
        const schemaErrors = this.validateAgainstSchema(config, schema);
        errors.push(...schemaErrors);
      }

      // Run common validations
      const commonErrors = this.runCommonValidations(config);
      errors.push(...commonErrors);

      // Extract warnings
      const warningMessages = errors
        .filter(e => e.severity === 'warning')
        .map(e => e.message);
      warnings.push(...warningMessages);

      return {
        valid: errors.filter(e => e.severity === 'error').length === 0,
        errors: errors.map(e => ({
          field: e.field,
          message: e.message,
          severity: e.severity
        })),
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          field: 'validation',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  public registerSchema(configType: string, schema: ValidationSchema): void {
    this.schemas.set(configType, schema);
  }

  public async validateApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Basic format validation by provider
    switch (provider) {
      case 'openai':
        return /^sk-[a-zA-Z0-9]{48}$/.test(apiKey) || 
               /^sk-proj-[a-zA-Z0-9]{64}$/.test(apiKey);
      
      case 'anthropic':
        return /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/.test(apiKey);
      
      case 'voyageai':
        return /^pa-[a-zA-Z0-9]{32}$/.test(apiKey);
      
      case 'cohere':
        return /^[a-zA-Z0-9]{40}$/.test(apiKey);
      
      case 'abacusai':
        // Custom validation for Abacus.AI
        return apiKey.length > 10 && apiKey.length < 200;
      
      default:
        return apiKey.length > 0;
    }
  }

  public validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getConfigType(config: any): string {
    if (!config || typeof config !== 'object') {
      return 'unknown';
    }

    if (config.service) {
      return `${config.provider || 'unknown'}_${config.service}`;
    }

    if (config.services) {
      return 'registry';
    }

    return config.provider || 'base';
  }

  private validateAgainstSchema(config: any, schema: ValidationSchema): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate individual rules
    for (const rule of schema.rules) {
      const fieldErrors = this.validateField(config, rule);
      errors.push(...fieldErrors);
    }

    // Check dependencies
    if (schema.dependencies) {
      for (const [field, dependencies] of Object.entries(schema.dependencies)) {
        if (config[field] !== undefined) {
          for (const dependency of dependencies) {
            if (config[dependency] === undefined) {
              errors.push({
                field: dependency,
                message: `Field '${dependency}' is required when '${field}' is specified`,
                severity: 'error'
              });
            }
          }
        }
      }
    }

    // Run custom validators
    if (schema.customValidators) {
      for (const validator of schema.customValidators) {
        const customErrors = validator(config);
        errors.push(...customErrors);
      }
    }

    return errors;
  }

  private validateField(config: any, rule: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = [];
    const value = this.getNestedValue(config, rule.field);

    // Check required fields
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: rule.field,
        message: rule.errorMessage || `Field '${rule.field}' is required`,
        severity: 'error'
      });
      return errors;
    }

    // Skip other validations if value is undefined/null
    if (value === undefined || value === null) {
      return errors;
    }

    // Type validation
    if (rule.type && !this.validateType(value, rule.type)) {
      errors.push({
        field: rule.field,
        message: rule.errorMessage || `Field '${rule.field}' must be of type ${rule.type}`,
        severity: 'error'
      });
    }

    // Min/Max validation for numbers
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || `Field '${rule.field}' must be at least ${rule.min}`,
          severity: 'error'
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: rule.field,
          message: rule.errorMessage || `Field '${rule.field}' must be at most ${rule.max}`,
          severity: 'error'
        });
      }
    }

    // Pattern validation for strings
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        field: rule.field,
        message: rule.errorMessage || `Field '${rule.field}' format is invalid`,
        severity: 'error'
      });
    }

    // Custom validator
    if (rule.validator) {
      const result = rule.validator(value);
      if (result !== true) {
        errors.push({
          field: rule.field,
          message: typeof result === 'string' ? result : (rule.errorMessage || `Validation failed for field '${rule.field}'`),
          severity: 'error'
        });
      }
    }

    return errors;
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private runCommonValidations(config: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // API key validation
    if (config.provider && config.apiKey) {
      this.validateApiKey(config.provider, config.apiKey).then(isValid => {
        if (!isValid) {
          errors.push({
            field: 'apiKey',
            message: `Invalid API key format for provider '${config.provider}'`,
            severity: 'warning'
          });
        }
      });
    }

    // URL validation
    if (config.apiEndpoint && !this.validateUrl(config.apiEndpoint)) {
      errors.push({
        field: 'apiEndpoint',
        message: 'Invalid URL format for API endpoint',
        severity: 'error'
      });
    }

    // Timeout validation
    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push({
        field: 'timeout',
        message: 'Timeout should be between 1000ms and 300000ms (5 minutes)',
        severity: 'warning'
      });
    }

    return errors;
  }

  private initializeDefaultSchemas(): void {
    // Base AI Service Schema
    this.registerSchema('base', {
      rules: [
        { field: 'provider', required: true, type: 'string' },
        { field: 'apiKey', required: true, type: 'string' },
        { field: 'apiEndpoint', required: false, type: 'string' },
        { field: 'timeout', required: false, type: 'number', min: 1000, max: 300000 },
        { field: 'retryAttempts', required: false, type: 'number', min: 0, max: 10 },
        { field: 'retryDelay', required: false, type: 'number', min: 100 }
      ]
    });

    // LLM Service Schema
    this.registerSchema('openai_llm', {
      rules: [
        { field: 'provider', required: true, type: 'string' },
        { field: 'service', required: true, type: 'string' },
        { field: 'apiKey', required: true, type: 'string' },
        { field: 'defaultModel', required: true, type: 'string' },
        { field: 'defaultTemperature', required: false, type: 'number', min: 0, max: 2 },
        { field: 'defaultMaxTokens', required: false, type: 'number', min: 1 },
        { field: 'defaultTopP', required: false, type: 'number', min: 0, max: 1 },
        { field: 'streamingSupported', required: false, type: 'boolean' }
      ],
      customValidators: [
        (config) => {
          const errors: ValidationError[] = [];
          if (config.contextWindow && typeof config.contextWindow === 'object') {
            for (const [model, window] of Object.entries(config.contextWindow)) {
              if (typeof window !== 'number' || window < 1) {
                errors.push({
                  field: `contextWindow.${model}`,
                  message: `Context window for model '${model}' must be a positive number`,
                  severity: 'error'
                });
              }
            }
          }
          return errors;
        }
      ]
    });

    // Embeddings Service Schema
    this.registerSchema('openai_embeddings', {
      rules: [
        { field: 'provider', required: true, type: 'string' },
        { field: 'service', required: true, type: 'string' },
        { field: 'apiKey', required: true, type: 'string' },
        { field: 'defaultModel', required: true, type: 'string' },
        { field: 'batchSize', required: false, type: 'number', min: 1, max: 2048 },
        { field: 'maxBatchSize', required: false, type: 'number', min: 1 }
      ]
    });

    // Chat Service Schema
    this.registerSchema('chat', {
      rules: [
        { field: 'service', required: true, type: 'string' },
        { field: 'llmConfig', required: true, type: 'object' },
        { field: 'systemPrompt', required: false, type: 'string' },
        { field: 'memoryStrategy', required: false, type: 'string' },
        { field: 'memorySize', required: false, type: 'number', min: 1 },
        { field: 'enableRAG', required: false, type: 'boolean' },
        { field: 'streamingEnabled', required: false, type: 'boolean' }
      ],
      dependencies: {
        'enableRAG': ['embeddingsConfig'],
        'ragConfig': ['enableRAG']
      }
    });

    // Service Registry Schema
    this.registerSchema('registry', {
      rules: [
        { field: 'services', required: true, type: 'object' },
        { field: 'global.timeout', required: false, type: 'number', min: 1000 },
        { field: 'global.retryAttempts', required: false, type: 'number', min: 0, max: 10 },
        { field: 'global.enableMetrics', required: false, type: 'boolean' },
        { field: 'global.enableLogging', required: false, type: 'boolean' },
        { field: 'environment', required: false, type: 'string' }
      ]
    });
  }
}

// Validation utilities
export const ValidationUtils = {
  // Quick validation for common scenarios
  async quickValidate(config: BaseAIConfig): Promise<boolean> {
    const validator = new ConfigValidator();
    const result = await validator.validateConfig(config);
    return result.valid;
  },

  // Validate just the API key
  async validateApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
    const validator = new ConfigValidator();
    return validator.validateApiKey(provider, apiKey);
  },

  // Create a simple validation error
  createValidationError(field: string, message: string, severity: 'error' | 'warning' = 'error'): ValidationError {
    return { field, message, severity };
  },

  // Common validation patterns
  patterns: {
    url: /^https?:\/\/.+/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  }
};

// Global validator instance
export const globalConfigValidator = new ConfigValidator();
