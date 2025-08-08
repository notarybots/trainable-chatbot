
/**
 * OpenAI LLM Provider Implementation
 * Provides chat completion and streaming functionality
 */

import { LLMService, LLMGenerationRequest, LLMGenerationResponse, LLMStreamChunk, CompletionOptions, ChatHistory, FunctionDefinition } from '../../interfaces/llm';
import { AIStreamResponse, RequestContext, BatchOptions } from '../../interfaces/base';
import { OpenAIConfig, LLMConfig } from '../../types/config';
import { AIResponse, AIError, createAIError } from '../../types/errors';
import { AIMessage, AIMetadata, TokenUsage } from '../../types/common';
import { BaseProvider } from '../base/base-provider';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}

class OpenAIStreamResponse implements AIStreamResponse<LLMStreamChunk> {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder = new TextDecoder();
  private cancelled = false;
  private status: 'idle' | 'streaming' | 'completed' | 'error' | 'cancelled' = 'idle';
  private metadata: AIMetadata | null = null;
  private buffer = '';
  private partialRead = '';

  constructor(
    response: Response,
    private context: RequestContext,
    private provider: OpenAILLMProvider
  ) {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }
    this.reader = response.body.getReader();
    this.status = 'streaming';
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    this.status = 'cancelled';
    await this.reader.cancel();
  }

  getStatus() {
    return this.status;
  }

  getMetadata(): AIMetadata | null {
    return this.metadata;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<LLMStreamChunk> {
    try {
      while (true) {
        if (this.cancelled) {
          this.status = 'cancelled';
          break;
        }

        const { done, value } = await this.reader.read();
        if (done) {
          this.status = 'completed';
          break;
        }

        this.partialRead += this.decoder.decode(value, { stream: true });
        const lines = this.partialRead.split('\n');
        this.partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              this.status = 'completed';
              return;
            }

            try {
              const parsed: OpenAIStreamChunk = JSON.parse(data);
              const chunk = this.convertStreamChunk(parsed);
              yield chunk;
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  private convertStreamChunk(openaiChunk: OpenAIStreamChunk): LLMStreamChunk {
    return {
      id: openaiChunk.id,
      model: openaiChunk.model,
      choices: openaiChunk.choices.map(choice => ({
        index: choice.index,
        delta: {
          role: choice.delta.role,
          content: choice.delta.content,
          toolCalls: choice.delta.tool_calls?.map(tc => ({
            index: tc.index,
            id: tc.id,
            type: tc.type,
            function: tc.function ? {
              name: tc.function.name,
              arguments: tc.function.arguments,
            } : undefined,
          })),
        },
        finishReason: choice.finish_reason as any,
      })),
      created: new Date(openaiChunk.created * 1000).toISOString(),
    };
  }
}

export class OpenAILLMProvider extends BaseProvider implements LLMService {
  public readonly provider = 'openai' as const;
  public readonly serviceType = 'llm' as const;

  private baseURL: string;
  private openaiConfig: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super(config);
    this.openaiConfig = config;
    this.baseURL = config.apiEndpoint || 'https://api.openai.com/v1';
  }

  public getConfig(): LLMConfig {
    return { ...this.openaiConfig };
  }

  public async listModels(): Promise<AIResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.data
        ?.filter((model: any) => model.id?.includes('gpt'))
        ?.map((model: any) => model.id) || [];

      return this.createSuccessResponse(models);
    } catch (error) {
      const aiError = this.handleError(error, 'listModels');
      return this.createErrorResponse(aiError);
    }
  }

  public async getModelInfo(model: string): Promise<AIResponse<any>> {
    // For OpenAI, we can return basic model info
    const modelInfo = {
      id: model,
      name: model,
      provider: this.provider,
      category: 'chat' as const,
      capabilities: {
        streaming: true,
        functionCalling: model.includes('gpt-4') || model.includes('gpt-3.5'),
        jsonMode: true,
        multimodal: model.includes('gpt-4') && (model.includes('vision') || model.includes('turbo')),
      },
      contextWindow: this.getContextWindow(model),
    };

    return this.createSuccessResponse(modelInfo);
  }

  public async generate(request: LLMGenerationRequest): Promise<AIResponse<LLMGenerationResponse>> {
    try {
      const openaiRequest = this.convertRequest(request);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.openaiConfig.organization && { 'OpenAI-Organization': this.openaiConfig.organization }),
          ...(this.openaiConfig.project && { 'OpenAI-Project': this.openaiConfig.project }),
        },
        body: JSON.stringify(openaiRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OpenAIResponse = await response.json();
      const convertedResponse = this.convertResponse(data, request.context);

      return this.createSuccessResponse(convertedResponse);
    } catch (error) {
      const aiError = this.handleError(error, 'generate');
      return this.createErrorResponse(aiError);
    }
  }

  public async generateStream(request: LLMGenerationRequest): Promise<AIStreamResponse<LLMStreamChunk>> {
    try {
      const openaiRequest = {
        ...this.convertRequest(request),
        stream: true,
      };

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.openaiConfig.organization && { 'OpenAI-Organization': this.openaiConfig.organization }),
          ...(this.openaiConfig.project && { 'OpenAI-Project': this.openaiConfig.project }),
        },
        body: JSON.stringify(openaiRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const context = request.context || this.createRequestContext();
      return new OpenAIStreamResponse(response, context, this);
    } catch (error) {
      throw this.handleError(error, 'generateStream');
    }
  }

  public async generateBatch(
    requests: LLMGenerationRequest[], 
    options?: BatchOptions
  ): Promise<AIResponse<LLMGenerationResponse[]>> {
    const batchSize = options?.batchSize || 5;
    const maxConcurrency = options?.maxConcurrency || 3;
    const results: LLMGenerationResponse[] = [];
    
    try {
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const promises = batch.map(request => this.generate(request));
        
        const batchResults = await Promise.all(promises);
        
        for (const result of batchResults) {
          if (result.success) {
            results.push(result.data);
          } else {
            if (options?.stopOnError) {
              return this.createErrorResponse(new AIError(result.error));
            }
          }
        }

        options?.onBatchComplete?.(Math.floor(i / batchSize), results);
        options?.onProgress?.(results.length, requests.length);

        if (i + batchSize < requests.length && options?.delayBetweenBatches) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
      }

      return this.createSuccessResponse(results);
    } catch (error) {
      const aiError = this.handleError(error, 'generateBatch');
      return this.createErrorResponse(aiError);
    }
  }

  public async chat(
    messages: AIMessage[],
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIResponse<LLMGenerationResponse>> {
    const request: LLMGenerationRequest = {
      messages,
      model: model || this.openaiConfig.defaultModel,
      ...options,
    };
    return this.generate(request);
  }

  public async chatStream(
    messages: AIMessage[],
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIStreamResponse<LLMStreamChunk>> {
    const request: LLMGenerationRequest = {
      messages,
      model: model || this.openaiConfig.defaultModel,
      streaming: true,
      ...options,
    };
    return this.generateStream(request);
  }

  public async complete(
    prompt: string,
    model?: string,
    options?: CompletionOptions
  ): Promise<AIResponse<string>> {
    const messages: AIMessage[] = [
      { role: 'user', content: prompt }
    ];

    if (options?.template) {
      // Simple template replacement
      let processedPrompt = options.template;
      if (options.variables) {
        for (const [key, value] of Object.entries(options.variables)) {
          processedPrompt = processedPrompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
      }
      messages[0].content = processedPrompt;
    }

    const result = await this.chat(messages, model);
    if (result.success) {
      const rawContent = result.data.choices[0]?.message?.content || '';
      const content = typeof rawContent === 'string' ? rawContent : '';
      
      if (options?.extractJson && typeof content === 'string') {
        try {
          const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          return this.createSuccessResponse(jsonStr);
        } catch (e) {
          return this.createSuccessResponse(content);
        }
      }

      return this.createSuccessResponse(content);
    }

    return result as AIResponse<string>;
  }

  public async callFunction(
    messages: AIMessage[],
    functions: FunctionDefinition[],
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIResponse<LLMGenerationResponse>> {
    const request: LLMGenerationRequest = {
      messages,
      model: model || this.openaiConfig.defaultModel,
      tools: functions.map(func => ({
        type: 'function' as const,
        function: func,
      })),
      toolChoice: 'auto',
      ...options,
    };
    return this.generate(request);
  }

  public async generateFromTemplate(
    template: string,
    variables: Record<string, any>,
    model?: string,
    options?: Partial<LLMGenerationRequest>
  ): Promise<AIResponse<string>> {
    return this.complete('', model, { template, variables, ...options });
  }

  public async compressHistory(
    history: ChatHistory,
    targetTokens: number
  ): Promise<AIResponse<AIMessage[]>> {
    // Simple sliding window compression
    const messages = [...history.messages];
    let totalTokens = history.totalTokens;

    // Keep system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    // Remove oldest messages until under target
    while (totalTokens > targetTokens && otherMessages.length > 2) {
      const removed = otherMessages.shift();
      if (removed) {
        // Rough estimate: 4 chars per token
        totalTokens -= Math.ceil((removed.content as string).length / 4);
      }
    }

    const compressed = systemMessage ? [systemMessage, ...otherMessages] : otherMessages;
    return this.createSuccessResponse(compressed);
  }

  public async countTokens(text: string, model?: string): Promise<AIResponse<number>> {
    // Rough estimation: ~4 characters per token for most models
    const estimatedTokens = Math.ceil(text.length / 4);
    return this.createSuccessResponse(estimatedTokens);
  }

  public async estimateCost(tokens: number, model?: string): Promise<AIResponse<number>> {
    const modelName = model || this.openaiConfig.defaultModel;
    const rates = this.openaiConfig.costPerToken?.[modelName];
    
    if (!rates) {
      return this.createSuccessResponse(0);
    }

    // Assume equal split for estimation
    const cost = (tokens * rates.input + tokens * rates.output) / 2;
    return this.createSuccessResponse(cost);
  }

  public isModelSupported(model: string): boolean {
    const supportedModels = this.openaiConfig.supportedModels || [
      'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'
    ];
    return supportedModels.includes(model) || model.startsWith('gpt-');
  }

  public async getModelCapabilities(model: string): Promise<AIResponse<any>> {
    return this.getModelInfo(model);
  }

  private convertRequest(request: LLMGenerationRequest): any {
    const openaiMessages: OpenAIMessage[] = request.messages.map(msg => ({
      role: msg.role as any,
      content: typeof msg.content === 'string' ? msg.content : null,
      name: msg.name,
      function_call: msg.functionCall ? {
        name: msg.functionCall.name,
        arguments: msg.functionCall.arguments,
      } : undefined,
      tool_calls: msg.toolCalls?.map(tc => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
    }));

    return {
      model: request.model || this.openaiConfig.defaultModel,
      messages: openaiMessages,
      temperature: request.temperature ?? this.openaiConfig.defaultTemperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.openaiConfig.defaultMaxTokens,
      top_p: request.topP ?? this.openaiConfig.defaultTopP,
      frequency_penalty: request.frequencyPenalty ?? this.openaiConfig.defaultFrequencyPenalty,
      presence_penalty: request.presencePenalty ?? this.openaiConfig.defaultPresencePenalty,
      stop: request.stop,
      seed: request.seed,
      response_format: request.responseFormat,
      tools: request.tools,
      tool_choice: request.toolChoice,
      user: request.user,
    };
  }

  private convertResponse(openaiResponse: OpenAIResponse, context?: RequestContext): LLMGenerationResponse {
    const requestContext = context || this.createRequestContext();
    
    return {
      id: openaiResponse.id,
      model: openaiResponse.model,
      choices: openaiResponse.choices.map(choice => ({
        index: choice.index,
        message: {
          id: `${openaiResponse.id}-${choice.index}`,
          role: choice.message.role as any,
          content: choice.message.content || '',
          functionCall: choice.message.function_call,
          toolCalls: choice.message.tool_calls,
        },
        finishReason: choice.finish_reason as any,
      })),
      usage: {
        promptTokens: openaiResponse.usage.prompt_tokens,
        completionTokens: openaiResponse.usage.completion_tokens,
        totalTokens: openaiResponse.usage.total_tokens,
      },
      metadata: this.createMetadata(requestContext, openaiResponse.model, {
        usage: {
          promptTokens: openaiResponse.usage.prompt_tokens,
          completionTokens: openaiResponse.usage.completion_tokens,
          totalTokens: openaiResponse.usage.total_tokens,
        },
      }),
      created: new Date(openaiResponse.created * 1000).toISOString(),
    };
  }

  private getContextWindow(model: string): number {
    const contextWindows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4-turbo-preview': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
    };

    return contextWindows[model] || 4096;
  }
}
