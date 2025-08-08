
/**
 * OpenAI Embeddings Provider Implementation
 * Provides text embedding functionality
 */

import { EmbeddingsService, EmbeddingRequest, EmbeddingResponse, Document, EmbeddedDocument, SimilaritySearchRequest, SimilaritySearchResult, BatchEmbeddingOptions, ChunkingOptions, VectorStore } from '../../interfaces/embeddings';
import { RequestContext, BatchOptions } from '../../interfaces/base';
import { OpenAIEmbeddingsConfig, EmbeddingsConfig } from '../../types/config';
import { AIResponse, AIError, createAIError } from '../../types/errors';
import { AIMetadata } from '../../types/common';
import { BaseProvider } from '../base/base-provider';

interface OpenAIEmbeddingRequest {
  input: string | string[];
  model: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: 'embedding';
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIEmbeddingsProvider extends BaseProvider implements EmbeddingsService {
  public readonly provider = 'openai' as const;
  public readonly serviceType = 'embeddings' as const;

  private baseURL: string;
  private openaiConfig: OpenAIEmbeddingsConfig;

  constructor(config: OpenAIEmbeddingsConfig) {
    super(config);
    this.openaiConfig = config;
    this.baseURL = config.apiEndpoint || 'https://api.openai.com/v1';
  }

  public getConfig(): EmbeddingsConfig {
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
      const embeddingModels = data.data
        ?.filter((model: any) => model.id?.includes('embedding'))
        ?.map((model: any) => model.id) || ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large'];

      return this.createSuccessResponse(embeddingModels);
    } catch (error) {
      const aiError = this.handleError(error, 'listModels');
      return this.createErrorResponse(aiError);
    }
  }

  public async getModelInfo(model: string): Promise<AIResponse<any>> {
    const modelInfo = {
      id: model,
      name: model,
      provider: this.provider,
      category: 'embedding' as const,
      capabilities: {
        streaming: false,
        batchProcessing: true,
      },
      dimensions: this.getModelDimensions(model),
    };

    return this.createSuccessResponse(modelInfo);
  }

