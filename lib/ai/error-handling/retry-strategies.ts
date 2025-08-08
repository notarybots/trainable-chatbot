
/**
 * Retry Logic and Strategies for AI Service Errors
 */

import { AIError, AIErrorType } from '../types/errors';
import { AIProvider, AIServiceType } from '../types/common';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryableErrors?: AIErrorType[];
  onRetry?: (attempt: number, error: AIError) => void;
  shouldRetry?: (error: AIError, attempt: number) => boolean;
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  error: AIError;
  provider: AIProvider;
  service: AIServiceType;
  startTime: number;
  totalDelay: number;
}

export class RetryStrategy {
  private readonly options: Required<RetryOptions>;

  constructor(options: RetryOptions = {}) {
    this.options = {
      maxAttempts: options.maxAttempts ?? 3,
      baseDelay: options.baseDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      jitter: options.jitter ?? true,
      retryableErrors: options.retryableErrors ?? [
        'rate_limit',
        'service_unavailable',
        'timeout',
        'network',
        'streaming'
      ],
      onRetry: options.onRetry ?? (() => {}),
      shouldRetry: options.shouldRetry ?? ((error, attempt) => 
        this.isRetryableError(error) && attempt < this.options.maxAttempts
      )
    };
  }

  public async execute<T>(
    operation: () => Promise<T>,
    context: Partial<RetryContext> = {}
  ): Promise<T> {
    let attempt = 1;
    let lastError: AIError;
    const startTime = Date.now();
    let totalDelay = 0;

    while (attempt <= this.options.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        const aiError = this.normalizeError(error, context);
        lastError = aiError;

        const retryContext: RetryContext = {
          attempt,
          maxAttempts: this.options.maxAttempts,
          error: aiError,
          provider: context.provider || 'custom',
          service: context.service || 'llm',
          startTime,
          totalDelay
        };

        if (!this.options.shouldRetry(aiError, attempt)) {
          throw aiError;
        }

        if (attempt === this.options.maxAttempts) {
          throw aiError;
        }

        const delay = this.calculateDelay(attempt, aiError);
        totalDelay += delay;

        this.options.onRetry(attempt, aiError);

        await this.sleep(delay);
        attempt++;
      }
    }

    throw lastError!;
  }

  private calculateDelay(attempt: number, error: AIError): number {
    let delay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1);
    
    // Use provider-specific retry-after if available
    if (error.details.retryAfter) {
      delay = Math.max(delay, error.details.retryAfter * 1000);
    }

    // Apply maximum delay limit
    delay = Math.min(delay, this.options.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.round(delay);
  }

  private isRetryableError(error: AIError): boolean {
    return this.options.retryableErrors.includes(error.details.type) ||
           error.isRetryable();
  }

  private normalizeError(error: any, context: Partial<RetryContext>): AIError {
    if (error instanceof AIError) {
      return error;
    }

    // Convert generic errors to AIError
    const errorType: AIErrorType = this.inferErrorType(error);
    return new AIError({
      type: errorType,
      message: error.message || 'Unknown error occurred',
      provider: context.provider || 'custom',
      service: context.service || 'llm',
      severity: 'medium',
      timestamp: new Date().toISOString(),
      retryable: this.options.retryableErrors.includes(errorType),
      originalError: error
    });
  }

  private inferErrorType(error: any): AIErrorType {
    const message = (error.message || '').toLowerCase();
    const statusCode = error.status || error.statusCode;

    if (statusCode === 401 || message.includes('unauthorized') || message.includes('authentication')) {
      return 'authentication';
    }
    if (statusCode === 403 || message.includes('forbidden')) {
      return 'authorization';
    }
    if (statusCode === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    if (statusCode === 402 || message.includes('quota') || message.includes('limit exceeded')) {
      return 'quota_exceeded';
    }
    if (statusCode >= 500 || message.includes('internal server') || message.includes('service unavailable')) {
      return 'service_unavailable';
    }
    if (message.includes('timeout') || error.name === 'TimeoutError') {
      return 'timeout';
    }
    if (message.includes('network') || error.name === 'NetworkError' || message.includes('connection')) {
      return 'network';
    }
    if (statusCode >= 400 && statusCode < 500) {
      return 'invalid_request';
    }

    return 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Pre-configured retry strategies for common scenarios
export const RetryStrategies = {
  // Conservative strategy for production use
  conservative: new RetryStrategy({
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true
  }),

  // Aggressive strategy for development/testing
  aggressive: new RetryStrategy({
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true
  }),

  // Rate limit focused strategy
  rateLimitOptimized: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitter: false,
    retryableErrors: ['rate_limit', 'quota_exceeded']
  }),

  // Network error focused strategy
  networkOptimized: new RetryStrategy({
    maxAttempts: 4,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['network', 'timeout', 'service_unavailable']
  }),

  // No retry strategy
  noRetry: new RetryStrategy({
    maxAttempts: 1
  })
};

// Provider-specific retry strategies
export const ProviderRetryStrategies = {
  openai: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 16000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ['rate_limit', 'service_unavailable', 'timeout', 'network']
  }),

  abacusai: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 1500,
    maxDelay: 30000,
    backoffMultiplier: 2.5,
    jitter: true
  }),

  anthropic: new RetryStrategy({
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 1.8,
    jitter: true
  }),

  voyageai: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 12000,
    backoffMultiplier: 2,
    jitter: true
  }),

  cohere: new RetryStrategy({
    maxAttempts: 3,
    baseDelay: 1200,
    maxDelay: 20000,
    backoffMultiplier: 2.2,
    jitter: true
  }),

  custom: new RetryStrategy({
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  })
};

// Utility function to get appropriate retry strategy
export function getRetryStrategy(
  provider: AIProvider,
  scenario?: 'conservative' | 'aggressive' | 'rateLimitOptimized' | 'networkOptimized'
): RetryStrategy {
  if (scenario) {
    return RetryStrategies[scenario];
  }
  
  return ProviderRetryStrategies[provider] || ProviderRetryStrategies.custom;
}

// Decorator for automatic retry functionality
export function withRetry(retryStrategy: RetryStrategy) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return;

    descriptor.value = async function (...args: any[]) {
      return retryStrategy.execute(
        () => originalMethod.apply(this, args),
        {
          provider: this.provider,
          service: this.serviceType
        }
      );
    } as T;

    return descriptor;
  };
}
