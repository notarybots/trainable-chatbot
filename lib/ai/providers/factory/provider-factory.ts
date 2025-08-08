
/**
 * AI Provider Factory
 * Creates and manages AI service providers
 */

import { LLMService } from '../../interfaces/llm';
import { EmbeddingsService } from '../../interfaces/embeddings';
import { ChatService } from '../../interfaces/chat';
import { BaseAIService } from '../../interfaces/base';
import { 
  BaseAIConfig, 
  LLMConfig, 
  EmbeddingsConfig, 
  ChatConfig, 
  OpenAIConfig, 
  OpenAIEmbeddingsConfig,
  AbacusAIConfig,
  ServiceRegistryConfig 
} from '../../types/config';
import { AIProvider, AIServiceType } from '../../types/common';
import { AIResponse, createAIError } from '../../types/errors';
import { OpenAILLMProvider } from '../openai/openai-llm-provider';
import { OpenAIEmbeddingsProvider } from '../openai/openai-embeddings-provider';
import { OpenAIChatProvider } from '../openai/openai-chat-provider';

export class ProviderFactory {
  private static instance: ProviderFactory;
  private serviceRegistry: Map<string, BaseAIService> = new Map();
  private config: ServiceRegistryConfig | null = null;

  private constructor() {}

  public static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  public configure(config: ServiceRegistryConfig): void {
    this.config = config;
  }

  // Create LLM Service
  public async createLLMService(config: LLMConfig): Promise<LLMService> {
    this.validateConfig(config);

    switch (config.provider) {
      case 'openai':
        return new OpenAILLMProvider(config as OpenAIConfig);
      
      case 'abacusai':
        // For now, use OpenAI provider with AbacusAI endpoint
        const abacusConfig = config as AbacusAIConfig;
        const openaiCompatibleConfig: OpenAIConfig = {
          ...abacusConfig,
          provider: 'openai',
          apiEndpoint: 'https://apps.abacus.ai/v1',
        };
        return new OpenAILLMProvider(openaiCompatibleConfig);
      
      default:
        throw createAIError(
          'validation', 
          `Unsupported LLM provider: ${config.provider}`, 
          config.provider, 
          'llm'
        );
    }
  }

