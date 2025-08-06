

import VoyageAI from 'voyageai'

export interface EmbeddingModel {
  id: string
  name: string
  provider: 'voyage' | 'openai'
  dimensions: number
  maxTokens: number
  description: string
}

export const AVAILABLE_MODELS: EmbeddingModel[] = [
  {
    id: 'voyage-large-2-instruct',
    name: 'Voyage Large 2 Instruct',
    provider: 'voyage',
    dimensions: 1536,
    maxTokens: 32000,
    description: 'Best for instruction-following and complex reasoning tasks'
  },
  {
    id: 'voyage-large-2',
    name: 'Voyage Large 2',
    provider: 'voyage',
    dimensions: 1536,
    maxTokens: 16000,
    description: 'High-performance general-purpose embedding model'
  },
  {
    id: 'voyage-code-2',
    name: 'Voyage Code 2',
    provider: 'voyage',
    dimensions: 1536,
    maxTokens: 16000,
    description: 'Specialized for code understanding and similarity'
  },
  {
    id: 'text-embedding-3-small',
    name: 'OpenAI Text Embedding 3 Small',
    provider: 'openai',
    dimensions: 1536,
    maxTokens: 8192,
    description: 'Cost-effective OpenAI embedding model'
  },
  {
    id: 'text-embedding-3-large',
    name: 'OpenAI Text Embedding 3 Large',
    provider: 'openai',
    dimensions: 3072,
    maxTokens: 8192,
    description: 'High-performance OpenAI embedding model'
  }
]

export interface EmbeddingRequest {
  text: string | string[]
  model: string
  tenantId?: string | null
}

export interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  dimensions: number
  usage?: {
    tokens: number
  }
}

class EmbeddingService {
  private voyageClient?: any

  constructor() {
    // VoyageAI client will be initialized when needed
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const { text, model, tenantId } = request
    const modelConfig = AVAILABLE_MODELS.find(m => m.id === model)
    
    if (!modelConfig) {
      throw new Error(`Unsupported embedding model: ${model}`)
    }

    const texts = Array.isArray(text) ? text : [text]
    
    try {
      if (modelConfig.provider === 'voyage') {
        return await this.generateVoyageEmbeddings(texts, model, modelConfig)
      } else if (modelConfig.provider === 'openai') {
        return await this.generateOpenAIEmbeddings(texts, model, modelConfig)
      } else {
        throw new Error(`Unsupported provider: ${modelConfig.provider}`)
      }
    } catch (error) {
      console.error('Embedding generation error:', error)
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async generateVoyageEmbeddings(
    texts: string[], 
    model: string, 
    modelConfig: EmbeddingModel
  ): Promise<EmbeddingResponse> {
    if (!process.env.VOYAGE_API_KEY) {
      throw new Error('VOYAGE_API_KEY environment variable is not set.')
    }

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
      },
      body: JSON.stringify({
        input: texts,
        model: model
      })
    })

    if (!response.ok) {
      throw new Error(`Voyage AI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    return {
      embeddings: data.data?.map((item: any) => item.embedding) || [],
      model,
      dimensions: modelConfig.dimensions,
      usage: {
        tokens: data.usage?.total_tokens || 0
      }
    }
  }

  private async generateOpenAIEmbeddings(
    texts: string[], 
    model: string, 
    modelConfig: EmbeddingModel
  ): Promise<EmbeddingResponse> {
    // Use the existing ABACUSAI_API_KEY for OpenAI-compatible requests
    const response = await fetch('https://apps.abacus.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        input: texts,
        model: model,
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI embedding API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      embeddings: data.data?.map((item: any) => item.embedding) || [],
      model,
      dimensions: modelConfig.dimensions,
      usage: {
        tokens: data.usage?.total_tokens || 0
      }
    }
  }

  async searchSimilar(
    queryEmbedding: number[],
    tenantId: string | null = null,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<any[]> {
    // This will be implemented with proper vector similarity search
    // For now, return empty array as placeholder
    console.log('Vector similarity search not yet implemented')
    return []
  }

  getAvailableModels(): EmbeddingModel[] {
    return AVAILABLE_MODELS
  }

  getModelConfig(modelId: string): EmbeddingModel | undefined {
    return AVAILABLE_MODELS.find(m => m.id === modelId)
  }
}

export const embeddingService = new EmbeddingService()
