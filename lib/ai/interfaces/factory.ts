
/**
 * Factory Interfaces for AI Service Creation and Management
 */

import { BaseAIService } from './base';
import { LLMService } from './llm';
import { EmbeddingsService } from './embeddings';
import { ChatService } from './chat';
import { 
  AIProvider, 
  AIServiceType 
} from '../types/common';
import { 
  BaseAIConfig, 
  LLMConfig, 
  EmbeddingsConfig, 
  ChatConfig,
  MultiProviderConfig,
  ServiceRegistryConfig,
  ConfigValidationResult
} from '../types/config';
import { AIResponse, AIError } from '../types/errors';

// Service Factory Interface
export interface AIServiceFactory {
  // Service Creation
  createLLMService(config: LLMConfig): Promise<LLMService>;
  createEmbeddingsService(config: EmbeddingsConfig): Promise<EmbeddingsService>;
  createChatService(config: ChatConfig): Promise<ChatService>;

  // Generic Service Creation
  createService<T extends BaseAIService>(
    type: AIServiceType,
    config: BaseAIConfig
  ): Promise<T>;

  // Service Discovery
  getSupportedProviders(serviceType: AIServiceType): AIProvider[];
  getProviderCapabilities(provider: AIProvider, serviceType: AIServiceType): Promise<ProviderCapabilities>;
  
  // Service Validation
  validateConfig(config: BaseAIConfig): Promise<ConfigValidationResult>;
  testConnection(config: BaseAIConfig): Promise<ConnectionTestResult>;
}

// Provider Capabilities
export interface ProviderCapabilities {
  provider: AIProvider;
  serviceType: AIServiceType;
  supportedModels: string[];
  features: {
    streaming?: boolean;
    batching?: boolean;
    functionCalling?: boolean;
    vision?: boolean;
    audio?: boolean;
    multimodal?: boolean;
    customModels?: boolean;
    fineTuning?: boolean;
  };
  limits: {
    maxTokensPerRequest?: number;
    maxRequestsPerMinute?: number;
    maxConcurrentRequests?: number;
    maxBatchSize?: number;
  };
  pricing?: {
    inputTokenCost: number;
    outputTokenCost: number;
    currency: string;
    billingUnit: string;
  };
  regions?: string[];
  compliance?: string[];
}

// ConfigValidationResult is imported from types/config

// Connection Test Result
export interface ConnectionTestResult {
  success: boolean;
  provider: AIProvider;
  serviceType: AIServiceType;
  latency: number;
  error?: AIError;
  metadata?: {
    version?: string;
    availableModels?: string[];
    rateLimits?: any;
  };
}

// Multi-Provider Factory Interface
export interface MultiProviderFactory extends AIServiceFactory {
  // Multi-Provider Service Creation
  createMultiProviderService(config: MultiProviderConfig): Promise<BaseAIService>;
  
  // Load Balancing
  createLoadBalancedService<T extends BaseAIService>(
    configs: BaseAIConfig[],
    strategy: 'round_robin' | 'weighted' | 'failover' | 'cost_optimized'
  ): Promise<T>;

  // Health Monitoring
  monitorProviderHealth(provider: AIProvider, serviceType: AIServiceType): Promise<ProviderHealthStatus>;
  getAllProviderHealth(): Promise<Record<string, ProviderHealthStatus>>;
}

// Provider Health Status
export interface ProviderHealthStatus {
  provider: AIProvider;
  serviceType: AIServiceType;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency: number;
  uptime: number;
  errorRate: number;
  lastCheck: string;
  issues?: string[];
}

// Service Registry Interface
export interface AIServiceRegistry {
  // Service Registration
  register<T extends BaseAIService>(service: T, name?: string): Promise<string>;
  unregister(serviceId: string): Promise<boolean>;
  
  // Service Discovery
  discover(type: AIServiceType): Promise<Array<{
    id: string;
    service: BaseAIService;
    metadata: Record<string, any>;
  }>>;
  
  get<T extends BaseAIService>(serviceId: string): Promise<T | null>;
  getByType<T extends BaseAIService>(type: AIServiceType): Promise<T[]>;
  getByProvider<T extends BaseAIService>(provider: AIProvider): Promise<T[]>;
  
