
/**
 * Configuration Factory Patterns
 */

import {
  BaseAIConfig,
  LLMConfig,
  EmbeddingsConfig,
  ChatConfig,
  MultiProviderConfig,
  OpenAIConfig,
  AbacusAIConfig,
  AnthropicConfig,
  VoyageAIConfig,
  CohereConfig
} from '../types/config';
import { AIProvider, AIServiceType } from '../types/common';
import { ConfigValidator } from './config-validator';
import { ConfigLoader, LoadConfigOptions } from './config-loader';

export interface ConfigTemplate {
  name: string;
  description: string;
  provider: AIProvider;
  serviceType: AIServiceType;
  template: Partial<BaseAIConfig>;
  requiredFields: string[];
  optionalFields: string[];
}

export interface ConfigBuilderOptions {
  validate?: boolean;
  applyDefaults?: boolean;
  environment?: 'development' | 'staging' | 'production';
}

export class ConfigFactory {
  private templates = new Map<string, ConfigTemplate>();
  private validator: ConfigValidator;
  private loader: ConfigLoader;

  constructor() {
    this.validator = new ConfigValidator();
    this.loader = new ConfigLoader();
    this.initializeTemplates();
  }

  // Factory methods for specific providers
  public createOpenAILLMConfig(options: Partial<OpenAIConfig> = {}): LLMConfig {
    const template = this.getTemplate('openai_llm');
    if (!template) throw new Error('OpenAI LLM template not found');
    return this.buildFromTemplate<LLMConfig>(template, options);
  }

  public createOpenAIEmbeddingsConfig(options: Partial<OpenAIConfig> = {}): EmbeddingsConfig {
    const template = this.getTemplate('openai_embeddings');
    if (!template) throw new Error('OpenAI Embeddings template not found');
    return this.buildFromTemplate<EmbeddingsConfig>(template, options);
  }

  public createAbacusAILLMConfig(options: Partial<AbacusAIConfig> = {}): LLMConfig {
    const template = this.getTemplate('abacusai_llm');
    if (!template) throw new Error('Abacus.AI LLM template not found');
    return this.buildFromTemplate<LLMConfig>(template, options);
  }

  public createAnthropicLLMConfig(options: Partial<AnthropicConfig> = {}): LLMConfig {
    const template = this.getTemplate('anthropic_llm');
    if (!template) throw new Error('Anthropic LLM template not found');
    return this.buildFromTemplate<LLMConfig>(template, options);
  }

  public createVoyageAIEmbeddingsConfig(options: Partial<VoyageAIConfig> = {}): EmbeddingsConfig {
    const template = this.getTemplate('voyageai_embeddings');
    if (!template) throw new Error('Voyage AI Embeddings template not found');
    return this.buildFromTemplate<EmbeddingsConfig>(template, options);
  }

  public createCohereLLMConfig(options: Partial<CohereConfig> = {}): LLMConfig {
    const template = this.getTemplate('cohere_llm');
    if (!template) throw new Error('Cohere LLM template not found');
    return this.buildFromTemplate<LLMConfig>(template, options);
  }

  // Generic factory methods
  public createServiceConfig<T extends BaseAIConfig>(
    provider: AIProvider,
    serviceType: AIServiceType,
    options: Partial<T> = {},
    builderOptions: ConfigBuilderOptions = {}
  ): T {
    const templateKey = `${provider}_${serviceType}`;
    const template = this.getTemplate(templateKey);
    
    if (!template) {
      throw new Error(`No template found for ${provider} ${serviceType}`);
    }

    return this.buildFromTemplate<T>(template, options, builderOptions);
  }

  public async createFromEnvironment<T extends BaseAIConfig>(
    provider: AIProvider,
    serviceType: AIServiceType,
    loadOptions: LoadConfigOptions = {}
  ): Promise<T> {
    return this.loader.loadServiceConfig<T>(provider, serviceType, loadOptions);
  }

