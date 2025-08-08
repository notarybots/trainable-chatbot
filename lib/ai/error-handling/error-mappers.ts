
/**
 * Provider-specific Error Mapping and Standardization
 */

import { AIError, AIErrorType, createAIError } from '../types/errors';
import { AIProvider, AIServiceType } from '../types/common';

export interface ProviderError {
  status?: number;
  code?: string | number;
  message: string;
  type?: string;
  data?: any;
  headers?: Record<string, string>;
}

export interface ErrorMapping {
  condition: (error: ProviderError) => boolean;
  mapTo: AIErrorType;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  retryable?: boolean;
  extractRetryAfter?: (error: ProviderError) => number | undefined;
}

export class ProviderErrorMapper {
  private mappings: Map<AIProvider, ErrorMapping[]> = new Map();

  constructor() {
    this.initializeDefaultMappings();
  }

  public mapError(
    error: any,
    provider: AIProvider,
    service: AIServiceType,
    model?: string
  ): AIError {
    const providerError = this.normalizeProviderError(error);
    const mappings = this.mappings.get(provider) || [];
    
    for (const mapping of mappings) {
      if (mapping.condition(providerError)) {
        const retryAfter = mapping.extractRetryAfter?.(providerError);
        
        return createAIError(
          mapping.mapTo,
          providerError.message,
          provider,
          service,
          {
            code: providerError.code,
            model,
            severity: mapping.severity || 'medium',
            retryable: mapping.retryable ?? true,
            retryAfter,
            originalError: error,
            context: {
              status: providerError.status,
              headers: providerError.headers,
              data: providerError.data
            }
          }
        );
      }
    }

    // Fallback to generic mapping
    return this.createGenericError(providerError, provider, service, model);
  }

  public registerMapping(provider: AIProvider, mappings: ErrorMapping[]): void {
    const existing = this.mappings.get(provider) || [];
    this.mappings.set(provider, [...existing, ...mappings]);
  }

  private normalizeProviderError(error: any): ProviderError {
    // Handle various error formats
    if (error.response) {
      // Axios-style error
      return {
        status: error.response.status,
        message: error.response.data?.error?.message || error.message,
        code: error.response.data?.error?.code || error.code,
        type: error.response.data?.error?.type,
        data: error.response.data,
        headers: error.response.headers
      };
    }

    if (error.status || error.statusCode) {
      // HTTP error
      return {
        status: error.status || error.statusCode,
        message: error.message || 'HTTP Error',
        code: error.code,
        type: error.type,
        data: error.data
      };
    }

    // Generic error
    return {
      message: error.message || 'Unknown error',
      code: error.code,
      type: error.type,
      data: error
    };
  }

  private createGenericError(
    providerError: ProviderError,
    provider: AIProvider,
    service: AIServiceType,
    model?: string
  ): AIError {
    const errorType = this.inferErrorType(providerError);
    
    return createAIError(
      errorType,
      providerError.message,
      provider,
      service,
      {
        code: providerError.code,
        model,
        originalError: providerError.data
      }
    );
  }

  private inferErrorType(error: ProviderError): AIErrorType {
    const message = error.message?.toLowerCase() || '';
    const status = error.status;

    if (status === 401 || message.includes('unauthorized') || message.includes('invalid api key')) {
      return 'authentication';
    }
    if (status === 403 || message.includes('forbidden') || message.includes('access denied')) {
      return 'authorization';
    }
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    if (status === 402 || message.includes('quota') || message.includes('usage limit')) {
      return 'quota_exceeded';
    }
    if (message.includes('model not found') || message.includes('model does not exist')) {
      return 'model_not_found';
    }
    if ((status !== undefined && status >= 500) || message.includes('internal server error')) {
      return 'service_unavailable';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('connection') || message.includes('network')) {
      return 'network';
    }
    if (status === 400 || message.includes('bad request') || message.includes('invalid')) {
      return 'invalid_request';
    }
    if (message.includes('parsing') || message.includes('json')) {
      return 'parsing';
    }

    return 'unknown';
  }

