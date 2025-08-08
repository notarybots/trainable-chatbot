
/**
 * Environment-specific Configuration Management
 */

import { BaseAIConfig, ServiceRegistryConfig } from '../types/config';
import { AIProvider, AIServiceType } from '../types/common';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvironmentSettings {
  timeout: number;
  retryAttempts: number;
  enableMetrics: boolean;
  enableCaching: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  rateLimitStrategy: 'exponential_backoff' | 'fixed_delay' | 'none';
  healthCheckInterval: number;
  circuitBreakerEnabled: boolean;
}

export interface EnvironmentConfigManager {
  getEnvironment(): Environment;
  setEnvironment(env: Environment): void;
  getSettings(env?: Environment): EnvironmentSettings;
  applyToConfig<T extends BaseAIConfig>(config: T, env?: Environment): T;
  loadFromEnvironmentVariables(): Record<string, any>;
  validateEnvironment(): Promise<{ valid: boolean; issues: string[] }>;
}

export class DefaultEnvironmentConfigManager implements EnvironmentConfigManager {
  private currentEnvironment: Environment;
  private settings: Record<Environment, EnvironmentSettings>;

  constructor(initialEnvironment?: Environment) {
    this.currentEnvironment = initialEnvironment || this.detectEnvironment();
    this.settings = this.initializeDefaultSettings();
  }

  public getEnvironment(): Environment {
    return this.currentEnvironment;
  }

  public setEnvironment(env: Environment): void {
    this.currentEnvironment = env;
  }

  public getSettings(env?: Environment): EnvironmentSettings {
    const targetEnv = env || this.currentEnvironment;
    return { ...this.settings[targetEnv] };
  }

  public applyToConfig<T extends BaseAIConfig>(config: T, env?: Environment): T {
    const settings = this.getSettings(env);
    
    return {
      ...config,
      timeout: config.timeout || settings.timeout,
      retryAttempts: config.retryAttempts ?? settings.retryAttempts,
      enableMetrics: config.enableMetrics ?? settings.enableMetrics,
      enableCaching: config.enableCaching ?? settings.enableCaching,
      rateLimitStrategy: config.rateLimitStrategy || settings.rateLimitStrategy
    };
  }

  public loadFromEnvironmentVariables(): Record<string, any> {
    const config: Record<string, any> = {};

    // Load provider API keys
    const providers: AIProvider[] = ['openai', 'abacusai', 'anthropic', 'voyageai', 'cohere', 'huggingface'];
    
    for (const provider of providers) {
      const apiKeyVar = `${provider.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_API_KEY`;
      const endpointVar = `${provider.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_API_ENDPOINT`;
      
      const apiKey = process.env[apiKeyVar];
      const apiEndpoint = process.env[endpointVar];
      
      if (apiKey) {
        config[provider] = { apiKey };
        if (apiEndpoint) {
          config[provider].apiEndpoint = apiEndpoint;
        }
      }
    }

    // Load global settings
    const globalSettings: Array<{ envVar: string; configKey: string; type: 'string' | 'number' | 'boolean' }> = [
      { envVar: 'AI_TIMEOUT', configKey: 'timeout', type: 'number' },
      { envVar: 'AI_RETRY_ATTEMPTS', configKey: 'retryAttempts', type: 'number' },
      { envVar: 'AI_ENABLE_METRICS', configKey: 'enableMetrics', type: 'boolean' },
      { envVar: 'AI_ENABLE_CACHING', configKey: 'enableCaching', type: 'boolean' },
      { envVar: 'AI_ENABLE_LOGGING', configKey: 'enableLogging', type: 'boolean' },
      { envVar: 'AI_LOG_LEVEL', configKey: 'logLevel', type: 'string' },
      { envVar: 'AI_RATE_LIMIT_STRATEGY', configKey: 'rateLimitStrategy', type: 'string' }
    ];

    const global: Record<string, any> = {};
    for (const setting of globalSettings) {
      const value = process.env[setting.envVar];
      if (value !== undefined) {
        switch (setting.type) {
          case 'number':
            global[setting.configKey] = parseInt(value, 10);
            break;
          case 'boolean':
            global[setting.configKey] = value.toLowerCase() === 'true';
            break;
          default:
            global[setting.configKey] = value;
        }
      }
    }

    if (Object.keys(global).length > 0) {
      config.global = global;
    }

    // Load environment-specific overrides
    const environment = process.env.NODE_ENV || process.env.AI_ENVIRONMENT;
    if (environment) {
      config.environment = environment;
    }

    return config;
  }

