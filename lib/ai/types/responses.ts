
/**
 * Response Types for AI Services
 */

import { 
  AIMetadata, 
  TokenUsage, 
  CostInfo, 
  PerformanceMetrics,
  AIProvider,
  AIServiceType,
  MessageRole,
  StreamStatus
} from './common';
import { AIError } from './errors';

// Base Response Interface
export interface BaseAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  provider: AIProvider;
  metadata: AIMetadata;
}

// Text Generation Response
export interface TextGenerationResponse extends BaseAIResponse {
  choices: Array<{
    index: number;
    text: string;
    logprobs?: {
      tokens: string[];
      tokenLogprobs: number[];
      topLogprobs: Array<Record<string, number>>;
    };
    finishReason: 'stop' | 'length' | 'content_filter';
  }>;
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Chat Completion Response
export interface ChatCompletionResponse extends BaseAIResponse {
  choices: Array<{
    index: number;
    message: {
      role: MessageRole;
      content: string | null;
      toolCalls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
      functionCall?: {
        name: string;
        arguments: string;
      };
    };
    logprobs?: {
      content: Array<{
        token: string;
        logprob: number;
        bytes: number[];
        topLogprobs: Array<{
          token: string;
          logprob: number;
          bytes: number[];
        }>;
      }>;
    };
    finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  }>;
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
  systemFingerprint?: string;
}

// Streaming Response Chunks
export interface StreamChunk extends BaseAIResponse {
  choices: Array<{
    index: number;
    delta: {
      role?: MessageRole;
      content?: string;
      toolCalls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
      functionCall?: {
        name?: string;
        arguments?: string;
      };
    };
    logprobs?: any;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  }>;
  usage?: TokenUsage;
  systemFingerprint?: string;
}

// Embedding Response
export interface EmbeddingResponse extends BaseAIResponse {
  data: Array<{
    object: 'embedding';
    index: number;
    embedding: number[];
  }>;
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Vision Response
export interface VisionResponse extends BaseAIResponse {
  choices: Array<{
    index: number;
    message: {
      role: MessageRole;
      content: string;
    };
    finishReason: 'stop' | 'length' | 'content_filter';
  }>;
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Audio Transcription Response
export interface AudioTranscriptionResponse extends BaseAIResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avgLogprob: number;
    compressionRatio: number;
    noSpeechProb: number;
  }>;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  usage?: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Audio Generation Response
export interface AudioGenerationResponse extends BaseAIResponse {
  data: string; // base64 encoded audio
  format: string;
  duration?: number;
  usage?: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Moderation Response
export interface ModerationResponse extends BaseAIResponse {
  results: Array<{
    flagged: boolean;
    categories: {
      sexual: boolean;
      hate: boolean;
      harassment: boolean;
      'self-harm': boolean;
      'sexual/minors': boolean;
      'hate/threatening': boolean;
      'harassment/threatening': boolean;
      'self-harm/intent': boolean;
      'self-harm/instructions': boolean;
      violence: boolean;
      'violence/graphic': boolean;
    };
    categoryScores: {
      sexual: number;
      hate: number;
      harassment: number;
      'self-harm': number;
      'sexual/minors': number;
      'hate/threatening': number;
      'harassment/threatening': number;
      'self-harm/intent': number;
      'self-harm/instructions': number;
      violence: number;
      'violence/graphic': number;
    };
  }>;
}

// Fine-tuning Response
export interface FineTuningResponse extends BaseAIResponse {
  object: 'fine_tuning.job';
  fineTunedModel: string | null;
  organizationId: string;
  status: 'validating_files' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  hyperparameters: {
    batchSize: number;
    learningRateMultiplier: number;
    nEpochs: number;
  };
  trainingFile: string;
  validationFile: string | null;
  resultFiles: string[];
  trainedTokens: number | null;
  error?: {
    code: string;
    message: string;
    param: string | null;
  };
}

// Model Information Response
export interface ModelInfoResponse extends BaseAIResponse {
  ownedBy: string;
  permission: Array<{
    id: string;
    object: 'model_permission';
    created: number;
    allowCreateEngine: boolean;
    allowSampling: boolean;
    allowLogprobs: boolean;
    allowSearchIndices: boolean;
    allowView: boolean;
    allowFineTuning: boolean;
    organization: string;
    group: string | null;
    isBlocking: boolean;
  }>;
  capabilities: {
    completion?: boolean;
    chat?: boolean;
    embeddings?: boolean;
    vision?: boolean;
    audio?: boolean;
    functionCalling?: boolean;
    jsonMode?: boolean;
    streaming?: boolean;
  };
  contextLength?: number;
  maxOutputTokens?: number;
  trainingData?: string;
  deprecated?: boolean;
  description?: string;
}

// Batch Response
export interface BatchResponse extends BaseAIResponse {
  object: 'batch';
  endpoint: string;
  errors?: {
    object: 'list';
    data: Array<{
      code: string;
      message: string;
      param: string | null;
      line: number | null;
    }>;
  };
  inputFileId: string;
  completionWindow: string;
  status: 'validating' | 'failed' | 'in_progress' | 'finalizing' | 'completed' | 'expired' | 'cancelling' | 'cancelled';
  outputFileId: string | null;
  errorFileId: string | null;
  requestCounts: {
    total: number;
    completed: number;
    failed: number;
  };
}

// Semantic Search Response
export interface SemanticSearchResponse extends BaseAIResponse {
  results: Array<{
    document: {
      id: string;
      content: string;
      metadata?: Record<string, any>;
    };
    score: number;
    distance?: number;
    rank: number;
  }>;
  query: string;
  totalResults: number;
  searchTime: number;
  usage?: TokenUsage;
  cost?: CostInfo;
}

// RAG Response
export interface RAGResponse extends BaseAIResponse {
  answer: string;
  sources: Array<{
    id: string;
    content: string;
    relevanceScore: number;
    metadata?: Record<string, any>;
  }>;
  query: string;
  retrievalTime: number;
  generationTime: number;
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Classification Response
export interface ClassificationResponse extends BaseAIResponse {
  predictions: Array<{
    input: string;
    results: Array<{
      category: string;
      confidence: number;
      probability?: number;
    }>;
    multiLabel: boolean;
  }>;
  usage?: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Summarization Response
export interface SummarizationResponse extends BaseAIResponse {
  summary: string;
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
  keyPoints?: string[];
  extractedEntities?: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Translation Response
export interface TranslationResponse extends BaseAIResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  alternatives?: Array<{
    text: string;
    confidence: number;
  }>;
  detectedLanguage?: string;
  usage?: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Code Generation Response
export interface CodeGenerationResponse extends BaseAIResponse {
  code: string;
  language: string;
  explanation?: string;
  tests?: string;
  documentation?: string;
  dependencies?: string[];
  complexity?: {
    timeComplexity: string;
    spaceComplexity: string;
    maintainabilityScore: number;
  };
  usage: TokenUsage;
  cost?: CostInfo;
  performance?: PerformanceMetrics;
}

// Code Review Response
export interface CodeReviewResponse extends BaseAIResponse {
  overallScore: number;
  summary: string;
  issues: Array<{
    line: number;
    column?: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
    message: string;
    suggestion?: string;
    fixCode?: string;
  }>;
  strengths?: string[];
  recommendations?: string[];
  metrics?: {
    complexity: number;
    maintainability: number;
    security: number;
    performance: number;
  };
  usage: TokenUsage;
  cost?: CostInfo;
}

// Data Analysis Response
export interface DataAnalysisResponse extends BaseAIResponse {
  analysis: {
    summary: string;
    insights: string[];
    patterns: Array<{
      description: string;
      confidence: number;
      supporting_data: any;
    }>;
    anomalies?: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      affected_rows: number[];
    }>;
    recommendations: string[];
  };
  statistics?: Record<string, any>;
  visualizations?: Array<{
    type: 'bar' | 'line' | 'scatter' | 'histogram' | 'pie';
    title: string;
    data: any;
    description: string;
  }>;
  code?: string;
  usage?: TokenUsage;
  cost?: CostInfo;
}

// Creative Writing Response
export interface CreativeWritingResponse extends BaseAIResponse {
  content: string;
  genre?: string;
  tone?: string;
  wordCount: number;
  readabilityScore?: number;
  themes?: string[];
  characters?: Array<{
    name: string;
    role: string;
    description: string;
  }>;
  writingMetadata: {
    style: string;
    audience: string;
    mood: string;
  };
  usage: TokenUsage;
  cost?: CostInfo;
}

// Business Analysis Response
export interface BusinessAnalysisResponse extends BaseAIResponse {
  analysis: {
    type: string;
    summary: string;
    findings: Array<{
      category: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      confidence: number;
    }>;
    recommendations: Array<{
      priority: 'low' | 'medium' | 'high';
      description: string;
      implementation: string;
      expectedOutcome: string;
    }>;
    risks?: Array<{
      description: string;
      probability: number;
      impact: number;
      mitigation: string;
    }>;
    opportunities?: Array<{
      description: string;
      potential: number;
      timeframe: string;
      requirements: string[];
    }>;
  };
  charts?: Array<{
    type: string;
    title: string;
    data: any;
  }>;
  usage: TokenUsage;
  cost?: CostInfo;
}

// Streaming Response Interface
export interface StreamingResponse<T> {
  status: StreamStatus;
  chunk?: T;
  error?: AIError;
  complete: boolean;
  metadata?: Partial<AIMetadata>;
  cancel: () => Promise<void>;
}

// Response Union Types
export type LLMResponse = 
  | TextGenerationResponse 
  | ChatCompletionResponse 
  | VisionResponse 
  | CodeGenerationResponse 
  | CreativeWritingResponse;

export type EmbeddingsServiceResponse = 
  | EmbeddingResponse 
  | SemanticSearchResponse 
  | ClassificationResponse;

export type ChatServiceResponse = 
  | ChatCompletionResponse 
  | RAGResponse;

export type AIServiceResponse = 
  | LLMResponse 
  | EmbeddingsServiceResponse 
  | ChatServiceResponse
  | AudioTranscriptionResponse
  | AudioGenerationResponse
  | ModerationResponse
  | TranslationResponse
  | SummarizationResponse
  | DataAnalysisResponse
  | BusinessAnalysisResponse;

// Response Processor Interface
export interface ResponseProcessor {
  process<T extends BaseAIResponse>(response: T): Promise<T>;
  validate<T extends BaseAIResponse>(response: T): Promise<boolean>;
  transform<T extends BaseAIResponse, U>(response: T, transformer: (data: T) => U): Promise<U>;
  cache<T extends BaseAIResponse>(response: T, key?: string): Promise<void>;
  getCached<T extends BaseAIResponse>(key: string): Promise<T | null>;
}

// Response Interceptor Interface
export interface ResponseInterceptor {
  beforeProcess<T extends BaseAIResponse>(response: T): Promise<T>;
  afterProcess<T extends BaseAIResponse>(response: T): Promise<T>;
  onError(error: AIError): Promise<AIError>;
}

// Response Builder Interface
export interface ResponseBuilder<T extends BaseAIResponse> {
  setId(id: string): ResponseBuilder<T>;
  setModel(model: string): ResponseBuilder<T>;
  setMetadata(metadata: AIMetadata): ResponseBuilder<T>;
  setUsage(usage: TokenUsage): ResponseBuilder<T>;
  setCost(cost: CostInfo): ResponseBuilder<T>;
  setPerformance(performance: PerformanceMetrics): ResponseBuilder<T>;
  build(): T;
}
