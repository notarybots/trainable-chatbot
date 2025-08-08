
/**
 * Schema Definitions for Configuration Validation
 */

import { ValidationRule, ValidationSchema } from './config-validator';
import { AIProvider, AIServiceType } from '../types/common';

// JSON Schema-like definitions for configuration validation
export interface ConfigSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

// Base AI Service Configuration Schema
export const baseAIConfigSchema: ConfigSchema = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      description: 'AI service provider',
      enum: ['openai', 'abacusai', 'anthropic', 'voyageai', 'cohere', 'huggingface', 'custom']
    },
    apiKey: {
      type: 'string',
      description: 'API key for authentication'
    },
    apiEndpoint: {
      type: 'string',
      description: 'API endpoint URL',
      pattern: '^https?://.+'
    },
    timeout: {
      type: 'number',
      description: 'Request timeout in milliseconds',
      minimum: 1000,
      maximum: 300000,
      default: 30000
    },
    retryAttempts: {
      type: 'number',
      description: 'Number of retry attempts',
      minimum: 0,
      maximum: 10,
      default: 3
    },
    retryDelay: {
      type: 'number',
      description: 'Base delay between retries in milliseconds',
      minimum: 100,
      default: 1000
    },
    rateLimitStrategy: {
      type: 'string',
      description: 'Rate limiting strategy',
      enum: ['exponential_backoff', 'fixed_delay', 'none'],
      default: 'exponential_backoff'
    },
    enableMetrics: {
      type: 'boolean',
      description: 'Enable performance metrics collection',
      default: true
    },
    enableCaching: {
      type: 'boolean',
      description: 'Enable response caching',
      default: false
    }
  },
  required: ['provider', 'apiKey']
};

// LLM Configuration Schema
export const llmConfigSchema: ConfigSchema = {
  type: 'object',
  properties: {
    ...baseAIConfigSchema.properties,
    service: {
      type: 'string',
      description: 'Service type',
      enum: ['llm']
    },
    defaultModel: {
      type: 'string',
      description: 'Default model to use for requests'
    },
    supportedModels: {
      type: 'array',
      description: 'List of supported models',
      items: { type: 'string' }
    },
    defaultTemperature: {
      type: 'number',
      description: 'Default temperature for generation',
      minimum: 0,
      maximum: 2,
      default: 0.7
    },
    defaultMaxTokens: {
      type: 'number',
      description: 'Default maximum tokens for generation',
      minimum: 1,
      default: 2000
    },
    defaultTopP: {
      type: 'number',
      description: 'Default top-p value',
      minimum: 0,
      maximum: 1,
      default: 1.0
    },
    defaultTopK: {
      type: 'number',
      description: 'Default top-k value',
      minimum: 1
    },
    streamingSupported: {
      type: 'boolean',
      description: 'Whether the service supports streaming',
      default: true
    },
    functionCallingSupported: {
      type: 'boolean',
      description: 'Whether the service supports function calling',
      default: false
    },
    visionSupported: {
      type: 'boolean',
      description: 'Whether the service supports vision/image inputs',
      default: false
    },
    contextWindow: {
      type: 'object',
      description: 'Context window sizes per model',
      properties: {}
    },
    costPerToken: {
      type: 'object',
      description: 'Cost per token per model',
      properties: {}
    }
  },
  required: [...(baseAIConfigSchema.required || []), 'service', 'defaultModel']
};

// Embeddings Configuration Schema
export const embeddingsConfigSchema: ConfigSchema = {
  type: 'object',
  properties: {
    ...baseAIConfigSchema.properties,
    service: {
      type: 'string',
      description: 'Service type',
      enum: ['embeddings']
    },
    defaultModel: {
      type: 'string',
      description: 'Default embedding model'
    },
    supportedModels: {
      type: 'array',
      description: 'List of supported embedding models',
      items: { type: 'string' }
    },
    dimensions: {
      type: 'object',
      description: 'Embedding dimensions per model',
      additionalProperties: true
    },
    batchSize: {
      type: 'number',
      description: 'Default batch size for processing',
      minimum: 1,
      maximum: 2048,
      default: 100
    },
    maxBatchSize: {
      type: 'number',
      description: 'Maximum allowed batch size',
      minimum: 1,
      default: 2048
    },
    costPerToken: {
      type: 'object',
      description: 'Cost per token per model',
      additionalProperties: true
    }
  },
  required: [...(baseAIConfigSchema.required || []), 'service', 'defaultModel']
};