  public async embed(request: EmbeddingRequest): Promise<AIResponse<EmbeddingResponse>> {
    try {
      const openaiRequest: OpenAIEmbeddingRequest = {
        input: request.input,
        model: request.model || this.openaiConfig.defaultModel,
        encoding_format: request.encodingFormat,
        dimensions: request.dimensions,
        user: request.user,
      };

      const response = await fetch(`${this.baseURL}/embeddings`, {
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

      const data: OpenAIEmbeddingResponse = await response.json();
      const convertedResponse = this.convertResponse(data, request.context);

      return this.createSuccessResponse(convertedResponse);
    } catch (error) {
      const aiError = this.handleError(error, 'embed');
      return this.createErrorResponse(aiError);
    }
  }

  public async embedBatch(
    texts: string[], 
    model?: string, 
    options?: BatchEmbeddingOptions
  ): Promise<AIResponse<EmbeddingResponse>> {
    try {
      const batchSize = options?.batchSize || this.openaiConfig.batchSize || 100;
      const allEmbeddings: Array<{ index: number; embedding: number[] }> = [];
      let totalTokens = 0;

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const request: EmbeddingRequest = {
          input: batch,
          model: model || this.openaiConfig.defaultModel,
        };

        const result = await this.embed(request);
        if (!result.success) {
          return result;
        }

        // Adjust indices to match original array
        result.data.data.forEach((item, batchIndex) => {
          allEmbeddings.push({
            index: i + batchIndex,
            embedding: item.embedding,
          });
        });

        totalTokens += result.data.usage.totalTokens;

        options?.onProgress?.(Math.min(i + batchSize, texts.length), texts.length);

        if (i + batchSize < texts.length && options?.delayBetweenBatches) {
          await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches));
        }
      }

      // Sort by original index to maintain order
      allEmbeddings.sort((a, b) => a.index - b.index);

      const response: EmbeddingResponse = {
        data: allEmbeddings.map((item, index) => ({
          index,
          embedding: item.embedding,
          object: 'embedding' as const,
        })),
        model: model || this.openaiConfig.defaultModel,
        usage: {
          promptTokens: totalTokens,
          totalTokens,
        },
        metadata: this.createMetadata(
          this.createRequestContext(),
          model || this.openaiConfig.defaultModel,
          { batchSize: texts.length }
        ),
      };

      return this.createSuccessResponse(response);
    } catch (error) {
      const aiError = this.handleError(error, 'embedBatch');
      return this.createErrorResponse(aiError);
    }
  }

  public async embedDocuments(
    documents: Document[],
    model?: string,
    chunkingOptions?: ChunkingOptions
  ): Promise<AIResponse<EmbeddedDocument[]>> {
    try {
      const embeddedDocs: EmbeddedDocument[] = [];
      const modelName = model || this.openaiConfig.defaultModel;
      const dimensions = this.getModelDimensions(modelName);

      for (const doc of documents) {
        let content = doc.content;
        
        // Apply chunking if requested
        if (chunkingOptions) {
          const chunkResult = await this.chunkText(content, chunkingOptions);
          if (!chunkResult.success) continue;

          // For simplicity, just take the first chunk or join them
          if (chunkResult.data.length > 0) {
            content = chunkResult.data[0].content;
          }
        }

        const embedResult = await this.embed({
          input: content,
          model: modelName,
        });

        if (embedResult.success) {
          embeddedDocs.push({
            ...doc,
            embedding: embedResult.data.data[0].embedding,
            model: modelName,
            dimensions,
          });
        }
      }

      return this.createSuccessResponse(embeddedDocs);
    } catch (error) {
      const aiError = this.handleError(error, 'embedDocuments');
      return this.createErrorResponse(aiError);
    }
  }

  public async embedText(text: string, model?: string): Promise<AIResponse<number[]>> {
    const result = await this.embed({
      input: text,
      model: model || this.openaiConfig.defaultModel,
    });

    if (result.success) {
      return this.createSuccessResponse(result.data.data[0].embedding);
    }

    return result as AIResponse<number[]>;
  }

  public async embedTexts(texts: string[], model?: string): Promise<AIResponse<number[][]>> {
    const result = await this.embedBatch(texts, model);

    if (result.success) {
      const embeddings = result.data.data.map(item => item.embedding);
      return this.createSuccessResponse(embeddings);
    }

    return result as AIResponse<number[][]>;
  }

  public calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    // Cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  public findMostSimilar(
    queryEmbedding: number[],
    candidateEmbeddings: number[][],
    k?: number
  ): Array<{ index: number; score: number }> {
    const similarities = candidateEmbeddings.map((embedding, index) => ({
      index,
      score: this.calculateSimilarity(queryEmbedding, embedding),
    }));

    similarities.sort((a, b) => b.score - a.score);
    return k ? similarities.slice(0, k) : similarities;
  }

  public normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  public combineEmbeddings(
    embeddings: number[][],
    weights?: number[],
    method: 'average' | 'weighted_average' | 'max' | 'concat' = 'average'
  ): number[] {
    if (embeddings.length === 0) return [];
    
    const dimension = embeddings[0].length;

    switch (method) {
      case 'average': {
        const result = new Array(dimension).fill(0);
        for (const embedding of embeddings) {
          for (let i = 0; i < dimension; i++) {
            result[i] += embedding[i] / embeddings.length;
          }
        }
        return result;
      }
      
      case 'weighted_average': {
        if (!weights || weights.length !== embeddings.length) {
          return this.combineEmbeddings(embeddings, undefined, 'average');
        }
        
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        const result = new Array(dimension).fill(0);
        
        for (let i = 0; i < embeddings.length; i++) {
          const weight = weights[i] / weightSum;
          for (let j = 0; j < dimension; j++) {
            result[j] += embeddings[i][j] * weight;
          }
        }
        return result;
      }
      
      case 'max': {
        const result = new Array(dimension).fill(-Infinity);
        for (const embedding of embeddings) {
          for (let i = 0; i < dimension; i++) {
            result[i] = Math.max(result[i], embedding[i]);
          }
        }
        return result;
      }
      
      case 'concat': {
        return embeddings.flat();
      }
      
      default:
        return this.combineEmbeddings(embeddings, weights, 'average');
    }
  }

  public async chunkText(
    text: string,
    options: ChunkingOptions
  ): Promise<AIResponse<Array<{
    content: string;
    index: number;
    startPosition: number;
    endPosition: number;
  }>>> {
    try {
      const chunks: Array<{
        content: string;
        index: number;
        startPosition: number;
        endPosition: number;
      }> = [];

      switch (options.strategy) {
        case 'fixed_size': {
          const chunkSize = options.maxChunkSize;
          const overlapSize = options.overlapSize || 0;
          
          for (let i = 0; i < text.length; i += chunkSize - overlapSize) {
            const start = i;
            const end = Math.min(i + chunkSize, text.length);
            const content = text.slice(start, end);
            
            if (content.trim().length >= (options.minChunkSize || 1)) {
              chunks.push({
                content,
                index: chunks.length,
                startPosition: start,
                endPosition: end,
              });
            }
            
            if (end >= text.length) break;
          }
          break;
        }
        
        case 'sentence': {
          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          let currentChunk = '';
          let startPos = 0;
          
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length + 1 <= options.maxChunkSize) {
              currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
            } else {
              if (currentChunk.trim().length > 0) {
                const endPos = startPos + currentChunk.length;
                chunks.push({
                  content: currentChunk.trim(),
                  index: chunks.length,
                  startPosition: startPos,
                  endPosition: endPos,
                });
                startPos = endPos;
              }
              currentChunk = sentence.trim();
            }
          }
          
          if (currentChunk.trim().length > 0) {
            chunks.push({
              content: currentChunk.trim(),
              index: chunks.length,
              startPosition: startPos,
              endPosition: startPos + currentChunk.length,
            });
          }
          break;
        }
        
        default: {
          // Fallback to fixed_size
          return this.chunkText(text, { ...options, strategy: 'fixed_size' });
        }
      }

      return this.createSuccessResponse(chunks);
    } catch (error) {
      const aiError = this.handleError(error, 'chunkText');
      return this.createErrorResponse(aiError);
    }
  }

  public preprocessText(
    text: string,
    options?: {
      removeStopWords?: boolean;
      lowercase?: boolean;
      removePunctuation?: boolean;
      removeNumbers?: boolean;
      stemming?: boolean;
      language?: string;
    }
  ): string {
    let processed = text;

    if (options?.lowercase) {
      processed = processed.toLowerCase();
    }

    if (options?.removePunctuation) {
      processed = processed.replace(/[^\w\s]/g, ' ');
    }

    if (options?.removeNumbers) {
      processed = processed.replace(/\d+/g, ' ');
    }

    // Clean up whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  public async getEmbeddingDimensions(model: string): Promise<AIResponse<number>> {
    const dimensions = this.getModelDimensions(model);
    return this.createSuccessResponse(dimensions);
  }

  public async getMaxInputLength(model: string): Promise<AIResponse<number>> {
    // OpenAI embedding models typically handle up to 8191 tokens
    return this.createSuccessResponse(8191);
  }

  public async estimateTokens(text: string, model?: string): Promise<AIResponse<number>> {
    // Rough estimation: ~4 characters per token
    const estimatedTokens = Math.ceil(text.length / 4);
    return this.createSuccessResponse(estimatedTokens);
  }

  public async estimateCost(tokens: number, model?: string): Promise<AIResponse<number>> {
    const modelName = model || this.openaiConfig.defaultModel;
    const rate = this.openaiConfig.costPerToken?.[modelName];
    
    if (!rate) {
      return this.createSuccessResponse(0);
    }

    const cost = tokens * rate;
    return this.createSuccessResponse(cost);
  }

  // Vector store methods - basic implementations
  public async createVectorStore(
    name: string,
    config?: {
      dimensions?: number;
      distance?: 'cosine' | 'euclidean' | 'dot_product';
      indexType?: string;
    }
  ): Promise<AIResponse<VectorStore>> {
    // This would typically integrate with a vector database
    throw createAIError('provider_error', 'Vector store creation not implemented', this.provider, this.serviceType, {
      retryable: false,
    });
  }

  public async getVectorStore(name: string): Promise<AIResponse<VectorStore | null>> {
    return this.createSuccessResponse(null);
  }

  public async deleteVectorStore(name: string): Promise<AIResponse<boolean>> {
    return this.createSuccessResponse(false);
  }

  private convertResponse(openaiResponse: OpenAIEmbeddingResponse, context?: RequestContext): EmbeddingResponse {
    const requestContext = context || this.createRequestContext();
    
    return {
      data: openaiResponse.data.map(item => ({
        index: item.index,
        embedding: item.embedding,
        object: 'embedding' as const,
      })),
      model: openaiResponse.model,
      usage: {
        promptTokens: openaiResponse.usage.prompt_tokens,
        totalTokens: openaiResponse.usage.total_tokens,
      },
      metadata: this.createMetadata(requestContext, openaiResponse.model, {
        usage: {
          promptTokens: openaiResponse.usage.prompt_tokens,
          totalTokens: openaiResponse.usage.total_tokens,
        },
      }),
    };
  }

  private getModelDimensions(model: string): number {
    const dimensions: Record<string, number> = {
      'text-embedding-ada-002': 1536,
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
    };

    return dimensions[model] || 1536;
  }
}
