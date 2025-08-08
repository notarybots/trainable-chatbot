
/**
 * Configuration Management System
 * Environment-based config loading, validation, and factory patterns
 */

export * from './config-loader';
export * from './config-validator';
export * from './config-factory';
export * from './environment-config';
export * from './schema-definitions';

// Re-export core config types for convenience
export type {
  BaseAIConfig,
  LLMConfig,
  EmbeddingsConfig,
  ChatConfig,
  MultiProviderConfig,
  ServiceRegistryConfig,
  ConfigValidationResult,
  OpenAIConfig,
  AbacusAIConfig,
  AnthropicConfig,
  VoyageAIConfig,
  CohereConfig
} from '../types/config';