// Chat Configuration Schema
export const chatConfigSchema: ConfigSchema = {
  type: 'object',
  properties: {
    ...baseAIConfigSchema.properties,
    service: {
      type: 'string',
      description: 'Service type',
      enum: ['chat']
    },
    llmConfig: {
      type: 'object',
      description: 'LLM service configuration'
    },
    embeddingsConfig: {
      type: 'object',
      description: 'Embeddings service configuration'
    },
    systemPrompt: {
      type: 'string',
      description: 'Default system prompt',
      default: 'You are a helpful AI assistant.'
    },
    memoryStrategy: {
      type: 'string',
      description: 'Memory management strategy',
      enum: ['sliding_window', 'summary', 'vector_store', 'none'],
      default: 'sliding_window'
    },
    memorySize: {
      type: 'number',
      description: 'Memory size limit',
      minimum: 1,
      default: 10
    },
    enableRAG: {
      type: 'boolean',
      description: 'Enable Retrieval Augmented Generation',
      default: false
    },
    ragConfig: {
      type: 'object',
      description: 'RAG configuration options',
      properties: {
        similarityThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.7
        },
        maxResults: {
          type: 'number',
          minimum: 1,
          default: 5
        },
        reranking: {
          type: 'boolean',
          default: false
        }
      }
    },
    enableTools: {
      type: 'boolean',
      description: 'Enable tool/function calling',
      default: false
    },
    streamingEnabled: {
      type: 'boolean',
      description: 'Enable streaming responses',
      default: true
    }
  },
  required: [...(baseAIConfigSchema.required || []), 'service', 'llmConfig']
};

// Service Registry Configuration Schema
export const serviceRegistrySchema: ConfigSchema = {
  type: 'object',
  properties: {
    services: {
      type: 'object',
      description: 'Service configurations',
      properties: {
        llm: {
          type: 'object',
          description: 'LLM service configuration'
        },
        embeddings: {
          type: 'object',
          description: 'Embeddings service configuration'
        },
        chat: {
          type: 'object',
          description: 'Chat service configuration'
        }
      }
    },
    global: {
      type: 'object',
      description: 'Global configuration settings',
      properties: {
        timeout: {
          type: 'number',
          minimum: 1000,
          default: 30000
        },
        retryAttempts: {
          type: 'number',
          minimum: 0,
          maximum: 10,
          default: 3
        },
        enableMetrics: {
          type: 'boolean',
          default: true
        },
        enableLogging: {
          type: 'boolean',
          default: true
        },
        logLevel: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error'],
          default: 'info'
        }
      }
    },
    environment: {
      type: 'string',
      description: 'Deployment environment',
      enum: ['development', 'staging', 'production', 'test'],
      default: 'development'
    }
  },
  required: ['services']
};

// Provider-specific schemas
export const providerSchemas: Record<string, ConfigSchema> = {
  openai_llm: {
    ...llmConfigSchema,
    properties: {
      ...llmConfigSchema.properties,
      organization: {
        type: 'string',
        description: 'OpenAI organization ID'
      },
      project: {
        type: 'string',
        description: 'OpenAI project ID'
      }
    }
  },

  openai_embeddings: {
    ...embeddingsConfigSchema,
    properties: {
      ...embeddingsConfigSchema.properties,
      organization: {
        type: 'string',
        description: 'OpenAI organization ID'
      },
      project: {
        type: 'string',
        description: 'OpenAI project ID'
      }
    }
  },

  abacusai_llm: {
    ...llmConfigSchema,
    properties: {
      ...llmConfigSchema.properties,
      instanceId: {
        type: 'string',
        description: 'Abacus.AI instance ID'
      }
    }
  },

  anthropic_llm: {
    ...llmConfigSchema,
    properties: {
      ...llmConfigSchema.properties,
      version: {
        type: 'string',
        description: 'Anthropic API version',
        default: '2023-06-01'
      }
    }
  },

  voyageai_embeddings: {
    ...embeddingsConfigSchema
  },

  cohere_llm: {
    ...llmConfigSchema,
    properties: {
      ...llmConfigSchema.properties,
      version: {
        type: 'string',
        description: 'Cohere API version'
      }
    }
  }
};

// Schema to ValidationRule converter
export function schemaToValidationRules(schema: ConfigSchema, prefix = ''): ValidationRule[] {
  const rules: ValidationRule[] = [];

  for (const [propertyName, propertySchema] of Object.entries(schema.properties)) {
    const fieldName = prefix ? `${prefix}.${propertyName}` : propertyName;
    
    const rule: ValidationRule = {
      field: fieldName,
      required: schema.required?.includes(propertyName),
      type: propertySchema.type === 'object' ? 'object' : propertySchema.type
    };

    // Add constraints based on schema
    if (propertySchema.minimum !== undefined) {
      rule.min = propertySchema.minimum;
    }
    if (propertySchema.maximum !== undefined) {
      rule.max = propertySchema.maximum;
    }
    if (propertySchema.pattern) {
      rule.pattern = new RegExp(propertySchema.pattern);
    }
    if (propertySchema.enum) {
      rule.validator = (value) => propertySchema.enum!.includes(value);
      rule.errorMessage = `${fieldName} must be one of: ${propertySchema.enum.join(', ')}`;
    }

    rules.push(rule);

    // Handle nested objects
    if (propertySchema.type === 'object' && propertySchema.properties) {
      const nestedSchema: ConfigSchema = {
        type: 'object',
        properties: propertySchema.properties,
        required: propertySchema.required
      };
      rules.push(...schemaToValidationRules(nestedSchema, fieldName));
    }
  }

  return rules;
}

