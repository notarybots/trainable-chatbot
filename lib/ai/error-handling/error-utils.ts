
/**
 * Error Handling Utilities and Helper Functions
 */

import { AIError, AIErrorType } from '../types/errors';
import { AIProvider, AIServiceType } from '../types/common';

export interface ErrorAnalysis {
  errorType: AIErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  suggestedAction: string;
  userMessage: string;
  debugInfo?: Record<string, any>;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<AIErrorType, number>;
  errorsByProvider: Record<AIProvider, number>;
  errorsByService: Record<AIServiceType, number>;
  recentErrors: AIError[];
  errorRate: number;
  meanTimeBetweenErrors: number;
}

export class ErrorAnalyzer {
  public static analyzeError(error: AIError): ErrorAnalysis {
    const { details } = error;
    
    return {
      errorType: details.type,
      severity: details.severity,
      retryable: details.retryable,
      suggestedAction: this.getSuggestedAction(error),
      userMessage: this.getUserFriendlyMessage(error),
      debugInfo: this.getDebugInfo(error)
    };
  }

  private static getSuggestedAction(error: AIError): string {
    const actions: Record<AIErrorType, string> = {
      authentication: 'Check your API key and ensure it has the correct permissions',
      authorization: 'Verify your account has access to the requested resource',
      rate_limit: 'Wait for the rate limit to reset before making more requests',
      quota_exceeded: 'Check your usage limits or upgrade your plan',
      invalid_request: 'Review your request parameters and fix any validation errors',
      model_not_found: 'Verify the model name is correct and available for your account',
      service_unavailable: 'Wait a few moments and retry your request',
      timeout: 'Increase the timeout value or try again with a smaller request',
      network: 'Check your internet connection and retry',
      parsing: 'Check the response format and ensure proper JSON parsing',
      validation: 'Review and correct the input parameters',
      streaming: 'Check your streaming configuration and connection stability',
      provider_error: 'Contact the provider support team if the issue persists',
      unknown: 'Review the error details and contact support if needed'
    };

    return actions[error.details.type] || actions.unknown;
  }

  private static getUserFriendlyMessage(error: AIError): string {
    const messages: Record<AIErrorType, string> = {
      authentication: 'There was an issue with authentication. Please check your credentials.',
      authorization: 'You don\'t have permission to access this resource.',
      rate_limit: 'Too many requests have been made. Please wait and try again.',
      quota_exceeded: 'Your usage limit has been reached. Please check your plan or wait for the reset.',
      invalid_request: 'The request was not formatted correctly. Please check your input.',
      model_not_found: 'The requested AI model is not available.',
      service_unavailable: 'The AI service is temporarily unavailable. Please try again later.',
      timeout: 'The request took too long to complete. Please try again.',
      network: 'There was a network connectivity issue. Please check your connection.',
      parsing: 'There was an issue processing the response.',
      validation: 'The provided input did not pass validation.',
      streaming: 'There was an issue with the streaming connection.',
      provider_error: 'The AI provider encountered an internal error.',
      unknown: 'An unexpected error occurred. Please try again.'
    };

    return messages[error.details.type] || messages.unknown;
  }

  private static getDebugInfo(error: AIError): Record<string, any> {
    return {
      timestamp: error.details.timestamp,
      requestId: error.details.requestId,
      provider: error.details.provider,
      service: error.details.service,
      model: error.details.model,
      originalError: error.details.originalError,
      stack: error.stack
    };
  }
}

export class ErrorStatisticsTracker {
  private errors: AIError[] = [];
  private readonly maxStoredErrors = 1000;

  public recordError(error: AIError): void {
    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(-this.maxStoredErrors);
    }
  }

  public getStatistics(timeRangeHours = 24): ErrorStatistics {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentErrors = this.errors.filter(
      error => new Date(error.details.timestamp) > cutoffTime
    );

    const errorsByType = this.groupByType(recentErrors);
    const errorsByProvider = this.groupByProvider(recentErrors);
    const errorsByService = this.groupByService(recentErrors);

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsByProvider,
      errorsByService,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      errorRate: this.calculateErrorRate(recentErrors, timeRangeHours),
      meanTimeBetweenErrors: this.calculateMeanTimeBetweenErrors(recentErrors)
    };
  }

  private groupByType(errors: AIError[]): Record<AIErrorType, number> {
    return errors.reduce((acc, error) => {
      acc[error.details.type] = (acc[error.details.type] || 0) + 1;
      return acc;
    }, {} as Record<AIErrorType, number>);
  }

  private groupByProvider(errors: AIError[]): Record<AIProvider, number> {
    return errors.reduce((acc, error) => {
      acc[error.details.provider] = (acc[error.details.provider] || 0) + 1;
      return acc;
    }, {} as Record<AIProvider, number>);
  }

  private groupByService(errors: AIError[]): Record<AIServiceType, number> {
    return errors.reduce((acc, error) => {
      acc[error.details.service] = (acc[error.details.service] || 0) + 1;
      return acc;
    }, {} as Record<AIServiceType, number>);
  }

  private calculateErrorRate(errors: AIError[], timeRangeHours: number): number {
    return errors.length / timeRangeHours;
  }

  private calculateMeanTimeBetweenErrors(errors: AIError[]): number {
    if (errors.length < 2) return 0;

    const timestamps = errors
      .map(error => new Date(error.details.timestamp).getTime())
      .sort((a, b) => a - b);

    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  public clearStatistics(): void {
    this.errors = [];
  }
}

