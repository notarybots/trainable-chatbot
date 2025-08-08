
/**
 * OpenAI Chat Provider Implementation
 * High-level chat service combining LLM and embeddings
 */

import { ChatService, ChatRequest, ChatResponse, ChatStreamChunk, ChatSession, MemoryStrategy, RAGOptions, ChatTool } from '../../interfaces/chat';
import { AIStreamResponse, RequestContext } from '../../interfaces/base';
import { LLMService } from '../../interfaces/llm';
import { EmbeddingsService, Document, SimilaritySearchResult } from '../../interfaces/embeddings';
import { ChatConfig } from '../../types/config';
import { AIResponse, AIError, createAIError } from '../../types/errors';
import { AIMessage, AIMetadata } from '../../types/common';
import { BaseProvider } from '../base/base-provider';
import { OpenAILLMProvider } from './openai-llm-provider';
import { OpenAIEmbeddingsProvider } from './openai-embeddings-provider';

class ChatStreamResponse implements AIStreamResponse<ChatStreamChunk> {
  private llmStream: AIStreamResponse<any>;
  private sessionId: string;
  private cancelled = false;

  constructor(llmStream: AIStreamResponse<any>, sessionId: string) {
    this.llmStream = llmStream;
    this.sessionId = sessionId;
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    await this.llmStream.cancel();
  }

  getStatus() {
    return this.llmStream.getStatus();
  }

  getMetadata(): AIMetadata | null {
    return this.llmStream.getMetadata();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<ChatStreamChunk> {
    for await (const chunk of this.llmStream) {
      if (this.cancelled) break;

      // Convert LLM chunk to Chat chunk
      const chatChunk: ChatStreamChunk = {
        id: chunk.id,
        sessionId: this.sessionId,
        delta: {
          content: chunk.choices?.[0]?.delta?.content,
          role: chunk.choices?.[0]?.delta?.role,
          toolCalls: chunk.choices?.[0]?.delta?.toolCalls,
        },
        finishReason: chunk.choices?.[0]?.finishReason,
        context: {
          stage: 'generating' as const,
        },
        metadata: chunk.metadata,
        timestamp: chunk.created,
      };

      yield chatChunk;
    }
  }
}

export class OpenAIChatProvider extends BaseProvider implements ChatService {
  public readonly provider = 'openai' as const;
  public readonly serviceType = 'chat' as const;
  public readonly llmService: LLMService;
  public readonly embeddingsService?: EmbeddingsService;

  private chatConfig: ChatConfig;
  private sessions: Map<string, ChatSession> = new Map();
  private tools: Map<string, ChatTool> = new Map();

  constructor(config: ChatConfig, llmService?: LLMService, embeddingsService?: EmbeddingsService) {
    super(config);
    this.chatConfig = config;
    
    // Use provided services - assume they're passed in from the factory
    this.llmService = llmService || (() => { 
      throw new Error('LLM service must be provided to chat provider'); 
    })();
    
    this.embeddingsService = embeddingsService;
  }

  public getConfig(): ChatConfig {
    return { ...this.chatConfig };
  }

  public async listModels(): Promise<AIResponse<string[]>> {
    return this.llmService.listModels();
  }

  public async getModelInfo(model: string): Promise<AIResponse<any>> {
    return this.llmService.getModelInfo(model);
  }

  public async initialize(): Promise<void> {
    await super.initialize();
    await this.llmService.initialize();
    if (this.embeddingsService) {
      await this.embeddingsService.initialize();
    }
  }

  public async destroy(): Promise<void> {
    await super.destroy();
    await this.llmService.destroy();
    if (this.embeddingsService) {
      await this.embeddingsService.destroy();
    }
  }