// Convert schema to ValidationSchema
export function createValidationSchema(configSchema: ConfigSchema): ValidationSchema {
  return {
    rules: schemaToValidationRules(configSchema),
    customValidators: [
      // Add any custom validation logic here
      (config) => {
        const errors = [];
        
        // Custom validation: if enableRAG is true, embeddingsConfig should be present
        if (config.enableRAG && !config.embeddingsConfig) {
          errors.push({
            field: 'embeddingsConfig',
            message: 'embeddingsConfig is required when enableRAG is true',
            severity: 'error' as const
          });
        }

        // Custom validation: API key format checking
        if (config.provider && config.apiKey) {
          const isValidKey = validateApiKeyFormat(config.provider, config.apiKey);
          if (!isValidKey) {
            errors.push({
              field: 'apiKey',
              message: `Invalid API key format for provider ${config.provider}`,
              severity: 'warning' as const
            });
          }
        }

        return errors;
      }
    ]
  };
}

// API key format validation
function validateApiKeyFormat(provider: string, apiKey: string): boolean {
  const patterns: Record<string, RegExp> = {
    openai: /^sk-[a-zA-Z0-9]{48}$|^sk-proj-[a-zA-Z0-9]{64}$/,
    anthropic: /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/,
    voyageai: /^pa-[a-zA-Z0-9]{32}$/,
    cohere: /^[a-zA-Z0-9]{40}$/,
    abacusai: /.{10,200}/ // More flexible pattern for Abacus.AI
  };

  const pattern = patterns[provider];
  return pattern ? pattern.test(apiKey) : apiKey.length > 0;
}

// Schema registry for easy access
export class SchemaRegistry {
  private schemas = new Map<string, ConfigSchema>();

  constructor() {
    this.initializeDefaultSchemas();
  }

  public register(name: string, schema: ConfigSchema): void {
    this.schemas.set(name, schema);
  }

  public get(name: string): ConfigSchema | null {
    return this.schemas.get(name) || null;
  }

  public getValidationSchema(name: string): ValidationSchema | null {
    const schema = this.get(name);
    return schema ? createValidationSchema(schema) : null;
  }

  public list(): string[] {
    return Array.from(this.schemas.keys());
  }

  private initializeDefaultSchemas(): void {
    this.register('base', baseAIConfigSchema);
    this.register('llm', llmConfigSchema);
    this.register('embeddings', embeddingsConfigSchema);
    this.register('chat', chatConfigSchema);
    this.register('registry', serviceRegistrySchema);
    
    // Provider-specific schemas
    for (const [name, schema] of Object.entries(providerSchemas)) {
      this.register(name, schema);
    }
  }
}

// Global schema registry
export const globalSchemaRegistry = new SchemaRegistry();

// Utility functions
export const SchemaUtils = {
  // Get schema for a specific configuration type
  getSchema(provider: AIProvider, serviceType: AIServiceType): ConfigSchema | null {
    const key = `${provider}_${serviceType}`;
    return globalSchemaRegistry.get(key) || globalSchemaRegistry.get(serviceType);
  },

  // Get validation schema
  getValidationSchema(provider: AIProvider, serviceType: AIServiceType): ValidationSchema | null {
    const key = `${provider}_${serviceType}`;
    return globalSchemaRegistry.getValidationSchema(key) || 
           globalSchemaRegistry.getValidationSchema(serviceType);
  },

  // Validate configuration against schema
  validateAgainstSchema(config: any, schema: ConfigSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation implementation
    // This is a simplified version - full implementation would be more comprehensive
    for (const [prop, propSchema] of Object.entries(schema.properties)) {
      const value = config[prop];
      const isRequired = schema.required?.includes(prop);
      
      if (isRequired && (value === undefined || value === null)) {
        errors.push(`Required property '${prop}' is missing`);
      }
      
      if (value !== undefined && value !== null) {
        if (propSchema.type === 'string' && typeof value !== 'string') {
          errors.push(`Property '${prop}' must be a string`);
        }
        if (propSchema.type === 'number' && typeof value !== 'number') {
          errors.push(`Property '${prop}' must be a number`);
        }
        if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Property '${prop}' must be a boolean`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};
