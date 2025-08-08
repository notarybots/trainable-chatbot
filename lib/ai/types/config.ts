
/**
 * Configuration interfaces for AI services
 */

import { AIProvider, AIServiceType } from './common';

// Base Configuration Interface
export interface BaseAIConfig {
  provider: AIProvider;
  apiKey: string;
  apiEndpoint?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  rateLimitStrategy?: 'exponential_backoff' | 'fixed_delay' | 'none';
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheOptions?: {
    ttl?: number;
    maxSize?: number;
    strategy?: 'lru' | 'fifo' | 'ttl';
  };
}

// LLM Configuration
export interface LLMConfig extends BaseAIConfig {
  service: 'llm';
  defaultModel: string;
  supportedModels?: string[];
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  defaultTopP?: number;
  defaultTopK?: number;
  defaultFrequencyPenalty?: number;
  defaultPresencePenalty?: number;
  streamingSupported?: boolean;
  functionCallingSupported?: boolean;
  visionSupported?: boolean;
  contextWindow?: {
    [model: string]: number;
  };
  costPerToken?: {
    [model: string]: {
      input: number;
      output: number;
    };
  };
}

// Embeddings Configuration
export interface EmbeddingsConfig extends BaseAIConfig {
  service: 'embeddings';
  defaultModel: string;
  supportedModels?: string[];
  dimensions?: {
    [model: string]: number;
  };
  batchSize?: number;
  maxBatchSize?: number;
  costPerToken?: {
    [model: string]: number;
  };
}

// Chat Configuration (Higher-level chat service)
export interface ChatConfig extends BaseAIConfig {
  service: 'chat';
  llmConfig: LLMConfig;
  embeddingsConfig?: EmbeddingsConfig;
  systemPrompt?: string;
  memoryStrategy?: 'sliding_window' | 'summary' | 'vector_store' | 'none';
  memorySize?: number;
  enableRAG?: boolean;
  ragConfig?: {
    similarityThreshold?: number;
    maxResults?: number;
    reranking?: boolean;
  };
  enableTools?: boolean;
  availableTools?: string[];
  autoRetry?: boolean;
  streamingEnabled?: boolean;
}

// Provider-Specific Configurations
export interface OpenAIConfig extends LLMConfig {
  provider: 'openai';
  organization?: string;
  project?: string;
}

export interface AbacusAIConfig extends LLMConfig {
  provider: 'abacusai';
  instanceId?: string;
}

export interface AnthropicConfig extends LLMConfig {
  provider: 'anthropic';
  version?: string;
}

export interface OpenAIEmbeddingsConfig extends EmbeddingsConfig {
  provider: 'openai';
  organization?: string;
  project?: string;
}

export interface VoyageAIConfig extends EmbeddingsConfig {
  provider: 'voyageai';
}

export interface CohereConfig extends LLMConfig {
  provider: 'cohere';
  version?: string;
}

// Multi-Provider Configuration
export interface MultiProviderConfig {
  primary: LLMConfig | EmbeddingsConfig | ChatConfig;
  fallbacks?: Array<LLMConfig | EmbeddingsConfig | ChatConfig>;
  loadBalancing?: {
    strategy: 'round_robin' | 'weighted' | 'failover' | 'cost_optimized';
    weights?: Record<AIProvider, number>;
  };
  healthCheck?: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
}

// Configuration Validation Interface
export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: string[];
}

// Environment-based Configuration
export interface EnvironmentConfig {
  development?: Partial<BaseAIConfig>;
  staging?: Partial<BaseAIConfig>;
  production?: Partial<BaseAIConfig>;
}

// Service Registry Configuration
export interface ServiceRegistryConfig {
  services: {
    llm?: MultiProviderConfig;
    embeddings?: MultiProviderConfig;
    chat?: MultiProviderConfig;
  };
  global?: {
    timeout?: number;
    retryAttempts?: number;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };
  environment?: 'development' | 'staging' | 'production';
}