// Global error statistics tracker
export const globalErrorTracker = new ErrorStatisticsTracker();

// Utility functions
export const ErrorUtils = {
  // Check if error is transient (likely to resolve on retry)
  isTransientError(error: AIError): boolean {
    const transientTypes: AIErrorType[] = [
      'rate_limit',
      'service_unavailable',
      'timeout',
      'network',
      'streaming'
    ];
    return transientTypes.includes(error.details.type);
  },

  // Check if error requires immediate attention
  isCriticalError(error: AIError): boolean {
    return error.details.severity === 'critical' ||
           ['authentication', 'authorization'].includes(error.details.type);
  },

  // Get error priority for logging/alerting
  getErrorPriority(error: AIError): 'low' | 'medium' | 'high' | 'critical' {
    if (error.details.severity === 'critical' || 
        ['authentication', 'authorization'].includes(error.details.type)) {
      return 'critical';
    }
    
    if (['quota_exceeded', 'service_unavailable'].includes(error.details.type)) {
      return 'high';
    }
    
    if (['rate_limit', 'timeout', 'model_not_found'].includes(error.details.type)) {
      return 'medium';
    }
    
    return 'low';
  },

  // Format error for logging
  formatErrorForLogging(error: AIError): string {
    const { details } = error;
    return [
      `[${details.provider}/${details.service}]`,
      `${details.type.toUpperCase()}:`,
      details.message,
      details.requestId ? `(Request: ${details.requestId})` : '',
      details.model ? `(Model: ${details.model})` : ''
    ].filter(Boolean).join(' ');
  },

  // Create error summary for dashboards
  createErrorSummary(error: AIError): Record<string, any> {
    return {
      id: error.details.requestId || 'unknown',
      type: error.details.type,
      provider: error.details.provider,
      service: error.details.service,
      model: error.details.model,
      message: error.message,
      severity: error.details.severity,
      retryable: error.details.retryable,
      timestamp: error.details.timestamp,
      code: error.details.code
    };
  },

  // Check if errors are related (same root cause)
  areErrorsRelated(error1: AIError, error2: AIError): boolean {
    return (
      error1.details.type === error2.details.type &&
      error1.details.provider === error2.details.provider &&
      error1.details.service === error2.details.service &&
      Math.abs(
        new Date(error1.details.timestamp).getTime() - 
        new Date(error2.details.timestamp).getTime()
      ) < 60000 // Within 1 minute
    );
  },

  // Get recommended retry delay based on error type
  getRecommendedRetryDelay(error: AIError): number {
    const baseDelays: Record<AIErrorType, number> = {
      rate_limit: error.details.retryAfter ? error.details.retryAfter * 1000 : 60000,
      service_unavailable: 5000,
      timeout: 2000,
      network: 1000,
      streaming: 3000,
      quota_exceeded: 0, // Don't retry
      authentication: 0, // Don't retry
      authorization: 0, // Don't retry
      invalid_request: 0, // Don't retry
      validation: 0, // Don't retry
      model_not_found: 0, // Don't retry
      parsing: 1000,
      provider_error: 5000,
      unknown: 2000
    };

    return baseDelays[error.details.type] || 2000;
  }
};

// Error reporting utilities
export const ErrorReporting = {
  // Should this error be reported to external monitoring?
  shouldReportError(error: AIError): boolean {
    const reportableTypes: AIErrorType[] = [
      'service_unavailable',
      'provider_error',
      'unknown'
    ];
    
    return reportableTypes.includes(error.details.type) ||
           error.details.severity === 'critical';
  },

  // Create error report for external services
  createErrorReport(error: AIError, context?: Record<string, any>): Record<string, any> {
    return {
      error: {
        type: error.details.type,
        message: error.message,
        code: error.details.code,
        provider: error.details.provider,
        service: error.details.service,
        model: error.details.model,
        severity: error.details.severity,
        timestamp: error.details.timestamp,
        requestId: error.details.requestId,
        stack: error.stack
      },
      context: {
        ...context,
        userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location?.href : undefined
      },
      environment: {
        nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
        platform: typeof process !== 'undefined' ? process.platform : undefined
      }
    };
  }
};
