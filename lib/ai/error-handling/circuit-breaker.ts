
/**
 * Circuit Breaker Pattern for AI Service Reliability
 */

import { AIError, AIErrorType } from '../types/errors';
import { AIProvider, AIServiceType } from '../types/common';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  minimumRequests: number;
  halfOpenMaxAttempts: number;
  failureTypes?: AIErrorType[];
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextRetryTime?: number;
  totalRequests: number;
  recentResults: boolean[];
}

export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly provider: AIProvider;
  private readonly service: AIServiceType;

  constructor(
    provider: AIProvider,
    service: AIServiceType,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    this.provider = provider;
    this.service = service;
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 60000, // 1 minute
      monitoringWindow: options.monitoringWindow ?? 300000, // 5 minutes
      minimumRequests: options.minimumRequests ?? 10,
      halfOpenMaxAttempts: options.halfOpenMaxAttempts ?? 3,
      failureTypes: options.failureTypes ?? [
        'service_unavailable',
        'timeout',
        'network',
        'provider_error'
      ]
    };

    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      totalRequests: 0,
      recentResults: []
    };
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw this.createCircuitOpenError();
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  public getState(): CircuitBreakerState {
    return { ...this.state };
  }

  public getMetrics(): {
    state: string;
    failureRate: number;
    successRate: number;
    totalRequests: number;
    recentFailures: number;
    timeUntilRetry?: number;
  } {
    const recentFailures = this.state.recentResults.filter(result => !result).length;
    const recentSuccesses = this.state.recentResults.filter(result => result).length;
    const totalRecent = this.state.recentResults.length;

    return {
      state: this.state.state,
      failureRate: totalRecent > 0 ? recentFailures / totalRecent : 0,
      successRate: totalRecent > 0 ? recentSuccesses / totalRecent : 1,
      totalRequests: this.state.totalRequests,
      recentFailures,
      timeUntilRetry: this.state.nextRetryTime ? 
        Math.max(0, this.state.nextRetryTime - Date.now()) : undefined
    };
  }

  public reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      totalRequests: 0,
      recentResults: []
    };
  }

  public forceOpen(): void {
    this.state.state = 'open';
    this.state.nextRetryTime = Date.now() + this.options.resetTimeout;
  }

  public forceClose(): void {
    this.reset();
  }

  private onSuccess(): void {
    this.state.successes++;
    this.state.totalRequests++;
    this.state.lastSuccessTime = Date.now();
    this.addRecentResult(true);

    if (this.state.state === 'half-open') {
      if (this.state.successes >= this.options.halfOpenMaxAttempts) {
        this.transitionToClosed();
      }
    }
  }

  private onFailure(error: any): void {
    this.state.totalRequests++;
    
    // Only count failures that match our criteria
    if (this.isCountableFailure(error)) {
      this.state.failures++;
      this.state.lastFailureTime = Date.now();
      this.addRecentResult(false);

      if (this.shouldTransitionToOpen()) {
        this.transitionToOpen();
      }
    } else {
      // Don't count non-countable failures in recent results
      this.addRecentResult(true);
    }
  }

  private isCountableFailure(error: any): boolean {
    if (!(error instanceof AIError)) {
      return true; // Count unknown errors as failures
    }

    return this.options.failureTypes.includes(error.details.type);
  }

  private shouldTransitionToOpen(): boolean {
    // Need minimum number of requests before considering circuit open
    if (this.state.totalRequests < this.options.minimumRequests) {
      return false;
    }

    // Check failure threshold
    if (this.state.failures >= this.options.failureThreshold) {
      return true;
    }

    // Check failure rate within monitoring window
    const recentFailures = this.state.recentResults.filter(result => !result).length;
    const recentTotal = this.state.recentResults.length;
    
    if (recentTotal >= this.options.minimumRequests) {
      const failureRate = recentFailures / recentTotal;
      return failureRate >= (this.options.failureThreshold / this.options.minimumRequests);
    }

    return false;
  }

  private shouldAttemptReset(): boolean {
    return this.state.nextRetryTime ? 
      Date.now() >= this.state.nextRetryTime : 
      Date.now() - (this.state.lastFailureTime || 0) >= this.options.resetTimeout;
  }

  private transitionToClosed(): void {
    this.state.state = 'closed';
    this.state.failures = 0;
    this.state.successes = 0;
    delete this.state.nextRetryTime;
  }

  private transitionToOpen(): void {
    this.state.state = 'open';
    this.state.nextRetryTime = Date.now() + this.options.resetTimeout;
    this.state.successes = 0;
  }

  private transitionToHalfOpen(): void {
    this.state.state = 'half-open';
    this.state.successes = 0;
    delete this.state.nextRetryTime;
  }

  private addRecentResult(success: boolean): void {
    this.state.recentResults.push(success);
    
    // Keep only recent results within monitoring window
    const maxResults = Math.max(this.options.minimumRequests * 2, 50);
    if (this.state.recentResults.length > maxResults) {
      this.state.recentResults = this.state.recentResults.slice(-maxResults);
    }
  }

  private createCircuitOpenError(): AIError {
    return new AIError({
      type: 'service_unavailable',
      message: `Circuit breaker is open for ${this.provider}/${this.service}. Service is temporarily unavailable.`,
      provider: this.provider,
      service: this.service,
      severity: 'high',
      timestamp: new Date().toISOString(),
      retryable: true,
      retryAfter: this.state.nextRetryTime ? 
        Math.ceil((this.state.nextRetryTime - Date.now()) / 1000) : 
        Math.ceil(this.options.resetTimeout / 1000),
      context: {
        circuitState: this.state.state,
        failures: this.state.failures,
        nextRetry: this.state.nextRetryTime
      }
    });
  }
}

// Circuit breaker manager for multiple services
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  
  public getCircuitBreaker(
    provider: AIProvider,
    service: AIServiceType,
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    const key = `${provider}:${service}`;
    
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(provider, service, options));
    }
    
    return this.breakers.get(key)!;
  }

  public getAllStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};
    
    for (const [key, breaker] of this.breakers) {
      states[key] = breaker.getState();
    }
    
    return states;
  }

  public getAllMetrics(): Record<string, ReturnType<CircuitBreaker['getMetrics']>> {
    const metrics: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};
    
    for (const [key, breaker] of this.breakers) {
      metrics[key] = breaker.getMetrics();
    }
    
    return metrics;
  }

  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  public removeCircuitBreaker(provider: AIProvider, service: AIServiceType): void {
    const key = `${provider}:${service}`;
    this.breakers.delete(key);
  }
}

// Global circuit breaker manager
export const globalCircuitBreakerManager = new CircuitBreakerManager();

// Decorator for automatic circuit breaker protection
export function withCircuitBreaker(
  options?: Partial<CircuitBreakerOptions>
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return;

    descriptor.value = async function (this: { provider?: AIProvider; serviceType?: AIServiceType }, ...args: any[]) {
      const provider = (this as any)?.provider || 'openai';
      const serviceType = (this as any)?.serviceType || 'llm';
      
      const circuitBreaker = globalCircuitBreakerManager.getCircuitBreaker(
        provider,
        serviceType,
        options
      );

      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    } as T;

    return descriptor;
  };
}
