
/**
 * High-level Chat Service Interface
 * Combines LLM and Embeddings for conversational AI
 */

import { BaseAIService, RequestContext, StreamingOptions, AIStreamResponse } from './base';
import { LLMService, LLMStreamChunk } from './llm';
import { EmbeddingsService, Document, SimilaritySearchResult } from './embeddings';
import { AIMessage, AIMetadata } from '../types/common';
import { AIResponse } from '../types/errors';
import { ChatConfig } from '../types/config';

// Chat Session Interface
export interface ChatSession {
  id: string;
  userId?: string;
  tenantId?: string;
  title?: string;
  messages: AIMessage[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  settings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    memoryStrategy?: string;
  };
}

// Chat Request Interface
export interface ChatRequest {
  message: string | AIMessage;
  sessionId?: string;
  userId?: string;
  tenantId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  context?: RequestContext;
  streaming?: boolean;
  streamingOptions?: StreamingOptions;
  ragOptions?: {
    enabled?: boolean;
    maxResults?: number;
    threshold?: number;
    rerank?: boolean;
  };
  memoryOptions?: {
    strategy?: 'sliding_window' | 'summary' | 'vector_store' | 'none';
    maxMessages?: number;
    maxTokens?: number;
  };
  toolsEnabled?: boolean;
  availableTools?: string[];
}

// Chat Response Interface
export interface ChatResponse {
  id: string;
  sessionId: string;
  message: AIMessage;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  context?: {
    retrievedDocuments?: SimilaritySearchResult[];
    memoryUsed?: AIMessage[];
    toolsUsed?: string[];
  };
  metadata: AIMetadata;
  timestamp: string;
}

// Streaming Chat Response
export interface ChatStreamChunk {
  id: string;
  sessionId: string;
  delta: {
    content?: string;
    role?: string;
    toolCalls?: any[];
  };
  finishReason?: string;
  context?: {
    stage: 'retrieving' | 'generating' | 'complete';
    retrievedDocuments?: SimilaritySearchResult[];
    progress?: number;
  };
  metadata?: Partial<AIMetadata>;
  timestamp: string;
}

// Memory Strategy Interface
export interface MemoryStrategy {
  type: 'sliding_window' | 'summary' | 'vector_store' | 'none';
  
  compress(
    messages: AIMessage[],
    targetTokens: number,
    llmService: LLMService
  ): Promise<AIResponse<AIMessage[]>>;

  shouldCompress(
    messages: AIMessage[],
    maxTokens: number
  ): boolean;

  getRelevantMessages(
    messages: AIMessage[],
    currentMessage: string,
    maxMessages: number
  ): Promise<AIResponse<AIMessage[]>>;
}

// RAG (Retrieval Augmented Generation) Interface
export interface RAGOptions {
  enabled: boolean;
  knowledgeBase: string | string[];
  maxResults?: number;
  threshold?: number;
  rerank?: boolean;
  rerankModel?: string;
  includeContext?: boolean;
  contextTemplate?: string;
  useHybridSearch?: boolean;
  expandQuery?: boolean;
}

// Tool Interface for Chat
export interface ChatTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any, context: RequestContext) => Promise<any>;
  enabled: boolean;
  category?: string;
}

// Chat Service Interface
export interface ChatService extends BaseAIService {
  serviceType: 'chat';
  
  // Service Dependencies
  readonly llmService: LLMService;
  readonly embeddingsService?: EmbeddingsService;

  // Configuration
  getConfig(): ChatConfig;
  updateConfig(config: Partial<ChatConfig>): Promise<void>;

  // Core Chat Methods
  chat(request: ChatRequest): Promise<AIResponse<ChatResponse>>;
  chatStream(request: ChatRequest): Promise<AIStreamResponse<ChatStreamChunk>>;

  // Session Management
  createSession(
    userId?: string,
    tenantId?: string,
    title?: string,
    settings?: ChatSession['settings']
  ): Promise<AIResponse<ChatSession>>;

  getSession(sessionId: string): Promise<AIResponse<ChatSession | null>>;
  updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<AIResponse<ChatSession>>;
  deleteSession(sessionId: string): Promise<AIResponse<boolean>>;
  listSessions(userId?: string, tenantId?: string): Promise<AIResponse<ChatSession[]>>;

  // Message Management
  addMessage(sessionId: string, message: AIMessage): Promise<AIResponse<boolean>>;
  updateMessage(sessionId: string, messageId: string, updates: Partial<AIMessage>): Promise<AIResponse<boolean>>;
  deleteMessage(sessionId: string, messageId: string): Promise<AIResponse<boolean>>;
  getMessages(sessionId: string, limit?: number, offset?: number): Promise<AIResponse<AIMessage[]>>;

