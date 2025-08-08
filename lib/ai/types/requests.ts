
/**
 * Request and Response Types for AI Services
 */

import { 
  AIMessage, 
  AIProvider, 
  AIServiceType,
  MessageRole,
  ModelCategory 
} from './common';
import { RequestContext } from '../interfaces/base';

// Base Request Interface
export interface BaseAIRequest {
  requestId?: string;
  provider?: AIProvider;
  model?: string;
  context?: RequestContext;
  metadata?: Record<string, any>;
  timeout?: number;
  retryAttempts?: number;
}

// Text Generation Requests
export interface TextGenerationRequest extends BaseAIRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  seed?: number;
  streaming?: boolean;
  user?: string;
}

export interface ChatCompletionRequest extends BaseAIRequest {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  seed?: number;
  streaming?: boolean;
  user?: string;
  responseFormat?: {
    type: 'text' | 'json_object';
    schema?: any;
  };
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters: any;
    };
  }>;
  toolChoice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

// Embedding Requests
export interface EmbeddingRequest extends BaseAIRequest {
  input: string | string[];
  dimensions?: number;
  encodingFormat?: 'float' | 'base64';
  truncate?: 'start' | 'end';
  user?: string;
}

// Vision Requests
export interface VisionRequest extends BaseAIRequest {
  images: Array<{
    url?: string;
    base64?: string;
    mimeType?: string;
  }>;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  detail?: 'low' | 'high' | 'auto';
}

// Audio Requests
export interface AudioTranscriptionRequest extends BaseAIRequest {
  file: {
    data: string; // base64
    filename: string;
    mimeType: string;
  };
  language?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  timestampGranularities?: ('word' | 'segment')[];
}

export interface AudioGenerationRequest extends BaseAIRequest {
  input: string;
  voice?: string;
  responseFormat?: 'mp3' | 'opus' | 'aac' | 'flac';
  speed?: number;
}

// Moderation Requests
export interface ModerationRequest extends BaseAIRequest {
  input: string | string[];
}

// Fine-tuning Requests
export interface FineTuningRequest extends BaseAIRequest {
  trainingFile: string;
  validationFile?: string;
  baseModel: string;
  hyperparameters?: {
    batchSize?: number;
    learningRateMultiplier?: number;
    nEpochs?: number;
  };
  suffix?: string;
}

// Batch Processing Requests
export interface BatchRequest extends BaseAIRequest {
  inputFileId: string;
  endpoint: string;
  completionWindow: '24h';
  metadata?: Record<string, string>;
}

// Custom Model Requests
export interface CustomModelRequest extends BaseAIRequest {
  name: string;
  description?: string;
  baseModel?: string;
  configuration: Record<string, any>;
  files?: Array<{
    filename: string;
    content: string;
    type: 'training' | 'validation' | 'config';
  }>;
}

// Multi-modal Requests
export interface MultiModalRequest extends BaseAIRequest {
  messages: Array<{
    role: MessageRole;
    content: Array<{
      type: 'text' | 'image' | 'audio' | 'video';
      text?: string;
      image?: {
        url?: string;
        base64?: string;
        detail?: 'low' | 'high' | 'auto';
      };
      audio?: {
        data: string;
        format: string;
      };
      video?: {
        url?: string;
        base64?: string;
        format?: string;
      };
    }>;
  }>;
  maxTokens?: number;
  temperature?: number;
}

// Search and RAG Requests
export interface SemanticSearchRequest extends BaseAIRequest {
  query: string;
  documents?: Array<{
    id: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  index?: string;
  k?: number;
  threshold?: number;
  filter?: Record<string, any>;
  rerank?: boolean;
  rerankModel?: string;
}

export interface RAGRequest extends BaseAIRequest {
  query: string;
  knowledgeBase: string | string[];
  retrievalOptions?: {
    maxResults?: number;
    threshold?: number;
    rerank?: boolean;
    expandQuery?: boolean;
  };
  generationOptions?: Partial<ChatCompletionRequest>;
}

// Classification Requests
export interface ClassificationRequest extends BaseAIRequest {
  input: string | string[];
  categories: string[] | Array<{
    name: string;
    description?: string;
    examples?: string[];
  }>;
  multiLabel?: boolean;
  threshold?: number;
}

// Summarization Requests
export interface SummarizationRequest extends BaseAIRequest {
  content: string;
  type?: 'extractive' | 'abstractive';
  length?: 'short' | 'medium' | 'long' | number;
  format?: 'paragraph' | 'bullets' | 'key_points';
  focus?: string[];
}

// Translation Requests
export interface TranslationRequest extends BaseAIRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  formality?: 'formal' | 'informal' | 'auto';
  glossary?: Record<string, string>;
}

