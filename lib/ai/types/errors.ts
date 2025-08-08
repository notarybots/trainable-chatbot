
/**
 * Standardized error handling for AI services
 */

import { AIProvider, AIServiceType } from './common';

// Error Categories
export type AIErrorType = 
  | 'authentication'
  | 'authorization' 
  | 'rate_limit'
  | 'quota_exceeded'
  | 'invalid_request'
  | 'model_not_found'
  | 'service_unavailable'
  | 'timeout'
  | 'network'
  | 'parsing'
  | 'validation'
  | 'streaming'
  | 'provider_error'
  | 'unknown';

// Error Severity Levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Base AI Error Interface
export interface AIErrorDetails {
  type: AIErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string | number;
  provider: AIProvider;
  service: AIServiceType;
  model?: string;
  requestId?: string;
  timestamp: string;
  retryable: boolean;
  retryAfter?: number;
  originalError?: any;
  context?: Record<string, any>;
}

// Custom AI Error Class
export class AIError extends Error {
  public readonly details: AIErrorDetails;
  public readonly isAIError = true;

  constructor(details: AIErrorDetails) {
    super(details.message);
    this.name = 'AIError';
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  // Helper methods for error checking
  isRetryable(): boolean {
    return this.details.retryable;
  }

  isRateLimit(): boolean {
    return this.details.type === 'rate_limit';
  }

  isQuotaExceeded(): boolean {
    return this.details.type === 'quota_exceeded';
  }

  isNetworkError(): boolean {
    return this.details.type === 'network' || this.details.type === 'timeout';
  }

  isCritical(): boolean {
    return this.details.severity === 'critical';
  }

  getRetryDelay(): number {
    return this.details.retryAfter || 1000; // Default 1 second
  }
}

// Error Response Interface
export interface AIErrorResponse {
  success: false;
  error: AIErrorDetails;
  timestamp: string;
}

// Success Response Base
export interface AISuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Union Response Type
export type AIResponse<T = any> = AISuccessResponse<T> | AIErrorResponse;

// Streaming Error Interface
export interface StreamingError {
  status: 'error';
  error: AIErrorDetails;
  recoverable?: boolean;
  retryable?: boolean;
}

// Error Factory Functions
export const createAIError = (
  type: AIErrorType,
  message: string,
  provider: AIProvider,
  service: AIServiceType,
  options: Partial<Omit<AIErrorDetails, 'type' | 'message' | 'provider' | 'service' | 'timestamp'>> = {}
): AIError => {
  const details: AIErrorDetails = {
    type,
    message,
    provider,
    service,
    severity: options.severity || 'medium',
    timestamp: new Date().toISOString(),
    retryable: options.retryable ?? isRetryableErrorType(type),
    ...options,
  };

  return new AIError(details);
};

// Helper function to determine if error type is retryable
const isRetryableErrorType = (type: AIErrorType): boolean => {
  const retryableTypes: AIErrorType[] = [
    'rate_limit',
    'service_unavailable',
    'timeout',
    'network',
    'streaming'
  ];
  return retryableTypes.includes(type);
};

// Common error creators
export const createAuthError = (provider: AIProvider, service: AIServiceType, message = 'Authentication failed') =>
  createAIError('authentication', message, provider, service, { severity: 'high', retryable: false });

export const createRateLimitError = (provider: AIProvider, service: AIServiceType, retryAfter?: number) =>
  createAIError('rate_limit', 'Rate limit exceeded', provider, service, { 
    severity: 'medium', 
    retryable: true, 
    retryAfter 
  });

export const createTimeoutError = (provider: AIProvider, service: AIServiceType, timeout: number) =>
  createAIError('timeout', `Request timed out after ${timeout}ms`, provider, service, { 
    severity: 'medium', 
    retryable: true 
  });

export const createValidationError = (provider: AIProvider, service: AIServiceType, field: string, issue: string) =>
  createAIError('validation', `Validation failed for ${field}: ${issue}`, provider, service, { 
    severity: 'low', 
    retryable: false,
    context: { field, issue }
  });

export const createStreamingError = (provider: AIProvider, service: AIServiceType, message: string) =>
  createAIError('streaming', message, provider, service, { 
    severity: 'medium', 
    retryable: true 
  });