  // Memory Management
  compressSessionMemory(sessionId: string, strategy?: string): Promise<AIResponse<boolean>>;
  clearSessionMemory(sessionId: string): Promise<AIResponse<boolean>>;
  getMemoryUsage(sessionId: string): Promise<AIResponse<{
    totalMessages: number;
    totalTokens: number;
    memoryStrategy: string;
    lastCompressed?: string;
  }>>;

  // RAG Integration
  enableRAG(sessionId: string, options: RAGOptions): Promise<AIResponse<boolean>>;
  disableRAG(sessionId: string): Promise<AIResponse<boolean>>;
  updateRAGSettings(sessionId: string, options: Partial<RAGOptions>): Promise<AIResponse<boolean>>;
  
  // Knowledge Base Management
  addToKnowledgeBase(
    knowledgeBaseName: string,
    documents: Document[],
    tenantId?: string
  ): Promise<AIResponse<string[]>>;

  searchKnowledgeBase(
    query: string,
    knowledgeBaseName?: string,
    tenantId?: string,
    options?: {
      maxResults?: number;
      threshold?: number;
      rerank?: boolean;
    }
  ): Promise<AIResponse<SimilaritySearchResult[]>>;

  // Tool Management
  registerTool(tool: ChatTool): Promise<AIResponse<boolean>>;
  unregisterTool(toolName: string): Promise<AIResponse<boolean>>;
  listTools(): Promise<AIResponse<ChatTool[]>>;
  getToolInfo(toolName: string): Promise<AIResponse<ChatTool | null>>;

  // Analytics and Monitoring
  getSessionAnalytics(sessionId: string): Promise<AIResponse<{
    messageCount: number;
    totalTokens: number;
    avgResponseTime: number;
    toolUsageCount: Record<string, number>;
    errorCount: number;
    userSatisfactionScore?: number;
  }>>;

  getUserAnalytics(userId: string, timeframe?: string): Promise<AIResponse<{
    totalSessions: number;
    totalMessages: number;
    totalTokens: number;
    avgSessionLength: number;
    mostUsedTools: Array<{ name: string; count: number }>;
    topKnowledgeBases: Array<{ name: string; queries: number }>;
  }>>;

  // Conversation Features
  generateTitle(sessionId: string): Promise<AIResponse<string>>;
  summarizeConversation(sessionId: string): Promise<AIResponse<string>>;
  extractKeyTopics(sessionId: string): Promise<AIResponse<string[]>>;
  suggestFollowUpQuestions(sessionId: string): Promise<AIResponse<string[]>>;

  // Export/Import
  exportSession(sessionId: string, format?: 'json' | 'markdown' | 'txt'): Promise<AIResponse<string>>;
  importSession(data: string, format?: 'json' | 'markdown'): Promise<AIResponse<ChatSession>>;
}

// Specialized Chat Service Interfaces

// Customer Support Chat Service
export interface CustomerSupportChatService extends ChatService {
  escalateToHuman(
    sessionId: string,
    reason: string,
    priority?: 'low' | 'medium' | 'high'
  ): Promise<AIResponse<boolean>>;

  categorizeQuery(query: string): Promise<AIResponse<{
    category: string;
    confidence: number;
    suggestedActions: string[];
  }>>;

  generateSupportTicket(sessionId: string): Promise<AIResponse<{
    ticketId: string;
    summary: string;
    priority: string;
    category: string;
  }>>;
}

// Educational Chat Service
export interface EducationalChatService extends ChatService {
  assessKnowledge(
    sessionId: string,
    topic: string
  ): Promise<AIResponse<{
    level: 'beginner' | 'intermediate' | 'advanced';
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  }>>;

  generateQuiz(
    topic: string,
    difficulty: string,
    questionCount: number
  ): Promise<AIResponse<Array<{
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>>>;

  provideFeedback(
    sessionId: string,
    answer: string,
    correctAnswer: string
  ): Promise<AIResponse<{
    isCorrect: boolean;
    explanation: string;
    suggestions: string[];
  }>>;
}

// Creative Writing Chat Service
export interface CreativeWritingChatService extends ChatService {
  generateStory(
    prompt: string,
    genre?: string,
    length?: 'short' | 'medium' | 'long',
    style?: string
  ): Promise<AIResponse<{
    story: string;
    wordCount: number;
    genre: string;
    themes: string[];
  }>>;

  improveWriting(
    text: string,
    improvementType: 'grammar' | 'style' | 'clarity' | 'engagement'
  ): Promise<AIResponse<{
    improvedText: string;
    changes: Array<{
      original: string;
      improved: string;
      reason: string;
    }>;
    score: number;
  }>>;

  generateCharacter(
    description?: string
  ): Promise<AIResponse<{
    name: string;
    background: string;
    personality: string[];
    appearance: string;
    motivations: string[];
  }>>;
}