  public async chat(request: ChatRequest): Promise<AIResponse<ChatResponse>> {
    try {
      const sessionId = request.sessionId || this.generateSessionId();
      let session = this.sessions.get(sessionId);

      // Create session if it doesn't exist
      if (!session) {
        const createResult = await this.createSession(request.userId, request.tenantId, undefined, {
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          systemPrompt: request.systemPrompt,
        });
        
        if (!createResult.success) {
          return createResult as AIResponse<ChatResponse>;
        }
        
        session = createResult.data;
        this.sessions.set(sessionId, session);
      }

      // Prepare messages
      const messages = [...session.messages];
      
      // Add system prompt if provided
      if (request.systemPrompt && !messages.find(m => m.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      // Add user message
      const userMessage: AIMessage = typeof request.message === 'string' 
        ? { role: 'user', content: request.message }
        : request.message;
      
      messages.push(userMessage);

      // Perform RAG if enabled
      let retrievedDocuments: SimilaritySearchResult[] = [];
      if (request.ragOptions?.enabled && this.embeddingsService) {
        const ragOptions = {
          enabled: true,
          knowledgeBase: 'default',
          ...request.ragOptions,
        };
        const ragResult = await this.performRAG(
          typeof request.message === 'string' ? request.message : request.message.content as string,
          ragOptions
        );
        
        if (ragResult.success) {
          retrievedDocuments = ragResult.data;
          
          // Add context to messages
          if (retrievedDocuments.length > 0) {
            const contextMessage: AIMessage = {
              role: 'system',
              content: `Context information:\n${retrievedDocuments.map(doc => doc.document.content).join('\n\n')}`,
            };
            messages.splice(-1, 0, contextMessage); // Insert before user message
          }
        }
      }

      // Apply memory compression if needed
      const compressedMessages = await this.applyMemoryStrategy(messages, request.memoryOptions);

      // Generate response using LLM
      const llmResult = await this.llmService.chat(compressedMessages, request.model, {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        context: request.context,
      });

      if (!llmResult.success) {
        return llmResult as AIResponse<ChatResponse>;
      }

      const assistantMessage = llmResult.data.choices[0]?.message;
      if (assistantMessage) {
        session.messages.push(userMessage, assistantMessage);
        session.updatedAt = new Date().toISOString();
      }

      // Create chat response
      const chatResponse: ChatResponse = {
        id: llmResult.data.id,
        sessionId,
        message: assistantMessage,
        usage: llmResult.data.usage,
        context: {
          retrievedDocuments: retrievedDocuments.length > 0 ? retrievedDocuments : undefined,
          memoryUsed: compressedMessages,
        },
        metadata: llmResult.data.metadata,
        timestamp: new Date().toISOString(),
      };

      return this.createSuccessResponse(chatResponse);
    } catch (error) {
      const aiError = this.handleError(error, 'chat');
      return this.createErrorResponse(aiError);
    }
  }

  public async chatStream(request: ChatRequest): Promise<AIStreamResponse<ChatStreamChunk>> {
    try {
      const sessionId = request.sessionId || this.generateSessionId();
      let session = this.sessions.get(sessionId);

      // Create session if it doesn't exist
      if (!session) {
        const createResult = await this.createSession(request.userId, request.tenantId);
        if (!createResult.success) {
          throw new AIError(createResult.error);
        }
        session = createResult.data;
      }

      // Prepare messages (similar to chat method)
      const messages = [...session.messages];
      
      if (request.systemPrompt && !messages.find(m => m.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: request.systemPrompt,
        });
      }

      const userMessage: AIMessage = typeof request.message === 'string' 
        ? { role: 'user', content: request.message }
        : request.message;
      
      messages.push(userMessage);

      // Apply memory strategy
      const compressedMessages = await this.applyMemoryStrategy(messages, request.memoryOptions);

      // Generate streaming response
      const llmStream = await this.llmService.chatStream(compressedMessages, request.model, {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        context: request.context,
        streaming: true,
      });

      return new ChatStreamResponse(llmStream, sessionId);
    } catch (error) {
      throw this.handleError(error, 'chatStream');
    }
  }

  // Session Management
  public async createSession(
    userId?: string,
    tenantId?: string,
    title?: string,
    settings?: ChatSession['settings']
  ): Promise<AIResponse<ChatSession>> {
    const sessionId = this.generateSessionId();
    const session: ChatSession = {
      id: sessionId,
      userId,
      tenantId,
      title: title || 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      settings,
    };

    this.sessions.set(sessionId, session);
    return this.createSuccessResponse(session);
  }

  public async getSession(sessionId: string): Promise<AIResponse<ChatSession | null>> {
    const session = this.sessions.get(sessionId);
    return this.createSuccessResponse(session || null);
  }

  public async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<AIResponse<ChatSession>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, updatedSession);
    return this.createSuccessResponse(updatedSession);
  }

