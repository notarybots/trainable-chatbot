
/**
 * Main entry point for the AI abstraction layer
 * Exports all interfaces, types, and utilities
 */

// Import types for utility functions
import type { 
  AIProvider, 
  AIServiceType, 
  AIMetadata 
} from './types/common';
import type { 
  BaseAIService
} from './interfaces/base';
import type { 
  LLMService 
} from './interfaces/llm';
import type { 
  EmbeddingsService 
} from './interfaces/embeddings';
import type { 
  ChatService 
} from './interfaces/chat';
import type { 
  AIError,
  AIErrorDetails,
  AIResponse 
} from './types/errors';

// Core Types
export * from './types/common';
export * from './types/config';
export * from './types/errors';
export * from './types/requests';
export * from './types/responses';

// Base Interfaces
export * from './interfaces/base';
export * from './interfaces/llm';
export * from './interfaces/embeddings';
export * from './interfaces/chat';
export * from './interfaces/factory';

// Error Handling System
export * from './error-handling';

// Configuration Management
export * from './config';

// Providers
export * from './providers/base/base-provider';
export * from './providers/openai/openai-llm-provider';
export * from './providers/openai/openai-embeddings-provider';
export * from './providers/openai/openai-chat-provider';

// Provider Factory
export { 
  providerFactory,
  createLLMService,
  createEmbeddingsService,
  createChatService,
  getDefaultLLMService,
  getDefaultEmbeddingsService,
  getDefaultChatService
} from './providers/factory/provider-factory';

// Re-export key interfaces for convenience
export type {
  // Core Services
  BaseAIService,
} from './interfaces/base';

export type {
  LLMService,
} from './interfaces/llm';

export type {
  EmbeddingsService,
} from './interfaces/embeddings';

export type {
  ChatService,
} from './interfaces/chat';

export type {
  // Factory
  AIServiceFactory,
  AIFactory,
  AIServiceRegistry,
} from './interfaces/factory';

export type {
  // Configuration
  LLMConfig,
  EmbeddingsConfig,
  ChatConfig,
  ServiceRegistryConfig,
} from './types/config';

export type {
  // Common Types
  AIProvider,
  AIServiceType,
  AIMessage,
  AIMetadata,
  StreamStatus,
} from './types/common';

export type {
  // Requests
  LLMGenerationRequest,
} from './interfaces/llm';

export type {
  EmbeddingRequest,
} from './types/requests';

export type {
  ChatRequest,
} from './interfaces/chat';

export type {
  // Responses
  LLMGenerationResponse,
} from './interfaces/llm';

export type {
  EmbeddingResponse,
} from './types/responses';

export type {
  ChatResponse,
} from './interfaces/chat';

export type {
  // Streaming
  AIStreamResponse,
  StreamingOptions,
} from './interfaces/base';

export type {
  // Error Handling
  AIError,
  AIErrorDetails,
  AIResponse,
} from './types/errors';

// Version information
export const AI_ABSTRACTION_VERSION = '1.0.0';

// Default configurations
export const DEFAULT_LLM_CONFIG = {
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  defaultTopP: 1.0,
  streamingSupported: true,
  functionCallingSupported: false,
  visionSupported: false,
} as const;

export const DEFAULT_EMBEDDINGS_CONFIG = {
  batchSize: 100,
  maxBatchSize: 2048,
} as const;

export const DEFAULT_CHAT_CONFIG = {
  systemPrompt: 'You are a helpful AI assistant.',
  memoryStrategy: 'sliding_window' as const,
  memorySize: 10,
  enableRAG: false,
  enableTools: false,
  autoRetry: true,
  streamingEnabled: true,
} as const;

// Utility functions for working with the abstraction layer
export const createRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createMetadata = (
  provider: AIProvider,
  model: string,
  options: Partial<AIMetadata> = {}
): AIMetadata => {
  return {
    requestId: createRequestId(),
    timestamp: new Date().toISOString(),
    provider,
    model,
    ...options,
  };
};

export const isStreamingSupported = (config: any): boolean => {
  return config?.streamingSupported === true || config?.streamingEnabled === true;
};

export const isFunctionCallingSupported = (config: any): boolean => {
  return config?.functionCallingSupported === true || config?.enableTools === true;
};

export const getProviderDisplayName = (provider: AIProvider): string => {
  const displayNames: Record<AIProvider, string> = {
    openai: 'OpenAI',
    abacusai: 'Abacus.AI',
    anthropic: 'Anthropic',
    voyageai: 'Voyage AI',
    cohere: 'Cohere',
    huggingface: 'Hugging Face',
    custom: 'Custom Provider',
  };
  return displayNames[provider] || provider;
};

export const getServiceTypeDisplayName = (serviceType: AIServiceType): string => {
  const displayNames: Record<AIServiceType, string> = {
    llm: 'Language Model',
    embeddings: 'Embeddings',
    chat: 'Chat',
    vision: 'Vision',
    audio: 'Audio',
  };
  return displayNames[serviceType] || serviceType;
};

// Type guards
export const isLLMService = (service: BaseAIService): service is LLMService => {
  return service.serviceType === 'llm';
};

export const isEmbeddingsService = (service: BaseAIService): service is EmbeddingsService => {
  return service.serviceType === 'embeddings';
};

export const isChatService = (service: BaseAIService): service is ChatService => {
  return service.serviceType === 'chat';
};

export const isAIError = (error: any): error is AIError => {
  return error && typeof error === 'object' && error.isAIError === true;
};

export const isSuccessResponse = <T>(response: AIResponse<T>): response is { success: true; data: T; metadata?: Record<string, any>; timestamp: string } => {
  return response.success === true;
};

export const isErrorResponse = (response: AIResponse<any>): response is { success: false; error: AIErrorDetails; timestamp: string } => {
  return response.success === false;
};

// Constants
export const SUPPORTED_PROVIDERS: AIProvider[] = [
  'openai',
  'abacusai',
  'anthropic',
  'voyageai',
  'cohere',
  'huggingface',
  'custom',
];

export const SUPPORTED_SERVICE_TYPES: AIServiceType[] = [
  'llm',
  'embeddings',
  'chat',
  'vision',
  'audio',
];

export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY = 1000; // 1 second

// Error messages
export const ERROR_MESSAGES = {
  PROVIDER_NOT_SUPPORTED: 'Provider not supported',
  SERVICE_TYPE_NOT_SUPPORTED: 'Service type not supported',
  CONFIG_INVALID: 'Configuration is invalid',
  CONNECTION_FAILED: 'Failed to connect to provider',
  REQUEST_FAILED: 'Request failed',
  STREAMING_ERROR: 'Streaming error occurred',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  QUOTA_EXCEEDED: 'Quota exceeded',
  MODEL_NOT_FOUND: 'Model not found',
  AUTHENTICATION_FAILED: 'Authentication failed',
  TIMEOUT: 'Request timed out',
} as const;

// Convenience function for quick setup
export async function setupAI() {
  try {
    const { getDefaultLLMService, getDefaultChatService } = await import('./providers/factory/provider-factory');
    const llmService = await getDefaultLLMService();
    const chatService = await getDefaultChatService();
    
    return {
      llm: llmService,
      chat: chatService,
      isReady: true,
    };
  } catch (error) {
    console.error('Failed to setup AI services:', error);
    return {
      llm: null,
      chat: null,
      isReady: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
