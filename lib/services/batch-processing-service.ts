

import { embeddingService } from './embedding-service'
import { 
  getKnowledgeBase, 
  updateKnowledgeBaseEntry,
  regenerateEmbeddings
} from '@/lib/database/knowledge-base'
import { 
  createEmbeddingJob,
  updateEmbeddingJobProgress,
  markEmbeddingJobCompleted,
  markEmbeddingJobFailed
} from '@/lib/database/embedding-jobs'
import { getDefaultEmbeddingModel } from '@/lib/database/embedding-settings'

export interface BatchProcessingOptions {
  tenantId?: string | null
  modelId?: string
  batchSize?: number
  onProgress?: (progress: number) => void
}

class BatchProcessingService {
  async processAllKnowledgeBase(options: BatchProcessingOptions = {}): Promise<string | null> {
    const { tenantId, modelId, batchSize = 50 } = options

    try {
      // Get all knowledge base entries that need processing
      const allEntries = await getKnowledgeBase(tenantId)
      
      if (allEntries.length === 0) {
        throw new Error('No knowledge base entries found to process')
      }

      // Determine which model to use
      let targetModel = null
      if (modelId) {
        const modelConfig = embeddingService.getModelConfig(modelId)
        if (!modelConfig) {
          throw new Error(`Invalid model ID: ${modelId}`)
        }
        targetModel = {
          model_id: modelId,
          model_name: modelConfig.name,
          dimensions: modelConfig.dimensions
        }
      } else {
        targetModel = await getDefaultEmbeddingModel(tenantId || null)
        if (!targetModel) {
          throw new Error('No default embedding model configured')
        }
      }

      // Create a processing job
      const job = await createEmbeddingJob({
        tenant_id: tenantId || null,
        model_id: targetModel.model_id,
        status: 'processing',
        progress: 0,
        total_items: allEntries.length,
        processed_items: 0,
        metadata: {
          batch_size: batchSize,
          model_name: targetModel.model_name,
          started_at: new Date().toISOString()
        }
      })

      if (!job) {
        throw new Error('Failed to create processing job')
      }

      // Process in background (in a real system, this would be a queue job)
      this.processEntriesInBatches(job.id, allEntries, targetModel, batchSize, options.onProgress)
        .catch(error => {
          console.error('Background processing failed:', error)
          markEmbeddingJobFailed(job.id, error.message)
        })

      return job.id

    } catch (error) {
      console.error('Batch processing initialization failed:', error)
      throw error
    }
  }

  private async processEntriesInBatches(
    jobId: string,
    entries: any[],
    model: any,
    batchSize: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    let processedCount = 0

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      
      // Process batch
      await Promise.all(
        batch.map(async (entry) => {
          try {
            // Check if entry needs embedding or re-embedding
            const metadata = entry.metadata as Record<string, any> || {}
            const needsProcessing = !entry.embeddings || 
              metadata.embedding_model !== model.model_id

            if (needsProcessing) {
              await regenerateEmbeddings(entry.id, entry.tenant_id, model.model_id)
            }
            
            processedCount++
            
            // Update job progress
            await updateEmbeddingJobProgress(jobId, processedCount, entries.length)
            
            // Call progress callback if provided
            if (onProgress) {
              onProgress(Math.round((processedCount / entries.length) * 100))
            }

          } catch (error) {
            console.error(`Failed to process entry ${entry.id}:`, error)
            // Continue with other entries
          }
        })
      )

      // Small delay between batches to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Mark job as completed
    await markEmbeddingJobCompleted(jobId)
  }

  async migrateToNewModel(
    fromModelId: string,
    toModelId: string,
    tenantId?: string | null
  ): Promise<string | null> {
    try {
      // Validate target model
      const targetModelConfig = embeddingService.getModelConfig(toModelId)
      if (!targetModelConfig) {
        throw new Error(`Invalid target model: ${toModelId}`)
      }

      // Get all entries using the old model
      const allEntries = await getKnowledgeBase(tenantId)
      const entriesToMigrate = allEntries.filter(entry => {
        const metadata = entry.metadata as Record<string, any> || {}
        return metadata.embedding_model === fromModelId
      })

      if (entriesToMigrate.length === 0) {
        throw new Error(`No entries found using model: ${fromModelId}`)
      }

      // Create migration job
      const job = await createEmbeddingJob({
        tenant_id: tenantId,
        model_id: toModelId,
        status: 'processing',
        progress: 0,
        total_items: entriesToMigrate.length,
        processed_items: 0,
        metadata: {
          migration_type: 'model_change',
          from_model: fromModelId,
          to_model: toModelId,
          started_at: new Date().toISOString()
        }
      })

      if (!job) {
        throw new Error('Failed to create migration job')
      }

      // Process migration in background
      this.processEntriesInBatches(
        job.id, 
        entriesToMigrate, 
        {
          model_id: toModelId,
          model_name: targetModelConfig.name,
          dimensions: targetModelConfig.dimensions
        },
        25 // Smaller batch size for migrations
      ).catch(error => {
        console.error('Migration failed:', error)
        markEmbeddingJobFailed(job.id, error.message)
      })

      return job.id

    } catch (error) {
      console.error('Model migration failed:', error)
      throw error
    }
  }

  async getProcessingStats(tenantId?: string | null): Promise<any> {
    try {
      const allEntries = await getKnowledgeBase(tenantId)
      
      const stats = {
        total_entries: allEntries.length,
        entries_with_embeddings: 0,
        entries_without_embeddings: 0,
        models_used: new Map(),
        last_processed: null,
        avg_processing_time: null
      }

      allEntries.forEach(entry => {
        if (entry.embeddings && entry.embeddings.length > 0) {
          stats.entries_with_embeddings++
          
          const metadata = entry.metadata as Record<string, any> || {}
          const modelId = metadata.embedding_model || 'unknown'
          const current = stats.models_used.get(modelId) || 0
          stats.models_used.set(modelId, current + 1)
          
          const processedAt = metadata.embedded_at
          if (processedAt && (!stats.last_processed || processedAt > stats.last_processed)) {
            stats.last_processed = processedAt
          }
        } else {
          stats.entries_without_embeddings++
        }
      })

      return {
        ...stats,
        models_used: Object.fromEntries(stats.models_used),
        completion_rate: stats.total_entries > 0 
          ? Math.round((stats.entries_with_embeddings / stats.total_entries) * 100) 
          : 0
      }

    } catch (error) {
      console.error('Failed to get processing stats:', error)
      throw error
    }
  }
}

export const batchProcessingService = new BatchProcessingService()
