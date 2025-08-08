
/**
 * Error Recovery Strategies and Patterns
 */

import { AIError, AIErrorType } from '../types/errors';
import { AIProvider, AIServiceType } from '../types/common';
import { BaseAIService } from '../interfaces/base';

export interface RecoveryStrategy {
  name: string;
  priority: number;
  canRecover(error: AIError): boolean;
  recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<T>;
}

export interface RecoveryContext {
  service: BaseAIService;
  provider: AIProvider;
  serviceType: AIServiceType;
  attempt: number;
  fallbackServices?: BaseAIService[];
  metadata?: Record<string, any>;
}

export interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  error?: AIError;
  strategy?: string;
  fallbackUsed?: boolean;
  metadata?: Record<string, any>;
}

export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [];

  constructor() {
    // Register default recovery strategies
    this.registerStrategy(new FallbackProviderStrategy());
    this.registerStrategy(new ModelFallbackStrategy());
    this.registerStrategy(new RequestSimplificationStrategy());
    this.registerStrategy(new CacheRecoveryStrategy());
    this.registerStrategy(new DegradedModeStrategy());
  }

  public registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    // Sort by priority (higher priority first)
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  public async recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<RecoveryResult<T>> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          const result = await strategy.recover(error, originalOperation, context);
          return {
            success: true,
            data: result,
            strategy: strategy.name,
            fallbackUsed: strategy.name !== 'original'
          };
        } catch (recoveryError) {
          // Continue to next strategy if this one fails
          continue;
        }
      }
    }

    // No recovery strategy worked
    return {
      success: false,
      error,
      strategy: 'none'
    };
  }
}

// Fallback to alternative provider
class FallbackProviderStrategy implements RecoveryStrategy {
  name = 'fallback_provider';
  priority = 90;

  canRecover(error: AIError): boolean {
    return ['service_unavailable', 'rate_limit', 'quota_exceeded', 'provider_error']
      .includes(error.details.type);
  }

  async recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<T> {
    if (!context.fallbackServices || context.fallbackServices.length === 0) {
      throw error;
    }

    // Try each fallback service
    for (const fallbackService of context.fallbackServices) {
      try {
        // This would need to be implemented with proper service switching
        // For now, we'll throw to indicate this needs implementation
        throw new Error('Fallback provider recovery not yet implemented');
      } catch (fallbackError) {
        continue;
      }
    }

    throw error;
  }
}

// Fallback to simpler model
class ModelFallbackStrategy implements RecoveryStrategy {
  name = 'model_fallback';
  priority = 80;

  canRecover(error: AIError): boolean {
    return ['model_not_found', 'quota_exceeded', 'rate_limit'].includes(error.details.type);
  }

  async recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<T> {
    const fallbackModels = this.getFallbackModels(context.provider, error.details.model);
    
    for (const model of fallbackModels) {
      try {
        // This would need service configuration update
        // For now, we'll throw to indicate this needs implementation
        throw new Error('Model fallback recovery not yet implemented');
      } catch (fallbackError) {
        continue;
      }
    }

    throw error;
  }

  private getFallbackModels(provider: AIProvider, currentModel?: string): string[] {
    const fallbackMap: Record<AIProvider, Record<string, string[]>> = {
      openai: {
        'gpt-4': ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
        'gpt-4-turbo': ['gpt-4', 'gpt-3.5-turbo'],
        'text-embedding-3-large': ['text-embedding-3-small', 'text-embedding-ada-002']
      },
      abacusai: {
        'gpt-4.1-mini': ['gpt-3.5-turbo', 'claude-3-haiku'],
        'claude-3-opus': ['claude-3-sonnet', 'claude-3-haiku']
      },
      anthropic: {
        'claude-3-opus': ['claude-3-sonnet', 'claude-3-haiku'],
        'claude-3-sonnet': ['claude-3-haiku']
      },
      voyageai: {
        'voyage-large-2': ['voyage-2', 'voyage-lite-02-instruct']
      },
      cohere: {
        'command-r-plus': ['command-r', 'command'],
        'embed-english-v3.0': ['embed-english-v2.0']
      },
      huggingface: {},
      custom: {}
    };

    return fallbackMap[provider]?.[currentModel || ''] || [];
  }
}

// Simplify request parameters
class RequestSimplificationStrategy implements RecoveryStrategy {
  name = 'request_simplification';
  priority = 70;

  canRecover(error: AIError): boolean {
    return ['invalid_request', 'quota_exceeded', 'validation'].includes(error.details.type);
  }

  async recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<T> {
    // This would need to modify request parameters
    // For now, we'll throw to indicate this needs implementation
    throw new Error('Request simplification recovery not yet implemented');
  }
}

// Use cached response if available
class CacheRecoveryStrategy implements RecoveryStrategy {
  name = 'cache_recovery';
  priority = 60;

  canRecover(error: AIError): boolean {
    return !['authentication', 'authorization'].includes(error.details.type);
  }

  async recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<T> {
    // This would need cache integration
    // For now, we'll throw to indicate this needs implementation
    throw new Error('Cache recovery not yet implemented');
  }
}

// Provide degraded but functional response
class DegradedModeStrategy implements RecoveryStrategy {
  name = 'degraded_mode';
  priority = 10; // Lowest priority - last resort

  canRecover(error: AIError): boolean {
    return true; // Can always provide some form of degraded response
  }

  async recover<T>(
    error: AIError,
    originalOperation: () => Promise<T>,
    context: RecoveryContext
  ): Promise<T> {
    // Return a minimal response indicating service is degraded
    const degradedResponse = this.createDegradedResponse(error, context);
    return degradedResponse as T;
  }

  private createDegradedResponse(error: AIError, context: RecoveryContext): any {
    const baseResponse = {
      id: `degraded_${Date.now()}`,
      object: context.serviceType,
      created: Math.floor(Date.now() / 1000),
      model: 'degraded_mode',
      provider: context.provider,
      metadata: {
        degraded: true,
        originalError: error.details.type,
        message: 'Service is temporarily degraded. Please try again later.'
      }
    };

    switch (context.serviceType) {
      case 'llm':
      case 'chat':
        return {
          ...baseResponse,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'I apologize, but I\'m currently experiencing technical difficulties. Please try your request again in a few moments.'
            },
            finishReason: 'stop'
          }],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        };

      case 'embeddings':
        return {
          ...baseResponse,
          data: [{ index: 0, embedding: [], object: 'embedding' }],
          usage: { promptTokens: 0, totalTokens: 0 }
        };

      default:
        return baseResponse;
    }
  }
}

// Error recovery utilities
export const ErrorRecoveryUtils = {
  // Create standard recovery context
  createRecoveryContext(
    service: BaseAIService,
    options: Partial<RecoveryContext> = {}
  ): RecoveryContext {
    return {
      service,
      provider: service.provider,
      serviceType: service.serviceType,
      attempt: 1,
      ...options
    };
  },

  // Check if error is recoverable
  isRecoverable(error: AIError): boolean {
    const nonRecoverableTypes: AIErrorType[] = [
      'authentication',
      'authorization',
      'validation'
    ];
    return !nonRecoverableTypes.includes(error.details.type);
  },

  // Get recovery priority based on error type
  getRecoveryPriority(error: AIError): 'high' | 'medium' | 'low' {
    switch (error.details.type) {
      case 'service_unavailable':
      case 'rate_limit':
        return 'high';
      case 'quota_exceeded':
      case 'model_not_found':
      case 'timeout':
        return 'medium';
      default:
        return 'low';
    }
  }
};

// Global error recovery manager instance
export const globalRecoveryManager = new ErrorRecoveryManager();
