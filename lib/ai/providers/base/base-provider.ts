
/**
 * Base Provider Implementation
 * Provides common functionality for all AI providers
 */

import { BaseAIService, ModelInfo, RequestContext } from '../../interfaces/base';
import { AIProvider, AIServiceType, AIMetadata, RateLimitInfo } from '../../types/common';
import { AIResponse, AIError, createAIError } from '../../types/errors';
import { BaseAIConfig } from '../../types/config';

export abstract class BaseProvider implements BaseAIService {
  public abstract readonly provider: AIProvider;
  public abstract readonly serviceType: AIServiceType;
  public readonly version = '1.0.0';

  protected config: BaseAIConfig;
  protected isInitialized = false;

  constructor(config: BaseAIConfig) {
    this.config = { ...config };
  }

  // Abstract methods that must be implemented by concrete providers
  public abstract getConfig(): BaseAIConfig;
  public abstract listModels(): Promise<AIResponse<string[]>>;
  public abstract getModelInfo(model: string): Promise<AIResponse<ModelInfo>>;

  // Configuration management
  public async updateConfig(config: Partial<BaseAIConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  // Service lifecycle
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Validate configuration
    await this.validateConfig();
    this.isInitialized = true;
  }

  public async destroy(): Promise<void> {
    this.isInitialized = false;
  }

  // Health check implementation
  public async healthCheck(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.healthy;
    } catch (error) {
      return false;
    }
  }

  public async getStatus(): Promise<{
    healthy: boolean;
    latency: number;
    rateLimits?: RateLimitInfo;
    metadata?: Record<string, any>;
  }> {
    const startTime = Date.now();
    
    try {
      // Basic connectivity test - list models
      await this.listModels();
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency,
        metadata: {
          provider: this.provider,
          serviceType: this.serviceType,
          version: this.version,
          initialized: this.isInitialized,
        }
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Helper methods for common operations
  protected createSuccessResponse<T>(data: T, metadata?: Record<string, any>): AIResponse<T> {
    return {
      success: true,
      data,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  protected createErrorResponse(error: AIError): AIResponse<never> {
    return {
      success: false,
      error: error.details,
      timestamp: new Date().toISOString(),
    };
  }

  protected handleError(error: any, operation: string): AIError {
    if (error instanceof AIError) {
      return error;
    }

    // Map common HTTP errors to AI errors
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message || 'Unknown error';

      switch (status) {
        case 401:
          return createAIError('authentication', message, this.provider, this.serviceType, {
            code: status,
            originalError: error,
            retryable: false,
          });
        case 403:
          return createAIError('authorization', message, this.provider, this.serviceType, {
            code: status,
            originalError: error,
            retryable: false,
          });
        case 429:
          return createAIError('rate_limit', message, this.provider, this.serviceType, {
            code: status,
            originalError: error,
            retryable: true,
            retryAfter: error.response.headers?.['retry-after'] ? 
              parseInt(error.response.headers['retry-after']) * 1000 : undefined,
          });
        case 503:
          return createAIError('service_unavailable', message, this.provider, this.serviceType, {
            code: status,
            originalError: error,
            retryable: true,
          });
        default:
          return createAIError('provider_error', message, this.provider, this.serviceType, {
            code: status,
            originalError: error,
            context: { operation },
          });
      }
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return createAIError('timeout', `Request timed out during ${operation}`, this.provider, this.serviceType, {
        originalError: error,
        retryable: true,
      });
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return createAIError('network', `Network error during ${operation}`, this.provider, this.serviceType, {
        originalError: error,
        retryable: true,
      });
    }

    // Default error
    return createAIError('unknown', `Unknown error during ${operation}: ${error.message}`, this.provider, this.serviceType, {
      originalError: error,
      context: { operation },
    });
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw createAIError('validation', 'API key is required', this.provider, this.serviceType, {
        retryable: false,
      });
    }
  }

  protected createRequestContext(options: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
    tenantId?: string;
    metadata?: Record<string, any>;
  } = {}): RequestContext {
    return {
      requestId: options.requestId || `${this.provider}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: options.userId,
      sessionId: options.sessionId,
      tenantId: options.tenantId,
      timestamp: new Date().toISOString(),
      metadata: options.metadata,
    };
  }

  protected createMetadata(context: RequestContext, model: string, additionalData: any = {}): AIMetadata {
    return {
      requestId: context.requestId,
      timestamp: context.timestamp,
      provider: this.provider,
      model,
      userId: context.userId,
      sessionId: context.sessionId,
      tenantId: context.tenantId,
      ...additionalData,
    };
  }
}
