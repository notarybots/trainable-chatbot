
/**
 * Base interfaces for AI services
 */

import { 
  AIProvider, 
  AIServiceType, 
  StreamStatus, 
  AIMetadata, 
  RateLimitInfo 
} from '../types/common';
import { AIResponse, AIError } from '../types/errors';
import { BaseAIConfig } from '../types/config';

// Base AI Service Interface
export interface BaseAIService {
  // Service identification
  readonly provider: AIProvider;
  readonly serviceType: AIServiceType;
  readonly version: string;

  // Configuration
  getConfig(): BaseAIConfig;
  updateConfig(config: Partial<BaseAIConfig>): Promise<void>;

  // Health and Status
  healthCheck(): Promise<boolean>;
  getStatus(): Promise<{
    healthy: boolean;
    latency: number;
    rateLimits?: RateLimitInfo;
    metadata?: Record<string, any>;
  }>;

  // Model Information
  listModels(): Promise<AIResponse<string[]>>;
  getModelInfo(model: string): Promise<AIResponse<ModelInfo>>;

  // Service lifecycle
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}

// Model Information Interface
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  provider: AIProvider;
  category: string;
  capabilities: ModelCapabilities;
  contextWindow?: number;
  maxTokens?: number;
  costPerToken?: {
    input: number;
    output: number;
  };
  deprecated?: boolean;
  created?: string;
  updated?: string;
}

// Model Capabilities
export interface ModelCapabilities {
  streaming?: boolean;
  functionCalling?: boolean;
  vision?: boolean;
  audio?: boolean;
  multimodal?: boolean;
  jsonMode?: boolean;
  codeExecution?: boolean;
  webSearch?: boolean;
  reasoning?: boolean;
  supportedLanguages?: string[];
  maxInputSize?: number;
  outputFormats?: string[];
}

// Request Context Interface
export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
}

// Streaming Base Interface
export interface StreamingOptions {
  onStart?: (context: RequestContext) => void;
  onProgress?: (status: StreamStatus, data?: any) => void;
  onComplete?: (result: any, metadata: AIMetadata) => void;
  onError?: (error: AIError) => void;
  onCancel?: () => void;
  bufferSize?: number;
  timeout?: number;
  enableCompression?: boolean;
}

// Async Iterator for Streaming
export interface AIStreamResponse<T> extends AsyncIterable<T> {
  cancel(): Promise<void>;
  getStatus(): StreamStatus;
  getMetadata(): AIMetadata | null;
}

// Batch Processing Interface
export interface BatchOptions {
  batchSize?: number;
  maxConcurrency?: number;
  delayBetweenBatches?: number;
  onBatchComplete?: (batchIndex: number, results: any[]) => void;
  onProgress?: (completed: number, total: number) => void;
  stopOnError?: boolean;
}

// Caching Interface
export interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
  key?: string;
  tags?: string[];
  strategy?: 'memory' | 'redis' | 'file';
}

// Monitoring and Analytics Interface
export interface AnalyticsEvent {
  type: 'request' | 'response' | 'error' | 'stream_start' | 'stream_end';
  service: AIServiceType;
  provider: AIProvider;
  model?: string;
  timestamp: string;
  duration?: number;
  success?: boolean;
  error?: AIError;
  metadata?: Record<string, any>;
}

// Service Discovery Interface
export interface ServiceDiscovery {
  registerService(service: BaseAIService): Promise<void>;
  unregisterService(serviceId: string): Promise<void>;
  discoverServices(type: AIServiceType): Promise<BaseAIService[]>;
  getService(provider: AIProvider, type: AIServiceType): Promise<BaseAIService | null>;
}
