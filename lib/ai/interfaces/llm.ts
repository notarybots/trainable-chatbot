
/**
 * LLM (Large Language Model) Service Interface
 */

import { BaseAIService, RequestContext, StreamingOptions, AIStreamResponse, BatchOptions } from './base';
import { AIMessage, AIMetadata } from '../types/common';
import { AIResponse } from '../types/errors';
import { LLMConfig } from '../types/config';

// LLM Generation Request
export interface LLMGenerationRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  seed?: number;
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
  toolChoice?: 'none' | 'auto' | string;
  user?: string;
  context?: RequestContext;
  streaming?: boolean;
  streamingOptions?: StreamingOptions;
}

// LLM Generation Response
export interface LLMGenerationResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: AIMessage;
    finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
    logprobs?: any;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: AIMetadata;
  created: string;
}

// Streaming Chunk Interface
export interface LLMStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      toolCalls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  }>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Partial<AIMetadata>;
  created: string;
}

// Function Calling Interfaces
export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: FunctionCall;
}

// Completion Options for different use cases
export interface CompletionOptions {
  template?: string;
  variables?: Record<string, any>;
  extractJson?: boolean;
  validateResponse?: (response: string) => boolean;
  maxRetries?: number;
  fallbackModel?: string;
}

// Chat History Interface
export interface ChatHistory {
  messages: AIMessage[];
  totalTokens: number;
  maxTokens: number;
  compressionStrategy?: 'truncate' | 'summarize' | 'sliding_window';
}

// LLM Service Interface
export interface LLMService extends BaseAIService {
  serviceType: 'llm';
  
  // Configuration
  getConfig(): LLMConfig;
  updateConfig(config: Partial<LLMConfig>): Promise<void>;

  // Text Generation
  generate(request: LLMGenerationRequest): Promise<AIResponse<LLMGenerationResponse>>;
  
  // Streaming Generation
  generateStream(request: LLMGenerationRequest): Promise<AIStreamResponse<LLMStreamChunk>>;
  
  // Batch Generation
  generateBatch(
    requests: LLMGenerationRequest[], 
    options?: BatchOptions
  ): Promise<AIResponse<LLMGenerationResponse[]>>;

  // Convenience Methods
  chat(
    messages: AIMessage[],
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIResponse<LLMGenerationResponse>>;

  chatStream(
    messages: AIMessage[],
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIStreamResponse<LLMStreamChunk>>;

  complete(
    prompt: string,
    model?: string,
    options?: CompletionOptions
  ): Promise<AIResponse<string>>;

  // Function Calling
  callFunction(
    messages: AIMessage[],
    functions: FunctionDefinition[],
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIResponse<LLMGenerationResponse>>;

  // Template-based Generation
  generateFromTemplate(
    template: string,
    variables: Record<string, any>,
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIResponse<string>>;

  // History Management
  compressHistory(
    history: ChatHistory,
    targetTokens: number
  ): Promise<AIResponse<AIMessage[]>>;

  // Token Counting
  countTokens(text: string, model?: string): Promise<AIResponse<number>>;
  estimateCost(tokens: number, model?: string): Promise<AIResponse<number>>;

  // Model-specific methods
  isModelSupported(model: string): boolean;
  getModelCapabilities(model: string): Promise<AIResponse<any>>;
}

// Specialized LLM Interfaces for different use cases

// Code Generation LLM Interface
export interface CodeLLMService extends LLMService {
  generateCode(
    prompt: string,
    language?: string,
    options?: {
      includeComments?: boolean;
      includeTests?: boolean;
      style?: string;
    }
  ): Promise<AIResponse<{
    code: string;
    explanation?: string;
    tests?: string;
  }>>;

  reviewCode(
    code: string,
    language: string
  ): Promise<AIResponse<{
    suggestions: string[];
    issues: Array<{
      line: number;
      type: 'error' | 'warning' | 'suggestion';
      message: string;
    }>;
    score: number;
  }>>;

  explainCode(
    code: string,
    language: string
  ): Promise<AIResponse<string>>;
}

// Reasoning LLM Interface
export interface ReasoningLLMService extends LLMService {
  reason(
    problem: string,
    context?: string,
    options?: {
      stepByStep?: boolean;
      includeConfidence?: boolean;
      maxSteps?: number;
    }
  ): Promise<AIResponse<{
    answer: string;
    reasoning: string[];
    confidence?: number;
  }>>;

  analyze(
    content: string,
    analysisType: 'sentiment' | 'summary' | 'classification' | 'extraction',
    options?: Record<string, any>
  ): Promise<AIResponse<any>>;
}