  // Create Embeddings Service
  public async createEmbeddingsService(config: EmbeddingsConfig): Promise<EmbeddingsService> {
    this.validateConfig(config);

    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingsProvider(config as OpenAIEmbeddingsConfig);
      
      default:
        throw createAIError(
          'validation', 
          `Unsupported embeddings provider: ${config.provider}`, 
          config.provider, 
          'embeddings'
        );
    }
  }

  // Create Chat Service
  public async createChatService(config: ChatConfig): Promise<ChatService> {
    this.validateConfig(config);

    // Create dependent services
    const llmService = await this.createLLMService(config.llmConfig);
    
    let embeddingsService: EmbeddingsService | undefined;
    if (config.embeddingsConfig) {
      embeddingsService = await this.createEmbeddingsService(config.embeddingsConfig);
    }

    switch (config.provider) {
      case 'openai':
        return new OpenAIChatProvider(config, llmService, embeddingsService);
      
      case 'abacusai':
        // Use OpenAI chat provider with AbacusAI LLM
        return new OpenAIChatProvider(config, llmService, embeddingsService);
      
      default:
        throw createAIError(
          'validation', 
          `Unsupported chat provider: ${config.provider}`, 
          config.provider, 
          'chat'
        );
    }
  }

  // Create service by type and provider
  public async createService(
    provider: AIProvider, 
    serviceType: AIServiceType, 
    config: BaseAIConfig
  ): Promise<BaseAIService> {
    switch (serviceType) {
      case 'llm':
        return this.createLLMService(config as LLMConfig);
      
      case 'embeddings':
        return this.createEmbeddingsService(config as EmbeddingsConfig);
      
      case 'chat':
        return this.createChatService(config as ChatConfig);
      
      default:
        throw createAIError(
          'validation', 
          `Unsupported service type: ${serviceType}`, 
          provider, 
          serviceType
        );
    }
  }

  // Get or create service from registry
  public async getService(
    provider: AIProvider, 
    serviceType: AIServiceType, 
    config?: BaseAIConfig
  ): Promise<BaseAIService> {
    const serviceKey = `${provider}-${serviceType}`;
    
    // Check if service exists in registry
    const existingService = this.serviceRegistry.get(serviceKey);
    if (existingService) {
      return existingService;
    }

    // Create new service
    if (!config) {
      if (!this.config) {
        throw createAIError(
          'validation', 
          'No configuration provided for service creation', 
          provider, 
          serviceType
        );
      }

      // Get config from registry config
      config = this.getConfigFromRegistry(provider, serviceType);
    }

    const service = await this.createService(provider, serviceType, config);
    await service.initialize();
    
    // Register service
    this.serviceRegistry.set(serviceKey, service);
    
    return service;
  }

  // Register existing service
  public async registerService(service: BaseAIService): Promise<void> {
    const serviceKey = `${service.provider}-${service.serviceType}`;
    this.serviceRegistry.set(serviceKey, service);
  }

  // Unregister service
  public async unregisterService(provider: AIProvider, serviceType: AIServiceType): Promise<void> {
    const serviceKey = `${provider}-${serviceType}`;
    const service = this.serviceRegistry.get(serviceKey);
    
    if (service) {
      await service.destroy();
      this.serviceRegistry.delete(serviceKey);
    }
  }

  // List registered services
  public listServices(): Array<{ provider: AIProvider; serviceType: AIServiceType }> {
    return Array.from(this.serviceRegistry.keys()).map(key => {
      const [provider, serviceType] = key.split('-');
      return { 
        provider: provider as AIProvider, 
        serviceType: serviceType as AIServiceType 
      };
    });
  }

  // Create service from environment variables
  public async createFromEnvironment(serviceType: AIServiceType): Promise<BaseAIService> {
    const config = this.createConfigFromEnvironment(serviceType);
    return this.createService(config.provider, serviceType, config);
  }

  // Convenience methods for common configurations
  public async createDefaultLLMService(): Promise<LLMService> {
    // Try AbacusAI first (as used in existing app), fallback to OpenAI
    if (process.env.ABACUSAI_API_KEY) {
      const config: LLMConfig = {
        provider: 'abacusai',
        service: 'llm',
        apiKey: process.env.ABACUSAI_API_KEY,
        apiEndpoint: 'https://apps.abacus.ai/v1',
        defaultModel: 'gpt-4.1-mini',
        defaultTemperature: 0.7,
        defaultMaxTokens: 3000,
        streamingSupported: true,
      };
      return this.createLLMService(config);
    }
    
    if (process.env.OPENAI_API_KEY) {
      const config: OpenAIConfig = {
        provider: 'openai',
        service: 'llm',
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'gpt-3.5-turbo',
        defaultTemperature: 0.7,
        defaultMaxTokens: 3000,
        streamingSupported: true,
      };
      return this.createLLMService(config);
    }

    throw createAIError(
      'authentication',
      'No API key found in environment variables',
      'openai',
      'llm'
    );
  }

  public async createDefaultEmbeddingsService(): Promise<EmbeddingsService> {
    if (process.env.OPENAI_API_KEY) {
      const config: OpenAIEmbeddingsConfig = {
        provider: 'openai',
        service: 'embeddings',
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: 'text-embedding-ada-002',
      };
      return this.createEmbeddingsService(config);
    }

    throw createAIError(
      'authentication',
      'No OpenAI API key found for embeddings service',
      'openai',
      'embeddings'
    );
  }

  public async createDefaultChatService(): Promise<ChatService> {
    const llmService = await this.createDefaultLLMService();
    let embeddingsService: EmbeddingsService | undefined;
    
    try {
      embeddingsService = await this.createDefaultEmbeddingsService();
    } catch (error) {
      // Embeddings service is optional for chat
      console.warn('Embeddings service not available:', error);
    }

    const llmConfig = llmService.getConfig();
    const config: ChatConfig = {
      provider: llmService.provider as any,
      service: 'chat',
      apiKey: llmConfig?.apiKey || '',
      llmConfig: llmConfig as LLMConfig,
      embeddingsConfig: embeddingsService?.getConfig(),
      memoryStrategy: 'sliding_window',
      memorySize: 20,
      enableRAG: !!embeddingsService,
      streamingEnabled: true,
    };

    return this.createChatService(config);
  }

  // Health check all registered services
  public async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [serviceKey, service] of this.serviceRegistry.entries()) {
      try {
        results[serviceKey] = await service.healthCheck();
      } catch (error) {
        results[serviceKey] = false;
      }
    }
    
    return results;
  }

  // Cleanup all services
  public async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.serviceRegistry.values()).map(service => 
      service.destroy().catch(error => console.error('Error destroying service:', error))
    );
    
    await Promise.all(destroyPromises);
    this.serviceRegistry.clear();
  }

  // Private helper methods
  private validateConfig(config: BaseAIConfig): void {
    if (!config.apiKey) {
      throw createAIError(
        'validation',
        'API key is required in configuration',
        config.provider,
        'llm'
      );
    }

    if (!config.provider) {
      throw createAIError(
        'validation',
        'Provider is required in configuration',
        config.provider,
        'llm'
      );
    }
  }

  private getConfigFromRegistry(provider: AIProvider, serviceType: AIServiceType): BaseAIConfig {
    if (!this.config?.services) {
      throw createAIError(
        'validation',
        'Service registry not configured',
        provider,
        serviceType
      );
    }

    // Only supported service types in registry
    const supportedServices = ['llm', 'embeddings', 'chat'] as const;
    type SupportedServiceType = typeof supportedServices[number];
    
    if (!supportedServices.includes(serviceType as SupportedServiceType)) {
      throw createAIError(
        'validation',
        `Service type '${serviceType}' not supported in registry`,
        provider,
        serviceType
      );
    }

    const serviceConfig = this.config.services[serviceType as SupportedServiceType];
    if (!serviceConfig || !serviceConfig.primary) {
      throw createAIError(
        'validation',
        `No configuration found for service type: ${serviceType}`,
        provider,
        serviceType
      );
    }

    // Return primary configuration - in a real implementation,
    // this would handle fallbacks and multi-provider configs
    return serviceConfig.primary as BaseAIConfig;
  }

  private createConfigFromEnvironment(serviceType: AIServiceType): BaseAIConfig {
    switch (serviceType) {
      case 'llm':
        if (process.env.ABACUSAI_API_KEY) {
          return {
            provider: 'abacusai',
            service: 'llm',
            apiKey: process.env.ABACUSAI_API_KEY,
            apiEndpoint: 'https://apps.abacus.ai/v1',
            defaultModel: 'gpt-4.1-mini',
          } as LLMConfig;
        }
        
        if (process.env.OPENAI_API_KEY) {
          return {
            provider: 'openai',
            service: 'llm',
            apiKey: process.env.OPENAI_API_KEY,
            defaultModel: 'gpt-3.5-turbo',
          } as OpenAIConfig;
        }
        break;

      case 'embeddings':
        if (process.env.OPENAI_API_KEY) {
          return {
            provider: 'openai',
            service: 'embeddings',
            apiKey: process.env.OPENAI_API_KEY,
            defaultModel: 'text-embedding-ada-002',
          } as OpenAIEmbeddingsConfig;
        }
        break;
    }

    throw createAIError(
      'authentication',
      `No configuration available for ${serviceType} service`,
      'openai',
      serviceType
    );
  }
}

// Export singleton instance
export const providerFactory = ProviderFactory.getInstance();

// Convenience functions
export const createLLMService = (config: LLMConfig) => 
  providerFactory.createLLMService(config);

export const createEmbeddingsService = (config: EmbeddingsConfig) => 
  providerFactory.createEmbeddingsService(config);

export const createChatService = (config: ChatConfig) => 
  providerFactory.createChatService(config);

export const getDefaultLLMService = () => 
  providerFactory.createDefaultLLMService();

export const getDefaultEmbeddingsService = () => 
  providerFactory.createDefaultEmbeddingsService();

export const getDefaultChatService = () => 
  providerFactory.createDefaultChatService();
