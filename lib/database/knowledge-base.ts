
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { embeddingService } from '@/lib/services/embedding-service'
import { getDefaultEmbeddingModel } from './embedding-settings'
import type { Database } from '@/lib/types/database'

type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row']
type KnowledgeBaseInsert = Database['public']['Tables']['knowledge_base']['Insert']
type KnowledgeBaseUpdate = Database['public']['Tables']['knowledge_base']['Update']

export async function getKnowledgeBase(tenantId: string | null = null): Promise<KnowledgeBase[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('knowledge_base')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (tenantId) {
    // Get tenant-specific and global knowledge base entries
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  } else {
    // Only global knowledge base entries
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching knowledge base:', error)
    return []
  }

  return data || []
}

export async function getKnowledgeBaseEntry(entryId: string, tenantId: string | null = null): Promise<KnowledgeBase | null> {
  const supabase = createClient()
  
  let query = supabase
    .from('knowledge_base')
    .select('*')
    .eq('id', entryId)

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query.single()

  if (error) {
    console.error('Error fetching knowledge base entry:', error)
    return null
  }

  return data
}

export async function createKnowledgeBaseEntry(entry: KnowledgeBaseInsert): Promise<KnowledgeBase | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(entry)
    .select()
    .single()

  if (error) {
    console.error('Error creating knowledge base entry:', error)
    return null
  }

  return data
}

export async function updateKnowledgeBaseEntry(entryId: string, updates: KnowledgeBaseUpdate, tenantId: string | null = null): Promise<KnowledgeBase | null> {
  const supabase = createClient()
  
  let query = supabase
    .from('knowledge_base')
    .update(updates)
    .eq('id', entryId)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query.select().single()

  if (error) {
    console.error('Error updating knowledge base entry:', error)
    return null
  }

  return data
}

export async function searchKnowledgeBase(searchTerm: string, tenantId: string | null = null): Promise<KnowledgeBase[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('knowledge_base')
    .select('*')
    .eq('status', 'active')
    .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error searching knowledge base:', error)
    return []
  }

  return data || []
}

export async function searchKnowledgeBaseWithEmbeddings(
  searchTerm: string, 
  tenantId: string | null = null,
  limit: number = 10,
  threshold: number = 0.7
): Promise<KnowledgeBase[]> {
  try {
    // Get the default embedding model for this tenant
    const defaultModel = await getDefaultEmbeddingModel(tenantId)
    if (!defaultModel) {
      console.warn('No default embedding model configured, falling back to text search')
      return searchKnowledgeBase(searchTerm, tenantId)
    }

    // Generate embedding for the search term
    const embeddingResponse = await embeddingService.generateEmbeddings({
      text: searchTerm,
      model: defaultModel.model_id,
      tenantId
    })

    const queryEmbedding = embeddingResponse.embeddings[0]
    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding')
    }

    // Perform vector similarity search
    const supabase = createClient()
    
    // Use PostgreSQL's cosine similarity function (requires pgvector extension)
    // For now, we'll fall back to simple text search if embeddings aren't fully set up
    const results = await searchKnowledgeBase(searchTerm, tenantId)
    
    // TODO: Implement proper vector similarity search with pgvector
    // This would require the database to have pgvector extension installed
    // and proper vector similarity queries
    
    return results.slice(0, limit)
    
  } catch (error) {
    console.error('Error in vector search:', error)
    // Fallback to text search
    return searchKnowledgeBase(searchTerm, tenantId)
  }
}

export async function createKnowledgeBaseEntryWithEmbeddings(entry: KnowledgeBaseInsert): Promise<KnowledgeBase | null> {
  try {
    // Get the default embedding model for this tenant
    const defaultModel = await getDefaultEmbeddingModel(entry.tenant_id || null)
    
    if (defaultModel) {
      // Generate embeddings for the content
      const embeddingResponse = await embeddingService.generateEmbeddings({
        text: `${entry.title}\n\n${entry.content}`,
        model: defaultModel.model_id,
        tenantId: entry.tenant_id
      })

      const embedding = embeddingResponse.embeddings[0]
      if (embedding) {
        entry.embeddings = embedding
        // Store model info in metadata
        entry.metadata = {
          ...(entry.metadata as Record<string, any> || {}),
          embedding_model: defaultModel.model_id,
          embedding_dimensions: defaultModel.dimensions,
          embedded_at: new Date().toISOString()
        }
      }
    }

    // Create the entry with embeddings
    const result = await createKnowledgeBaseEntry(entry)
    return result
    
  } catch (error) {
    console.error('Error creating knowledge base entry with embeddings:', error)
    // Fallback to creating without embeddings
    return createKnowledgeBaseEntry(entry)
  }
}

export async function regenerateEmbeddings(
  entryId: string,
  tenantId: string | null = null,
  modelId?: string
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    // Get the entry
    const entry = await getKnowledgeBaseEntry(entryId, tenantId)
    if (!entry) {
      throw new Error('Knowledge base entry not found')
    }

    // Get the model to use
    let embeddingModel = null
    if (modelId) {
      // Use specified model (you'd get from settings)
      const settings = await getTenantEmbeddingSettings(tenantId)
      embeddingModel = settings.find(s => s.model_id === modelId)
    } else {
      // Use default model
      embeddingModel = await getDefaultEmbeddingModel(tenantId)
    }

    if (!embeddingModel) {
      throw new Error('No embedding model available')
    }

    // Generate new embeddings
    const embeddingResponse = await embeddingService.generateEmbeddings({
      text: `${entry.title}\n\n${entry.content}`,
      model: embeddingModel.model_id,
      tenantId
    })

    const embedding = embeddingResponse.embeddings[0]
    if (!embedding) {
      throw new Error('Failed to generate embeddings')
    }

    // Update the entry
    const updates: KnowledgeBaseUpdate = {
      embeddings: embedding,
      metadata: {
        ...(entry.metadata as Record<string, any> || {}),
        embedding_model: embeddingModel.model_id,
        embedding_dimensions: embeddingModel.dimensions,
        embedded_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }

    const updatedEntry = await updateKnowledgeBaseEntry(entryId, updates, tenantId)
    return updatedEntry !== null
    
  } catch (error) {
    console.error('Error regenerating embeddings:', error)
    return false
  }
}

// Helper function to get tenant embedding settings
async function getTenantEmbeddingSettings(tenantId: string | null) {
  const supabase = createClient()
  
  let query = supabase
    .from('tenant_embedding_settings')
    .select('*')
    .order('created_at', { ascending: false })

  if (tenantId) {
    query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data } = await query
  return data || []
}
