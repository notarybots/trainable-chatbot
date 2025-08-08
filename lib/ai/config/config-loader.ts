
/**
 * Configuration Loading and Management
 */

import { 
  BaseAIConfig, 
  LLMConfig, 
  EmbeddingsConfig, 
  ChatConfig, 
  ServiceRegistryConfig,
  MultiProviderConfig 
} from '../types/config';
import { AIProvider, AIServiceType } from '../types/common';
import { ConfigValidator } from './config-validator';

export interface LoadConfigOptions {
  environment?: 'development' | 'staging' | 'production';
  validateConfig?: boolean;
  loadDefaults?: boolean;
  overrides?: Record<string, any>;
  secretsProvider?: SecretsProvider;
}

export interface SecretsProvider {
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

export interface ConfigSource {
  name: string;
  priority: number;
  load(): Promise<Record<string, any>>;
}

export class ConfigLoader {
  private sources: ConfigSource[] = [];
  private validator: ConfigValidator;
  private cache = new Map<string, any>();
  private cacheTimeout = 300000; // 5 minutes

  constructor() {
    this.validator = new ConfigValidator();
    this.initializeDefaultSources();
  }

  public addSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.priority - a.priority);
  }

  public async loadServiceConfig<T extends BaseAIConfig>(
    provider: AIProvider,
    serviceType: AIServiceType,
    options: LoadConfigOptions = {}
  ): Promise<T> {
    const cacheKey = `${provider}:${serviceType}:${options.environment || 'default'}`;
    
    // Check cache first
    const cached = this.getCachedConfig<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load configuration from all sources
    const config = await this.mergeConfigurations(provider, serviceType, options);
    
    // Apply overrides
    const finalConfig = { ...config, ...options.overrides };

    // Validate if requested
    if (options.validateConfig !== false) {
      const validation = await this.validator.validateConfig(finalConfig);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    // Cache the result
    this.setCachedConfig(cacheKey, finalConfig);

    return finalConfig as T;
  }

  public async loadRegistryConfig(
    options: LoadConfigOptions = {}
  ): Promise<ServiceRegistryConfig> {
    const cacheKey = `registry:${options.environment || 'default'}`;
    
    const cached = this.getCachedConfig<ServiceRegistryConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    const config = await this.mergeRegistryConfiguration(options);
    const finalConfig = { ...config, ...options.overrides };

    this.setCachedConfig(cacheKey, finalConfig);
    return finalConfig;
  }

  public async loadMultiProviderConfig(
    serviceType: AIServiceType,
    options: LoadConfigOptions = {}
  ): Promise<MultiProviderConfig> {
    const configs = await this.loadAllProviderConfigs(serviceType, options);
    
    return {
      primary: configs[0] as LLMConfig | EmbeddingsConfig | ChatConfig,
      fallbacks: configs.slice(1) as (LLMConfig | EmbeddingsConfig | ChatConfig)[],
      loadBalancing: {
        strategy: 'failover',
        weights: this.getDefaultWeights(configs)
      },
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 5000
      }
    };
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public async refreshConfig(
    provider: AIProvider,
    serviceType: AIServiceType,
    options: LoadConfigOptions = {}
  ): Promise<void> {
    const cacheKey = `${provider}:${serviceType}:${options.environment || 'default'}`;
    this.cache.delete(cacheKey);
    await this.loadServiceConfig(provider, serviceType, options);
  }

  private async mergeConfigurations(
    provider: AIProvider,
    serviceType: AIServiceType,
    options: LoadConfigOptions
  ): Promise<BaseAIConfig> {
    const configs: Record<string, any>[] = [];

    // Load from all sources
    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        const providerConfig = sourceConfig[provider]?.[serviceType] || 
                              sourceConfig[provider] || 
                              sourceConfig[serviceType] ||
                              sourceConfig;
        
        if (providerConfig && typeof providerConfig === 'object') {
          configs.push(providerConfig);
        }
      } catch (error) {
        console.warn(`Failed to load config from source ${source.name}:`, error);
      }
    }

    // Merge configurations (later sources override earlier ones)
    let mergedConfig: any = {};
    
    // Apply defaults if requested
    if (options.loadDefaults !== false) {
      mergedConfig = { ...this.getDefaultConfig(provider, serviceType) };
    }

    for (const config of configs) {
      mergedConfig = this.deepMerge(mergedConfig, config);
    }

    // Apply environment-specific overrides
    if (options.environment) {
      const envConfig = this.getEnvironmentOverrides(provider, serviceType, options.environment);
      mergedConfig = this.deepMerge(mergedConfig, envConfig);
    }

    // Resolve secrets
    if (options.secretsProvider) {
      mergedConfig = await this.resolveSecrets(mergedConfig, options.secretsProvider);
    }

    return mergedConfig;
  }

  private async mergeRegistryConfiguration(options: LoadConfigOptions): Promise<ServiceRegistryConfig> {
    const configs: Record<string, any>[] = [];

    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        const registryConfig = sourceConfig.registry || sourceConfig;
        configs.push(registryConfig);
      } catch (error) {
        console.warn(`Failed to load registry config from source ${source.name}:`, error);
      }
    }

    let mergedConfig: any = {
      services: {},
      global: {
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true,
        enableLogging: true,
        logLevel: 'info'
      },
      environment: options.environment || 'development'
    };

    for (const config of configs) {
      mergedConfig = this.deepMerge(mergedConfig, config);
    }

    return mergedConfig;
  }

  private async loadAllProviderConfigs(
    serviceType: AIServiceType,
    options: LoadConfigOptions
  ): Promise<BaseAIConfig[]> {
    const providers: AIProvider[] = ['openai', 'abacusai', 'anthropic', 'voyageai', 'cohere'];
    const configs: BaseAIConfig[] = [];

    for (const provider of providers) {
      try {
        const config = await this.loadServiceConfig(provider, serviceType, {
          ...options,
          validateConfig: false // Skip validation for batch loading
        });
        configs.push(config);
      } catch (error) {
        console.warn(`Failed to load config for ${provider}:`, error);
      }
    }

    return configs;
  }

  private getDefaultConfig(provider: AIProvider, serviceType: AIServiceType): Partial<BaseAIConfig> {
    const baseDefaults = {
      provider,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitStrategy: 'exponential_backoff' as const,
      enableMetrics: true,
      enableCaching: false
    };

    const serviceDefaults: Record<AIServiceType, any> = {
      llm: {
        ...baseDefaults,
        service: 'llm',
        defaultTemperature: 0.7,
        defaultMaxTokens: 2000,
        streamingSupported: true
      } as Partial<LLMConfig>,
      embeddings: {
        ...baseDefaults,
        service: 'embeddings',
        batchSize: 100,
        maxBatchSize: 2048
      } as Partial<EmbeddingsConfig>,
      chat: {
        ...baseDefaults,
        service: 'chat',
        systemPrompt: 'You are a helpful AI assistant.',
        memoryStrategy: 'sliding_window',
        streamingEnabled: true
      } as Partial<ChatConfig>,
      vision: baseDefaults,
      audio: baseDefaults
    };

    return serviceDefaults[serviceType] || baseDefaults;
  }

  private getEnvironmentOverrides(
    provider: AIProvider,
    serviceType: AIServiceType,
    environment: string
  ): Record<string, any> {
    const envOverrides: Record<string, Record<string, any>> = {
      development: {
        enableMetrics: true,
        enableCaching: false,
        timeout: 60000,
        retryAttempts: 5
      },
      staging: {
        enableMetrics: true,
        enableCaching: true,
        timeout: 30000,
        retryAttempts: 3
      },
      production: {
        enableMetrics: true,
        enableCaching: true,
        timeout: 15000,
        retryAttempts: 2,
        rateLimitStrategy: 'exponential_backoff'
      }
    };

    return envOverrides[environment] || {};
  }

  private getDefaultWeights(configs: BaseAIConfig[]): Record<AIProvider, number> {
    const weights: Record<AIProvider, number> = {
      openai: 1.0,
      abacusai: 0.9,
      anthropic: 0.8,
      voyageai: 0.7,
      cohere: 0.6,
      huggingface: 0.5,
      custom: 0.3
    };

    const result: Partial<Record<AIProvider, number>> = {};
    for (const config of configs) {
      result[config.provider] = weights[config.provider] || 0.5;
    }

    return result as Record<AIProvider, number>;
  }

  private async resolveSecrets(config: any, secretsProvider: SecretsProvider): Promise<any> {
    if (typeof config !== 'object' || config === null) {
      return config;
    }

    if (Array.isArray(config)) {
      return Promise.all(config.map(item => this.resolveSecrets(item, secretsProvider)));
    }

    const resolved: any = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && value.startsWith('secret:')) {
        const secretKey = value.substring(7);
        resolved[key] = await secretsProvider.getSecret(secretKey);
      } else if (typeof value === 'object') {
        resolved[key] = await this.resolveSecrets(value, secretsProvider);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null) {
      return source;
    }
    
    if (typeof source !== 'object' || source === null) {
      return target;
    }

    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  private getCachedConfig<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedConfig(key: string, config: any): void {
    this.cache.set(key, {
      data: config,
      timestamp: Date.now()
    });
  }

  private initializeDefaultSources(): void {
    // Environment variables source
    this.addSource(new EnvironmentSource());
    
    // JSON file source
    this.addSource(new FileSource('./ai-config.json', 50));
    
    // Package.json source
    this.addSource(new PackageJsonSource());
  }
}