  public createMultiProviderConfig(
    serviceType: AIServiceType,
    primaryProvider: AIProvider,
    fallbackProviders: AIProvider[] = [],
    options: Partial<MultiProviderConfig> = {}
  ): MultiProviderConfig {
    const primaryTemplate = this.getTemplate(`${primaryProvider}_${serviceType}`);
    if (!primaryTemplate) {
      throw new Error(`No template found for primary provider ${primaryProvider} ${serviceType}`);
    }

    const primary = this.buildFromTemplate(primaryTemplate, {}) as LLMConfig | EmbeddingsConfig | ChatConfig;
    const fallbacks = fallbackProviders.map(provider => {
      const template = this.getTemplate(`${provider}_${serviceType}`);
      if (!template) {
        console.warn(`No template found for fallback provider ${provider} ${serviceType}`);
        return null;
      }
      return this.buildFromTemplate(template, {}) as LLMConfig | EmbeddingsConfig | ChatConfig;
    }).filter(Boolean) as (LLMConfig | EmbeddingsConfig | ChatConfig)[];

    return {
      primary,
      fallbacks,
      loadBalancing: {
        strategy: 'failover',
        weights: this.createDefaultWeights([primary, ...fallbacks])
      },
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 5000
      },
      ...options
    };
  }

  public createChatConfig(
    llmProvider: AIProvider,
    embeddingsProvider?: AIProvider,
    options: Partial<ChatConfig> = {}
  ): ChatConfig {
    const llmConfig = this.createServiceConfig<LLMConfig>(llmProvider, 'llm');
    const embeddingsConfig = embeddingsProvider ? 
      this.createServiceConfig<EmbeddingsConfig>(embeddingsProvider, 'embeddings') : 
      undefined;

    return {
      provider: llmProvider,
      service: 'chat',
      apiKey: llmConfig.apiKey,
      llmConfig,
      embeddingsConfig,
      systemPrompt: 'You are a helpful AI assistant.',
      memoryStrategy: 'sliding_window',
      memorySize: 10,
      enableRAG: !!embeddingsConfig,
      enableTools: false,
      autoRetry: true,
      streamingEnabled: true,
      ...options
    };
  }

  // Configuration builder pattern
  public builder(provider: AIProvider, serviceType: AIServiceType): ConfigBuilder<BaseAIConfig> {
    const template = this.getTemplate(`${provider}_${serviceType}`);
    return new ConfigBuilder(template, this.validator);
  }

  // Template management
  public registerTemplate(template: ConfigTemplate): void {
    const key = `${template.provider}_${template.serviceType}`;
    this.templates.set(key, template);
  }

  public getTemplate(key: string): ConfigTemplate | null {
    return this.templates.get(key) || null;
  }

  public listTemplates(): ConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplatesForProvider(provider: AIProvider): ConfigTemplate[] {
    return this.listTemplates().filter(t => t.provider === provider);
  }

  public getTemplatesForService(serviceType: AIServiceType): ConfigTemplate[] {
    return this.listTemplates().filter(t => t.serviceType === serviceType);
  }

  // Utility methods
  public cloneConfig<T extends BaseAIConfig>(config: T): T {
    return JSON.parse(JSON.stringify(config));
  }

  public mergeConfigs<T extends BaseAIConfig>(base: T, override: Partial<T>): T {
    return { ...base, ...override };
  }

  public async validateConfig(config: BaseAIConfig): Promise<boolean> {
    const result = await this.validator.validateConfig(config);
    return result.valid;
  }

  private buildFromTemplate<T extends BaseAIConfig>(
    template: ConfigTemplate,
    options: Partial<T>,
    builderOptions: ConfigBuilderOptions = {}
  ): T {
    let config = { ...template.template } as T;

    // Apply defaults if requested
    if (builderOptions.applyDefaults !== false) {
      config = this.applyEnvironmentDefaults(config, builderOptions.environment);
    }

    // Merge with provided options
    config = { ...config, ...options };

    // Validate if requested
    if (builderOptions.validate) {
      this.validator.validateConfig(config).then(result => {
        if (!result.valid) {
          throw new Error(`Configuration validation failed: ${result.errors.map(e => e.message).join(', ')}`);
        }
      });
    }

    return config;
  }

  private applyEnvironmentDefaults<T extends BaseAIConfig>(
    config: T,
    environment?: string
  ): T {
    if (!environment) return config;

    const envDefaults: Record<string, Partial<BaseAIConfig>> = {
      development: {
        timeout: 60000,
        retryAttempts: 5,
        enableMetrics: true,
        enableCaching: false
      },
      staging: {
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true,
        enableCaching: true
      },
      production: {
        timeout: 15000,
        retryAttempts: 2,
        enableMetrics: true,
        enableCaching: true,
        rateLimitStrategy: 'exponential_backoff'
      }
    };

    const defaults = envDefaults[environment];
    return defaults ? { ...defaults, ...config } : config;
  }

  private createDefaultWeights(configs: (LLMConfig | EmbeddingsConfig | ChatConfig)[]): Record<AIProvider, number> {
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

  private initializeTemplates(): void {
    // OpenAI Templates
    this.registerTemplate({
      name: 'OpenAI LLM',
      description: 'OpenAI GPT models for text generation',
      provider: 'openai',
      serviceType: 'llm',
      template: {
        provider: 'openai',
        service: 'llm',
        apiKey: '',
        apiEndpoint: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
        supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'],
        defaultTemperature: 0.7,
        defaultMaxTokens: 2000,
        defaultTopP: 1.0,
        streamingSupported: true,
        functionCallingSupported: true,
        visionSupported: false,
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true
      } as Partial<LLMConfig>,
      requiredFields: ['apiKey', 'defaultModel'],
      optionalFields: ['organization', 'project', 'timeout', 'retryAttempts']
    });

    this.registerTemplate({
      name: 'OpenAI Embeddings',
      description: 'OpenAI text embeddings',
      provider: 'openai',
      serviceType: 'embeddings',
      template: {
        provider: 'openai',
        service: 'embeddings',
        apiKey: '',
        apiEndpoint: 'https://api.openai.com/v1',
        defaultModel: 'text-embedding-3-small',
        supportedModels: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
        batchSize: 100,
        maxBatchSize: 2048,
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true
      } as Partial<EmbeddingsConfig>,
      requiredFields: ['apiKey', 'defaultModel'],
      optionalFields: ['organization', 'project', 'batchSize']
    });

    // Abacus.AI Templates
    this.registerTemplate({
      name: 'Abacus.AI LLM',
      description: 'Abacus.AI language models',
      provider: 'abacusai',
      serviceType: 'llm',
      template: {
        provider: 'abacusai',
        service: 'llm',
        apiKey: '',
        apiEndpoint: 'https://apps.abacus.ai/v1/chat/completions',
        defaultModel: 'gpt-4.1-mini',
        supportedModels: ['gpt-4.1-mini', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        defaultTemperature: 0.7,
        defaultMaxTokens: 3000,
        defaultTopP: 1.0,
        streamingSupported: true,
        functionCallingSupported: false,
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true
      } as Partial<LLMConfig>,
      requiredFields: ['apiKey', 'defaultModel'],
      optionalFields: ['instanceId', 'timeout']
    });

    // Anthropic Templates
    this.registerTemplate({
      name: 'Anthropic LLM',
      description: 'Anthropic Claude models',
      provider: 'anthropic',
      serviceType: 'llm',
      template: {
        provider: 'anthropic',
        service: 'llm',
        apiKey: '',
        apiEndpoint: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-sonnet-20240229',
        supportedModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        defaultTemperature: 0.7,
        defaultMaxTokens: 4000,
        defaultTopP: 1.0,
        streamingSupported: true,
        functionCallingSupported: true,
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true
      } as Partial<LLMConfig>,
      requiredFields: ['apiKey', 'defaultModel'],
      optionalFields: ['version', 'timeout']
    });

    // Voyage AI Templates
    this.registerTemplate({
      name: 'Voyage AI Embeddings',
      description: 'Voyage AI text embeddings',
      provider: 'voyageai',
      serviceType: 'embeddings',
      template: {
        provider: 'voyageai',
        service: 'embeddings',
        apiKey: '',
        apiEndpoint: 'https://api.voyageai.com/v1',
        defaultModel: 'voyage-2',
        supportedModels: ['voyage-large-2', 'voyage-2', 'voyage-lite-02-instruct'],
        batchSize: 100,
        maxBatchSize: 128,
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true
      } as Partial<EmbeddingsConfig>,
      requiredFields: ['apiKey', 'defaultModel'],
      optionalFields: ['batchSize', 'timeout']
    });

    // Cohere Templates
    this.registerTemplate({
      name: 'Cohere LLM',
      description: 'Cohere Command models',
      provider: 'cohere',
      serviceType: 'llm',
      template: {
        provider: 'cohere',
        service: 'llm',
        apiKey: '',
        apiEndpoint: 'https://api.cohere.ai/v1',
        defaultModel: 'command-r',
        supportedModels: ['command-r-plus', 'command-r', 'command'],
        defaultTemperature: 0.7,
        defaultMaxTokens: 2000,
        streamingSupported: true,
        functionCallingSupported: false,
        timeout: 30000,
        retryAttempts: 3,
        enableMetrics: true
      } as Partial<LLMConfig>,
      requiredFields: ['apiKey', 'defaultModel'],
      optionalFields: ['version', 'timeout']
    });
  }
}

// Configuration Builder Class
export class ConfigBuilder<T extends BaseAIConfig> {
  private config: Partial<T> = {};
  private template: ConfigTemplate | null;
  private validator: ConfigValidator;

  constructor(template: ConfigTemplate | null, validator: ConfigValidator) {
    this.template = template;
    this.validator = validator;
    
    if (template) {
      this.config = { ...template.template } as Partial<T>;
    }
  }

  public apiKey(key: string): this {
    this.config.apiKey = key;
    return this;
  }

  public endpoint(url: string): this {
    this.config.apiEndpoint = url;
    return this;
  }

  public timeout(ms: number): this {
    this.config.timeout = ms;
    return this;
  }

  public retries(attempts: number): this {
    this.config.retryAttempts = attempts;
    return this;
  }

  public model(modelName: string): this {
    if ('defaultModel' in this.config) {
      (this.config as any).defaultModel = modelName;
    }
    return this;
  }

  public temperature(temp: number): this {
    if ('defaultTemperature' in this.config) {
      (this.config as any).defaultTemperature = temp;
    }
    return this;
  }

  public maxTokens(tokens: number): this {
    if ('defaultMaxTokens' in this.config) {
      (this.config as any).defaultMaxTokens = tokens;
    }
    return this;
  }

  public streaming(enabled: boolean): this {
    if ('streamingSupported' in this.config) {
      (this.config as any).streamingSupported = enabled;
    }
    return this;
  }

  public metrics(enabled: boolean): this {
    this.config.enableMetrics = enabled;
    return this;
  }

  public caching(enabled: boolean): this {
    this.config.enableCaching = enabled;
    return this;
  }

  public set<K extends keyof T>(key: K, value: T[K]): this {
    this.config[key] = value;
    return this;
  }

  public merge(overrides: Partial<T>): this {
    this.config = { ...this.config, ...overrides };
    return this;
  }

  public async build(validate = true): Promise<T> {
    if (validate) {
      const result = await this.validator.validateConfig(this.config);
      if (!result.valid) {
        throw new Error(`Configuration validation failed: ${result.errors.map(e => e.message).join(', ')}`);
      }
    }

    return this.config as T;
  }

  public buildUnsafe(): T {
    return this.config as T;
  }
}

// Global factory instance
export const globalConfigFactory = new ConfigFactory();

// Convenience functions
export const ConfigFactoryUtils = {
  // Quick factory methods
  openai: {
    llm: (apiKey: string, options?: Partial<OpenAIConfig>) => 
      globalConfigFactory.createOpenAILLMConfig({ apiKey, ...options }),
    
    embeddings: (apiKey: string, options?: Partial<OpenAIConfig>) => 
      globalConfigFactory.createOpenAIEmbeddingsConfig({ apiKey, ...options })
  },

  abacusai: {
    llm: (apiKey: string, options?: Partial<AbacusAIConfig>) => 
      globalConfigFactory.createAbacusAILLMConfig({ apiKey, ...options })
  },

  anthropic: {
    llm: (apiKey: string, options?: Partial<AnthropicConfig>) => 
      globalConfigFactory.createAnthropicLLMConfig({ apiKey, ...options })
  },

  voyageai: {
    embeddings: (apiKey: string, options?: Partial<VoyageAIConfig>) => 
      globalConfigFactory.createVoyageAIEmbeddingsConfig({ apiKey, ...options })
  },

  cohere: {
    llm: (apiKey: string, options?: Partial<CohereConfig>) => 
      globalConfigFactory.createCohereLLMConfig({ apiKey, ...options })
  },

  // Build from environment variables
  fromEnv: async (provider: AIProvider, serviceType: AIServiceType) => {
    return globalConfigFactory.createFromEnvironment(provider, serviceType);
  },

  // Create multi-provider setup
  multiProvider: (
    serviceType: AIServiceType,
    primary: AIProvider,
    fallbacks: AIProvider[] = []
  ) => {
    return globalConfigFactory.createMultiProviderConfig(serviceType, primary, fallbacks);
  }
};