  // Service Management
  list(): Promise<Array<{
    id: string;
    type: AIServiceType;
    provider: AIProvider;
    status: 'active' | 'inactive' | 'error';
    metadata: Record<string, any>;
  }>>;
  
  // Health Monitoring
  checkHealth(): Promise<Record<string, boolean>>;
  getMetrics(serviceId: string): Promise<ServiceMetrics>;
  
  // Configuration Management
  updateConfig(serviceId: string, config: Partial<BaseAIConfig>): Promise<boolean>;
  getConfig(serviceId: string): Promise<BaseAIConfig | null>;
  
  // Lifecycle Management
  start(serviceId: string): Promise<boolean>;
  stop(serviceId: string): Promise<boolean>;
  restart(serviceId: string): Promise<boolean>;
}

// Service Metrics Interface
export interface ServiceMetrics {
  serviceId: string;
  provider: AIProvider;
  type: AIServiceType;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    totalTokensProcessed: number;
    totalCost: number;
    uptime: number;
  };
  timeRange: {
    start: string;
    end: string;
  };
  breakdown: {
    byModel?: Record<string, number>;
    byStatus?: Record<string, number>;
    byHour?: Array<{
      hour: string;
      requests: number;
      tokens: number;
      cost: number;
    }>;
  };
}

// Provider Factory Interface
export interface ProviderFactory {
  // Provider-specific factories
  createOpenAIService(config: any): Promise<BaseAIService>;
  createAbacusAIService(config: any): Promise<BaseAIService>;
  createAnthropicService(config: any): Promise<BaseAIService>;
  createVoyageAIService(config: any): Promise<BaseAIService>;
  createCohereService(config: any): Promise<BaseAIService>;
  createCustomService(config: any): Promise<BaseAIService>;
  
  // Generic provider creation
  createProviderService(
    provider: AIProvider,
    serviceType: AIServiceType,
    config: BaseAIConfig
  ): Promise<BaseAIService>;
  
  // Provider information
  getProviderInfo(provider: AIProvider): ProviderInfo;
  listProviders(): ProviderInfo[];
}

// Provider Information
export interface ProviderInfo {
  name: AIProvider;
  displayName: string;
  description: string;
  website: string;
  documentation: string;
  supportedServices: AIServiceType[];
  authentication: {
    type: 'api_key' | 'oauth' | 'bearer_token' | 'custom';
    fields: Array<{
      name: string;
      label: string;
      type: 'text' | 'password' | 'url';
      required: boolean;
      description?: string;
    }>;
  };
  features: string[];
  pricing: {
    model: 'pay_per_use' | 'subscription' | 'freemium' | 'enterprise';
    details: string;
  };
  status: 'active' | 'beta' | 'deprecated';
  tags: string[];
}

// Main Factory Interface - Entry Point
export interface AIFactory {
  // Core Factories
  readonly serviceFactory: AIServiceFactory;
  readonly multiProviderFactory: MultiProviderFactory;
  readonly providerFactory: ProviderFactory;
  
  // Registry
  readonly registry: AIServiceRegistry;
  
  // Quick Creation Methods
  createService<T extends BaseAIService>(
    type: AIServiceType,
    provider: AIProvider,
    config: any
  ): Promise<T>;
  
  // Configuration Management
  loadConfiguration(config: ServiceRegistryConfig): Promise<void>;
  getConfiguration(): ServiceRegistryConfig;
  
  // Global Operations
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  
  // Health and Monitoring
  getGlobalHealth(): Promise<Record<string, any>>;
  getGlobalMetrics(): Promise<Record<string, ServiceMetrics>>;
}

// Factory Builder Interface
export interface AIFactoryBuilder {
  // Configuration
  withRegistry(registry: AIServiceRegistry): AIFactoryBuilder;
  withProviders(providers: ProviderFactory[]): AIFactoryBuilder;
  withConfig(config: ServiceRegistryConfig): AIFactoryBuilder;
  
  // Features
  withHealthMonitoring(enabled: boolean, interval?: number): AIFactoryBuilder;
  withMetrics(enabled: boolean): AIFactoryBuilder;
  withCaching(enabled: boolean, options?: any): AIFactoryBuilder;
  withLogging(level: string): AIFactoryBuilder;
  
  // Environment
  forEnvironment(env: 'development' | 'staging' | 'production'): AIFactoryBuilder;
  
  // Build
  build(): Promise<AIFactory>;
}