// Built-in configuration sources
class EnvironmentSource implements ConfigSource {
  name = 'environment';
  priority = 100;

  async load(): Promise<Record<string, any>> {
    const config: Record<string, any> = {};
    
    // Load provider API keys
    const providers = ['openai', 'abacusai', 'anthropic', 'voyageai', 'cohere'];
    for (const provider of providers) {
      const apiKeyEnv = `${provider.toUpperCase()}_API_KEY`;
      const apiKey = process.env[apiKeyEnv];
      
      if (apiKey) {
        config[provider] = {
          apiKey,
          ...(process.env[`${provider.toUpperCase()}_API_ENDPOINT`] && {
            apiEndpoint: process.env[`${provider.toUpperCase()}_API_ENDPOINT`]
          })
        };
      }
    }

    // Load global settings
    if (process.env.AI_TIMEOUT) {
      config.global = { timeout: parseInt(process.env.AI_TIMEOUT, 10) };
    }

    if (process.env.AI_RETRY_ATTEMPTS) {
      config.global = { 
        ...config.global,
        retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS, 10) 
      };
    }

    return config;
  }
}

class FileSource implements ConfigSource {
  name = 'file';
  priority: number;
  private filePath: string;

  constructor(filePath: string, priority = 50) {
    this.filePath = filePath;
    this.priority = priority;
  }