  public async deleteSession(sessionId: string): Promise<AIResponse<boolean>> {
    const exists = this.sessions.has(sessionId);
    if (exists) {
      this.sessions.delete(sessionId);
    }
    return this.createSuccessResponse(exists);
  }

  public async listSessions(userId?: string, tenantId?: string): Promise<AIResponse<ChatSession[]>> {
    const sessions = Array.from(this.sessions.values()).filter(session => {
      if (userId && session.userId !== userId) return false;
      if (tenantId && session.tenantId !== tenantId) return false;
      return true;
    });

    return this.createSuccessResponse(sessions);
  }

  // Message Management
  public async addMessage(sessionId: string, message: AIMessage): Promise<AIResponse<boolean>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();
    return this.createSuccessResponse(true);
  }

  public async updateMessage(sessionId: string, messageId: string, updates: Partial<AIMessage>): Promise<AIResponse<boolean>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    const messageIndex = session.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      const error = createAIError('validation', 'Message not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    session.messages[messageIndex] = { ...session.messages[messageIndex], ...updates };
    session.updatedAt = new Date().toISOString();
    return this.createSuccessResponse(true);
  }

  public async deleteMessage(sessionId: string, messageId: string): Promise<AIResponse<boolean>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    const messageIndex = session.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      return this.createSuccessResponse(false);
    }

    session.messages.splice(messageIndex, 1);
    session.updatedAt = new Date().toISOString();
    return this.createSuccessResponse(true);
  }

  public async getMessages(sessionId: string, limit?: number, offset?: number): Promise<AIResponse<AIMessage[]>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    let messages = [...session.messages];
    if (offset) {
      messages = messages.slice(offset);
    }
    if (limit) {
      messages = messages.slice(0, limit);
    }

    return this.createSuccessResponse(messages);
  }

  // Stub implementations for other required methods
  public async compressSessionMemory(sessionId: string, strategy?: string): Promise<AIResponse<boolean>> {
    return this.createSuccessResponse(true);
  }

  public async clearSessionMemory(sessionId: string): Promise<AIResponse<boolean>> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.updatedAt = new Date().toISOString();
      return this.createSuccessResponse(true);
    }
    return this.createSuccessResponse(false);
  }

  public async getMemoryUsage(sessionId: string): Promise<AIResponse<{
    totalMessages: number;
    totalTokens: number;
    memoryStrategy: string;
    lastCompressed?: string;
  }>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    // Rough token estimation
    const totalTokens = session.messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : '';
      return sum + Math.ceil(content.length / 4);
    }, 0);

    return this.createSuccessResponse({
      totalMessages: session.messages.length,
      totalTokens,
      memoryStrategy: this.chatConfig.memoryStrategy || 'none',
    });
  }

  // RAG and Knowledge Base (stub implementations)
  public async enableRAG(sessionId: string, options: RAGOptions): Promise<AIResponse<boolean>> {
    return this.createSuccessResponse(!!this.embeddingsService);
  }

  public async disableRAG(sessionId: string): Promise<AIResponse<boolean>> {
    return this.createSuccessResponse(true);
  }

  public async updateRAGSettings(sessionId: string, options: Partial<RAGOptions>): Promise<AIResponse<boolean>> {
    return this.createSuccessResponse(true);
  }

  public async addToKnowledgeBase(
    knowledgeBaseName: string,
    documents: Document[],
    tenantId?: string
  ): Promise<AIResponse<string[]>> {
    if (!this.embeddingsService) {
      const error = createAIError('validation', 'Embeddings service not available', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    // This would typically save to a vector database
    return this.createSuccessResponse(documents.map(doc => doc.id));
  }

  public async searchKnowledgeBase(
    query: string,
    knowledgeBaseName?: string,
    tenantId?: string,
    options?: {
      maxResults?: number;
      threshold?: number;
      rerank?: boolean;
    }
  ): Promise<AIResponse<SimilaritySearchResult[]>> {
    if (!this.embeddingsService) {
      const error = createAIError('validation', 'Embeddings service not available', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    // This would typically search in a vector database
    return this.createSuccessResponse([]);
  }

  // Tool Management (stub implementations)
  public async registerTool(tool: ChatTool): Promise<AIResponse<boolean>> {
    this.tools.set(tool.name, tool);
    return this.createSuccessResponse(true);
  }

  public async unregisterTool(toolName: string): Promise<AIResponse<boolean>> {
    const existed = this.tools.has(toolName);
    this.tools.delete(toolName);
    return this.createSuccessResponse(existed);
  }

  public async listTools(): Promise<AIResponse<ChatTool[]>> {
    return this.createSuccessResponse(Array.from(this.tools.values()));
  }

  public async getToolInfo(toolName: string): Promise<AIResponse<ChatTool | null>> {
    const tool = this.tools.get(toolName);
    return this.createSuccessResponse(tool || null);
  }

  // Analytics (stub implementations)
  public async getSessionAnalytics(sessionId: string): Promise<AIResponse<any>> {
    return this.createSuccessResponse({
      messageCount: 0,
      totalTokens: 0,
      avgResponseTime: 0,
      toolUsageCount: {},
      errorCount: 0,
    });
  }

  public async getUserAnalytics(userId: string, timeframe?: string): Promise<AIResponse<any>> {
    return this.createSuccessResponse({
      totalSessions: 0,
      totalMessages: 0,
      totalTokens: 0,
      avgSessionLength: 0,
      mostUsedTools: [],
      topKnowledgeBases: [],
    });
  }

  // Conversation Features (stub implementations)
  public async generateTitle(sessionId: string): Promise<AIResponse<string>> {
    const session = this.sessions.get(sessionId);
    if (!session || session.messages.length === 0) {
      return this.createSuccessResponse('New Chat');
    }

    const firstMessage = session.messages.find(m => m.role === 'user');
    if (!firstMessage) {
      return this.createSuccessResponse('New Chat');
    }

    const content = typeof firstMessage.content === 'string' ? firstMessage.content : 'New Chat';
    const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    return this.createSuccessResponse(title);
  }

  public async summarizeConversation(sessionId: string): Promise<AIResponse<string>> {
    return this.createSuccessResponse('Conversation summary not implemented');
  }

  public async extractKeyTopics(sessionId: string): Promise<AIResponse<string[]>> {
    return this.createSuccessResponse([]);
  }

  public async suggestFollowUpQuestions(sessionId: string): Promise<AIResponse<string[]>> {
    return this.createSuccessResponse([]);
  }

  // Export/Import (stub implementations)
  public async exportSession(sessionId: string, format: 'json' | 'markdown' | 'txt' = 'json'): Promise<AIResponse<string>> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const error = createAIError('validation', 'Session not found', this.provider, this.serviceType);
      return this.createErrorResponse(error);
    }

    return this.createSuccessResponse(JSON.stringify(session, null, 2));
  }

  public async importSession(data: string, format: 'json' | 'markdown' = 'json'): Promise<AIResponse<ChatSession>> {
    try {
      const session: ChatSession = JSON.parse(data);
      this.sessions.set(session.id, session);
      return this.createSuccessResponse(session);
    } catch (error) {
      const aiError = createAIError('parsing', 'Invalid session data', this.provider, this.serviceType);
      return this.createErrorResponse(aiError);
    }
  }

  // Helper methods
  private generateSessionId(): string {
    return `${this.provider}-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private async performRAG(query: string, options: RAGOptions): Promise<AIResponse<SimilaritySearchResult[]>> {
    if (!this.embeddingsService) {
      return this.createSuccessResponse([]);
    }

    // This would typically search in a vector database
    return this.createSuccessResponse([]);
  }

  private async applyMemoryStrategy(
    messages: AIMessage[],
    memoryOptions?: ChatRequest['memoryOptions']
  ): Promise<AIMessage[]> {
    const strategy = memoryOptions?.strategy || this.chatConfig.memoryStrategy || 'sliding_window';
    const maxMessages = memoryOptions?.maxMessages || 20;

    switch (strategy) {
      case 'sliding_window':
        // Keep system message and last N messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const otherMessages = messages.filter(m => m.role !== 'system');
        const recentMessages = otherMessages.slice(-maxMessages);
        return [...systemMessages, ...recentMessages];
      
      case 'none':
        return messages;
      
      default:
        return messages.slice(-maxMessages);
    }
  }
}