  private initializeDefaultMappings(): void {
    // OpenAI Error Mappings
    this.mappings.set('openai', [
      {
        condition: (error) => error.status === 401 || error.code === 'invalid_api_key',
        mapTo: 'authentication',
        severity: 'critical',
        retryable: false
      },
      {
        condition: (error) => error.status === 429 || error.code === 'rate_limit_exceeded',
        mapTo: 'rate_limit',
        severity: 'medium',
        retryable: true,
        extractRetryAfter: (error) => {
          const retryAfter = error.headers?.['retry-after'];
          return retryAfter ? parseInt(retryAfter, 10) : undefined;
        }
      },
      {
        condition: (error) => error.status === 402 || error.code === 'insufficient_quota',
        mapTo: 'quota_exceeded',
        severity: 'high',
        retryable: false
      },
      {
        condition: (error) => error.code === 'model_not_found',
        mapTo: 'model_not_found',
        severity: 'medium',
        retryable: false
      },
      {
        condition: (error) => error.status !== undefined && error.status >= 500,
        mapTo: 'service_unavailable',
        severity: 'high',
        retryable: true
      },
      {
        condition: (error) => error.status === 400 && error.code === 'invalid_request_error',
        mapTo: 'invalid_request',
        severity: 'low',
        retryable: false
      }
    ]);

    // Abacus.AI Error Mappings
    this.mappings.set('abacusai', [
      {
        condition: (error) => error.status === 401 || error.message?.includes('authentication'),
        mapTo: 'authentication',
        severity: 'critical',
        retryable: false
      },
      {
        condition: (error) => error.status === 429,
        mapTo: 'rate_limit',
        severity: 'medium',
        retryable: true
      },
      {
        condition: (error) => error.message?.includes('quota') || error.message?.includes('limit'),
        mapTo: 'quota_exceeded',
        severity: 'high',
        retryable: false
      },
      {
        condition: (error) => error.status !== undefined && error.status >= 500,
        mapTo: 'service_unavailable',
        severity: 'high',
        retryable: true
      }
    ]);

    // Anthropic Error Mappings
    this.mappings.set('anthropic', [
      {
        condition: (error) => error.status === 401,
        mapTo: 'authentication',
        severity: 'critical',
        retryable: false
      },
      {
        condition: (error) => error.status === 429 || error.type === 'rate_limit_error',
        mapTo: 'rate_limit',
        severity: 'medium',
        retryable: true,
        extractRetryAfter: (error) => {
          return error.data?.retry_after;
        }
      },
      {
        condition: (error) => error.type === 'overloaded_error',
        mapTo: 'service_unavailable',
        severity: 'high',
        retryable: true
      },
      {
        condition: (error) => error.status === 400,
        mapTo: 'invalid_request',
        severity: 'low',
        retryable: false
      }
    ]);

    // Cohere Error Mappings
    this.mappings.set('cohere', [
      {
        condition: (error) => error.status === 401,
        mapTo: 'authentication',
        severity: 'critical',
        retryable: false
      },
      {
        condition: (error) => error.status === 429,
        mapTo: 'rate_limit',
        severity: 'medium',
        retryable: true
      },
      {
        condition: (error) => error.message?.includes('too many tokens'),
        mapTo: 'quota_exceeded',
        severity: 'medium',
        retryable: false
      }
    ]);

    // Voyage AI Error Mappings
    this.mappings.set('voyageai', [
      {
        condition: (error) => error.status === 401,
        mapTo: 'authentication',
        severity: 'critical',
        retryable: false
      },
      {
        condition: (error) => error.status === 429,
        mapTo: 'rate_limit',
        severity: 'medium',
        retryable: true
      },
      {
        condition: (error) => error.status !== undefined && error.status >= 500,
        mapTo: 'service_unavailable',
        severity: 'high',
        retryable: true
      }
    ]);
  }
}

// Global error mapper instance
export const globalErrorMapper = new ProviderErrorMapper();

// Convenience functions for mapping errors
export function mapProviderError(
  error: any,
  provider: AIProvider,
  service: AIServiceType,
  model?: string
): AIError {
  return globalErrorMapper.mapError(error, provider, service, model);
}

export function registerErrorMappings(provider: AIProvider, mappings: ErrorMapping[]): void {
  globalErrorMapper.registerMapping(provider, mappings);
}

// Common error patterns for quick reference
export const CommonErrorPatterns = {
  authentication: (provider: AIProvider, message = 'Authentication failed') => 
    createAIError('authentication', message, provider, 'llm', { 
      severity: 'critical', 
      retryable: false 
    }),

  rateLimitWithBackoff: (provider: AIProvider, retryAfter: number) =>
    createAIError('rate_limit', 'Rate limit exceeded', provider, 'llm', {
      severity: 'medium',
      retryable: true,
      retryAfter
    }),

  serviceUnavailable: (provider: AIProvider, message = 'Service temporarily unavailable') =>
    createAIError('service_unavailable', message, provider, 'llm', {
      severity: 'high',
      retryable: true
    }),

  quotaExceeded: (provider: AIProvider, message = 'Usage quota exceeded') =>
    createAIError('quota_exceeded', message, provider, 'llm', {
      severity: 'high',
      retryable: false
    }),

  modelNotFound: (provider: AIProvider, model: string) =>
    createAIError('model_not_found', `Model '${model}' not found`, provider, 'llm', {
      model,
      severity: 'medium',
      retryable: false
    })
};
