
/**
 * Common types and enums used across the AI abstraction layer
 */

// Core AI Service Types
export type AIServiceType = 'llm' | 'embeddings' | 'chat' | 'vision' | 'audio';

// Provider Types
export type AIProvider = 
  | 'openai' 
  | 'abacusai' 
  | 'anthropic' 
  | 'voyageai' 
  | 'cohere' 
  | 'huggingface'
  | 'custom';

// Message Roles
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

// Stream Status Types
export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'processing' | 'completed' | 'error' | 'cancelled';

// Model Categories
export type ModelCategory = 'chat' | 'completion' | 'embedding' | 'vision' | 'audio' | 'multimodal';

// Content Types for multimodal support
export type ContentType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'function_call';

// Usage Tracking
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Cost Tracking
export interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

// Performance Metrics
export interface PerformanceMetrics {
  requestDuration: number;
  timeToFirstToken?: number;
  tokensPerSecond?: number;
  latency: number;
  timestamp: string;
}

// Base metadata interface
export interface AIMetadata {
  requestId: string;
  timestamp: string;
  provider: AIProvider;
  model: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  usage?: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
  [key: string]: any;
}

// Content interface for multimodal messages
export interface MessageContent {
  type: ContentType;
  text?: string;
  imageUrl?: string;
  audioData?: string;
  fileData?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}

// Enhanced message interface
export interface AIMessage {
  id?: string;
  role: MessageRole;
  content: string | MessageContent[];
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  metadata?: Record<string, any>;
}

// Rate limiting info
export interface RateLimitInfo {
  requestsRemaining: number;
  tokensRemaining: number;
  resetTime: string;
  retryAfter?: number;
}