  async load(): Promise<Record<string, any>> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid - return empty config
      return {};
    }
  }
}

class PackageJsonSource implements ConfigSource {
  name = 'package.json';
  priority = 10;

  async load(): Promise<Record<string, any>> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile('./package.json', 'utf-8');
      const packageJson = JSON.parse(content);
      return packageJson.aiConfig || {};
    } catch (error) {
      return {};
    }
  }
}

// Global config loader instance
export const globalConfigLoader = new ConfigLoader();

// Utility functions
export const ConfigUtils = {
  // Load configuration for a specific service
  async loadConfig<T extends BaseAIConfig>(
    provider: AIProvider,
    serviceType: AIServiceType,
    options?: LoadConfigOptions
  ): Promise<T> {
    return globalConfigLoader.loadServiceConfig<T>(provider, serviceType, options);
  },

  // Load all configurations for a service type
  async loadAllConfigs(
    serviceType: AIServiceType,
    options?: LoadConfigOptions
  ): Promise<BaseAIConfig[]> {
    return globalConfigLoader['loadAllProviderConfigs'](serviceType, options || {});
  },

  // Create a simple in-memory secrets provider
  createMemorySecretsProvider(secrets: Record<string, string> = {}): SecretsProvider {
    const store = new Map(Object.entries(secrets));
    
    return {
      async getSecret(key: string): Promise<string | null> {
        return store.get(key) || null;
      },
      async setSecret(key: string, value: string): Promise<void> {
        store.set(key, value);
      },
      async deleteSecret(key: string): Promise<void> {
        store.delete(key);
      }
    };
  }
};
