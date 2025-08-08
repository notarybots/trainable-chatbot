
/**
 * Embeddings Service Interface
 */

import { BaseAIService, RequestContext, BatchOptions } from './base';
import { AIMetadata } from '../types/common';
import { AIResponse } from '../types/errors';
import { EmbeddingsConfig } from '../types/config';

// Embedding Request
export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  user?: string;
  dimensions?: number;
  encodingFormat?: 'float' | 'base64';
  truncate?: 'start' | 'end';
  context?: RequestContext;
}

// Embedding Response
export interface EmbeddingResponse {
  data: Array<{
    index: number;
    embedding: number[];
    object: 'embedding';
  }>;
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  metadata: AIMetadata;
}

// Document for embedding with metadata
export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  source?: string;
  timestamp?: string;
  chunkIndex?: number;
  parentDocumentId?: string;
}

// Embedded Document
export interface EmbeddedDocument extends Document {
  embedding: number[];
  model: string;
  dimensions: number;
}

// Similarity Search Request
export interface SimilaritySearchRequest {
  query: string | number[];
  k?: number;
  threshold?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeContent?: boolean;
  rerank?: boolean;
  rerankModel?: string;
}

// Similarity Search Result
export interface SimilaritySearchResult {
  document: Document;
  score: number;
  embedding?: number[];
  distance?: number;
  rank?: number;
}

// Batch Embedding Options
export interface BatchEmbeddingOptions extends BatchOptions {
  chunkSize?: number;
  overlapSize?: number;
  preserveOrder?: boolean;
  includePositions?: boolean;
}

// Text Chunking Options
export interface ChunkingOptions {
  strategy: 'fixed_size' | 'sentence' | 'paragraph' | 'semantic';
  maxChunkSize: number;
  overlapSize?: number;
  preserveSentences?: boolean;
  splitOn?: string[];
  minChunkSize?: number;
}

// Vector Store Interface
export interface VectorStore {
  // Document Management
  addDocuments(documents: Document[]): Promise<AIResponse<string[]>>;
  updateDocument(id: string, document: Partial<Document>): Promise<AIResponse<boolean>>;
  deleteDocument(id: string): Promise<AIResponse<boolean>>;
  getDocument(id: string): Promise<AIResponse<EmbeddedDocument | null>>;
  
  // Search
  similaritySearch(request: SimilaritySearchRequest): Promise<AIResponse<SimilaritySearchResult[]>>;
  maxMarginalRelevanceSearch(
    query: string | number[],
    k: number,
    fetchK?: number,
    lambda?: number
  ): Promise<AIResponse<SimilaritySearchResult[]>>;
  
  // Management
  count(): Promise<AIResponse<number>>;
  clear(): Promise<AIResponse<boolean>>;
  listCollections(): Promise<AIResponse<string[]>>;
}

// Embeddings Service Interface
export interface EmbeddingsService extends BaseAIService {
  serviceType: 'embeddings';
  
  // Configuration
  getConfig(): EmbeddingsConfig;
  updateConfig(config: Partial<EmbeddingsConfig>): Promise<void>;

  // Basic Embedding Generation
  embed(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>>;
  
  // Batch Embedding
  embedBatch(
    texts: string[], 
    model?: string, 
    options?: BatchEmbeddingOptions
  ): Promise<AIResponse<EmbeddingResponse>>;

  // Document Processing
  embedDocuments(
    documents: Document[],
    model?: string,
    chunkingOptions?: ChunkingOptions
  ): Promise<AIResponse<EmbeddedDocument[]>>;

  // Convenience Methods
  embedText(text: string, model?: string): Promise<AIResponse<number[]>>;
  embedTexts(texts: string[], model?: string): Promise<AIResponse<number[][]>>;

  // Similarity Operations
  calculateSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): number;

  findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: number[][],
    k?: number
  ): Array<{ index: number; score: number }>;

  // Vector Operations
  normalizeEmbedding(embedding: number[]): number[];
  combineEmbeddings(
    embeddings: number[][],
    weights?: number[],
    method?: 'average' | 'weighted_average' | 'max' | 'concat'
  ): number[];

  // Text Preprocessing
  chunkText(
    text: string,
    options: ChunkingOptions
  ): Promise<AIResponse<Array<{
    content: string;
    index: number;
    startPosition: number;
    endPosition: number;
  }>>>;

  preprocessText(
    text: string,
    options?: {
      removeStopWords?: boolean;
      lowercase?: boolean;
      removePunctuation?: boolean;
      removeNumbers?: boolean;
      stemming?: boolean;
      language?: string;
    }
  ): string;

  // Model Information
  getEmbeddingDimensions(model: string): Promise<AIResponse<number>>;
  getMaxInputLength(model: string): Promise<AIResponse<number>>;
  
  // Cost Estimation
  estimateTokens(text: string, model?: string): Promise<AIResponse<number>>;
  estimateCost(tokens: number, model?: string): Promise<AIResponse<number>>;

  // Vector Store Integration
  createVectorStore(
    name: string,
    config?: {
      dimensions?: number;
      distance?: 'cosine' | 'euclidean' | 'dot_product';
      indexType?: string;
    }
  ): Promise<AIResponse<VectorStore>>;

  getVectorStore(name: string): Promise<AIResponse<VectorStore | null>>;
  deleteVectorStore(name: string): Promise<AIResponse<boolean>>;
}

// Specialized Embedding Interfaces

// Semantic Search Interface
export interface SemanticSearchService extends EmbeddingsService {
  search(
    query: string,
    documents: Document[],
    options?: {
      k?: number;
      threshold?: number;
      rerank?: boolean;
      includeMetadata?: boolean;
    }
  ): Promise<AIResponse<SimilaritySearchResult[]>>;

  indexDocuments(
    documents: Document[],
    indexName: string
  ): Promise<AIResponse<string>>;

  searchIndex(
    query: string,
    indexName: string,
    options?: SimilaritySearchRequest
  ): Promise<AIResponse<SimilaritySearchResult[]>>;
}

// Classification Interface using embeddings
export interface EmbeddingClassificationService extends EmbeddingsService {
  classify(
    text: string,
    categories: Array<{
      name: string;
      examples: string[];
      description?: string;
    }>,
    model?: string
  ): Promise<AIResponse<Array<{
    category: string;
    confidence: number;
  }>>>;

  createClassifier(
    trainingData: Array<{
      text: string;
      label: string;
    }>,
    name: string,
    model?: string
  ): Promise<AIResponse<string>>;

  predictWithClassifier(
    classifierId: string,
    text: string
  ): Promise<AIResponse<{
    prediction: string;
    confidence: number;
    probabilities: Record<string, number>;
  }>>;
}
