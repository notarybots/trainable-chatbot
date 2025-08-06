

export interface TenantEmbeddingSettings {
  id: string
  tenant_id: string | null
  model_id: string
  model_name: string
  provider: 'voyage' | 'openai'
  dimensions: number
  is_default: boolean
  settings: {
    temperature?: number
    max_tokens?: number
    batch_size?: number
    auto_reprocess?: boolean
  }
  created_at: string
  updated_at: string
}

export interface EmbeddingJob {
  id: string
  tenant_id: string | null
  model_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total_items: number
  processed_items: number
  error_message?: string
  created_at: string
  updated_at: string
}

export interface EmbeddingMetrics {
  tenant_id: string | null
  model_id: string
  total_embeddings: number
  success_rate: number
  average_processing_time: number
  last_updated: string
}