// Code Requests
export interface CodeGenerationRequest extends BaseAIRequest {
  prompt: string;
  language?: string;
  framework?: string;
  style?: 'clean' | 'commented' | 'enterprise';
  includeTests?: boolean;
  includeDocumentation?: boolean;
  maxLines?: number;
}

export interface CodeReviewRequest extends BaseAIRequest {
  code: string;
  language: string;
  reviewType?: 'security' | 'performance' | 'style' | 'bugs' | 'comprehensive';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  includeFixSuggestions?: boolean;
}

// Data Analysis Requests
export interface DataAnalysisRequest extends BaseAIRequest {
  data: any[] | string; // Array of objects or CSV string
  analysisType: 'summary' | 'insights' | 'patterns' | 'anomalies' | 'predictions';
  columns?: string[];
  visualizations?: boolean;
  includeCode?: boolean;
}

// Creative Requests
export interface CreativeWritingRequest extends BaseAIRequest {
  prompt: string;
  genre?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long' | number;
  style?: string;
  audience?: string;
  format?: 'story' | 'poem' | 'script' | 'article' | 'essay';
}

// Business Requests
export interface BusinessAnalysisRequest extends BaseAIRequest {
  content: string;
  analysisType: 'swot' | 'market' | 'competitor' | 'financial' | 'risk' | 'opportunity';
  industry?: string;
  region?: string;
  timeframe?: string;
  includeRecommendations?: boolean;
}

// Request Union Types
export type LLMRequest = 
  | TextGenerationRequest 
  | ChatCompletionRequest 
  | VisionRequest 
  | MultiModalRequest
  | CodeGenerationRequest
  | CreativeWritingRequest;

export type EmbeddingsServiceRequest = 
  | EmbeddingRequest 
  | SemanticSearchRequest 
  | ClassificationRequest;

export type ChatServiceRequest = 
  | ChatCompletionRequest 
  | RAGRequest 
  | MultiModalRequest;

export type AIServiceRequest = 
  | LLMRequest 
  | EmbeddingsServiceRequest 
  | ChatServiceRequest
  | AudioTranscriptionRequest
  | AudioGenerationRequest
  | ModerationRequest
  | TranslationRequest
  | SummarizationRequest
  | DataAnalysisRequest
  | BusinessAnalysisRequest;

// Request Validation Interface
export interface RequestValidator {
  validate<T extends BaseAIRequest>(request: T): Promise<{
    valid: boolean;
    errors: Array<{
      field: string;
      message: string;
      code: string;
    }>;
    warnings?: string[];
  }>;
  
  sanitize<T extends BaseAIRequest>(request: T): T;
  
  getSchema(requestType: string): any;
}

// Request Interceptor Interface
export interface RequestInterceptor {
  beforeRequest<T extends BaseAIRequest>(request: T): Promise<T>;
  afterRequest<T extends BaseAIRequest>(request: T, response: any): Promise<any>;
  onError<T extends BaseAIRequest>(request: T, error: any): Promise<any>;
}

// Request Builder Interface
export interface RequestBuilder<T extends BaseAIRequest> {
  setModel(model: string): RequestBuilder<T>;
  setProvider(provider: AIProvider): RequestBuilder<T>;
  setTimeout(timeout: number): RequestBuilder<T>;
  setMetadata(metadata: Record<string, any>): RequestBuilder<T>;
  setContext(context: RequestContext): RequestBuilder<T>;
  build(): T;
}