  public async validateEnvironment(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check for required environment variables based on current environment
    const requiredVars = this.getRequiredEnvironmentVariables();
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        issues.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Validate API keys format if present
    const apiKeyValidations = [
      { provider: 'openai', envVar: 'OPENAI_API_KEY', pattern: /^sk-[a-zA-Z0-9]{48}$|^sk-proj-[a-zA-Z0-9]{64}$/ },
      { provider: 'anthropic', envVar: 'ANTHROPIC_API_KEY', pattern: /^sk-ant-api03-[a-zA-Z0-9_-]{95}$/ },
      { provider: 'voyageai', envVar: 'VOYAGEAI_API_KEY', pattern: /^pa-[a-zA-Z0-9]{32}$/ },
      { provider: 'cohere', envVar: 'COHERE_API_KEY', pattern: /^[a-zA-Z0-9]{40}$/ }
    ];

    for (const validation of apiKeyValidations) {
      const apiKey = process.env[validation.envVar];
      if (apiKey && !validation.pattern.test(apiKey)) {
        issues.push(`Invalid API key format for ${validation.provider}: ${validation.envVar}`);
      }
    }

    // Check numeric environment variables
    const numericVars = ['AI_TIMEOUT', 'AI_RETRY_ATTEMPTS'];
    for (const varName of numericVars) {
      const value = process.env[varName];
      if (value && isNaN(parseInt(value, 10))) {
        issues.push(`Invalid numeric value for ${varName}: ${value}`);
      }
    }

    // Check boolean environment variables
    const booleanVars = ['AI_ENABLE_METRICS', 'AI_ENABLE_CACHING', 'AI_ENABLE_LOGGING'];
    for (const varName of booleanVars) {
      const value = process.env[varName];
      if (value && !['true', 'false'].includes(value.toLowerCase())) {
        issues.push(`Invalid boolean value for ${varName}: ${value} (must be 'true' or 'false')`);
      }
    }

    // Validate URLs if present
    const urlVars = ['OPENAI_API_ENDPOINT', 'ANTHROPIC_API_ENDPOINT', 'VOYAGEAI_API_ENDPOINT'];
    for (const varName of urlVars) {
      const url = process.env[varName];
      if (url) {
        try {
          new URL(url);
        } catch {
          issues.push(`Invalid URL format for ${varName}: ${url}`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  public getEnvironmentInfo(): {
    current: Environment;
    detected: Environment;
    nodeEnv: string | undefined;
    settings: EnvironmentSettings;
    variables: Record<string, string>;
  } {
    return {
      current: this.currentEnvironment,
      detected: this.detectEnvironment(),
      nodeEnv: process.env.NODE_ENV,
      settings: this.getSettings(),
      variables: this.getRelevantEnvironmentVariables()
    };
  }

  public createServiceRegistryConfig(): ServiceRegistryConfig {
    const envConfig = this.loadFromEnvironmentVariables();
    const settings = this.getSettings();

    return {
      services: {
        llm: envConfig.llm ? { primary: envConfig.llm } : undefined,
        embeddings: envConfig.embeddings ? { primary: envConfig.embeddings } : undefined,
        chat: envConfig.chat ? { primary: envConfig.chat } : undefined
      },
      global: {
        timeout: settings.timeout,
        retryAttempts: settings.retryAttempts,
        enableMetrics: settings.enableMetrics,
        enableLogging: settings.enableLogging,
        logLevel: settings.logLevel,
        ...envConfig.global
      },
      environment: this.currentEnvironment === 'test' ? 'development' : this.currentEnvironment
    };
  }

  private detectEnvironment(): Environment {
    // Try multiple environment variables
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const aiEnv = process.env.AI_ENVIRONMENT?.toLowerCase();
    const env = process.env.ENVIRONMENT?.toLowerCase();

    // Check explicit AI environment first
    if (aiEnv && ['development', 'staging', 'production', 'test'].includes(aiEnv)) {
      return aiEnv as Environment;
    }

    // Check standard NODE_ENV
    if (nodeEnv && ['development', 'staging', 'production', 'test'].includes(nodeEnv)) {
      return nodeEnv as Environment;
    }

    // Check generic ENVIRONMENT
    if (env && ['development', 'staging', 'production', 'test'].includes(env)) {
      return env as Environment;
    }

    // Default to development
    return 'development';
  }

  private initializeDefaultSettings(): Record<Environment, EnvironmentSettings> {
    return {
      development: {
        timeout: 60000,
        retryAttempts: 5,
        enableMetrics: true,
        enableCaching: false,
        enableLogging: true,
        logLevel: 'debug',
        rateLimitStrategy: 'exponential_backoff',
        healthCheckInterval: 30000,
        circuitBreakerEnabled: false
      },
      staging: {
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true,
        enableCaching: true,
        enableLogging: true,
        logLevel: 'info',
        rateLimitStrategy: 'exponential_backoff',
        healthCheckInterval: 60000,
        circuitBreakerEnabled: true
      },
      production: {
        timeout: 15000,
        retryAttempts: 2,
        enableMetrics: true,
        enableCaching: true,
        enableLogging: true,
        logLevel: 'warn',
        rateLimitStrategy: 'exponential_backoff',
        healthCheckInterval: 120000,
        circuitBreakerEnabled: true
      },
      test: {
        timeout: 10000,
        retryAttempts: 1,
        enableMetrics: false,
        enableCaching: false,
        enableLogging: false,
        logLevel: 'error',
        rateLimitStrategy: 'none',
        healthCheckInterval: 0,
        circuitBreakerEnabled: false
      }
    };
  }

  private getRequiredEnvironmentVariables(): string[] {
    const baseRequired: string[] = [];
    
    // In production, we might want to enforce certain API keys
    if (this.currentEnvironment === 'production') {
      // Add any required API keys for production
      // baseRequired.push('OPENAI_API_KEY');
    }

    return baseRequired;
  }

  private getRelevantEnvironmentVariables(): Record<string, string> {
    const relevant: Record<string, string> = {};
    const prefixes = ['AI_', 'OPENAI_', 'ANTHROPIC_', 'VOYAGEAI_', 'COHERE_', 'ABACUSAI_', 'NODE_ENV', 'ENVIRONMENT'];
    
    for (const [key, value] of Object.entries(process.env)) {
      if (prefixes.some(prefix => key.startsWith(prefix))) {
        relevant[key] = value || '';
      }
    }

    return relevant;
  }
}

// Global environment manager
export const globalEnvironmentManager = new DefaultEnvironmentConfigManager();

// Utility functions
export const EnvironmentUtils = {
  // Get current environment
  getCurrentEnvironment(): Environment {
    return globalEnvironmentManager.getEnvironment();
  },

  // Check if we're in a specific environment
  isDevelopment(): boolean {
    return globalEnvironmentManager.getEnvironment() === 'development';
  },

  isStaging(): boolean {
    return globalEnvironmentManager.getEnvironment() === 'staging';
  },

  isProduction(): boolean {
    return globalEnvironmentManager.getEnvironment() === 'production';
  },

  isTest(): boolean {
    return globalEnvironmentManager.getEnvironment() === 'test';
  },

  // Apply environment settings to any config
  applyEnvironmentSettings<T extends BaseAIConfig>(config: T, env?: Environment): T {
    return globalEnvironmentManager.applyToConfig(config, env);
  },

  // Load configuration from environment variables
  loadFromEnv(): Record<string, any> {
    return globalEnvironmentManager.loadFromEnvironmentVariables();
  },

  // Validate current environment setup
  async validateSetup(): Promise<{ valid: boolean; issues: string[] }> {
    return globalEnvironmentManager.validateEnvironment();
  },

  // Get environment information for debugging
  getInfo() {
    return globalEnvironmentManager.getEnvironmentInfo();
  },

  // Create default registry config for current environment
  createRegistryConfig(): ServiceRegistryConfig {
    return globalEnvironmentManager.createServiceRegistryConfig();
  }
};

// Environment-specific configuration presets
export const EnvironmentPresets = {
  // Quick development setup
  development: {
    openai: {
      llm: (apiKey: string) => globalEnvironmentManager.applyToConfig({
        provider: 'openai' as const,
        service: 'llm' as const,
        apiKey,
        defaultModel: 'gpt-3.5-turbo',
        defaultTemperature: 0.9,
        defaultMaxTokens: 2000,
        streamingSupported: true
      }),
      embeddings: (apiKey: string) => globalEnvironmentManager.applyToConfig({
        provider: 'openai' as const,
        service: 'embeddings' as const,
        apiKey,
        defaultModel: 'text-embedding-3-small',
        batchSize: 50
      })
    }
  },

  // Production-ready setup
  production: {
    openai: {
      llm: (apiKey: string) => globalEnvironmentManager.applyToConfig({
        provider: 'openai' as const,
        service: 'llm' as const,
        apiKey,
        defaultModel: 'gpt-4',
        defaultTemperature: 0.7,
        defaultMaxTokens: 1500,
        streamingSupported: true
      }),
      embeddings: (apiKey: string) => globalEnvironmentManager.applyToConfig({
        provider: 'openai' as const,
        service: 'embeddings' as const,
        apiKey,
        defaultModel: 'text-embedding-3-large',
        batchSize: 100
      })
    }
  },

  // Testing setup
  test: {
    mock: {
      llm: () => globalEnvironmentManager.applyToConfig({
        provider: 'custom' as const,
        service: 'llm' as const,
        apiKey: 'test-key',
        apiEndpoint: 'http://localhost:3001/mock',
        defaultModel: 'mock-model',
        timeout: 5000
      })
    }
  }
};
