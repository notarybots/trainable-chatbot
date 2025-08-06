

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'

type EmbeddingSettings = Database['public']['Tables']['tenant_embedding_settings']['Row']
type EmbeddingSettingsInsert = Database['public']['Tables']['tenant_embedding_settings']['Insert']
type EmbeddingSettingsUpdate = Database['public']['Tables']['tenant_embedding_settings']['Update']

export async function getTenantEmbeddingSettings(tenantId: string | null): Promise<EmbeddingSettings[]> {
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

  const { data, error } = await query

  if (error) {
    console.error('Error fetching tenant embedding settings:', error)
    return []
  }

  return data || []
}

export async function getDefaultEmbeddingModel(tenantId: string | null): Promise<EmbeddingSettings | null> {
  const supabase = createClient()
  
  // First, try to get tenant-specific default
  let query = supabase
    .from('tenant_embedding_settings')
    .select('*')
    .eq('is_default', true)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  let { data, error } = await query.single()

  // If no tenant-specific default, get global default
  if (error && tenantId) {
    const globalQuery = await supabase
      .from('tenant_embedding_settings')
      .select('*')
      .eq('is_default', true)
      .is('tenant_id', null)
      .single()

    data = globalQuery.data
    error = globalQuery.error
  }

  if (error) {
    console.error('Error fetching default embedding model:', error)
    return null
  }

  return data
}

export async function createEmbeddingSettings(settings: EmbeddingSettingsInsert): Promise<EmbeddingSettings | null> {
  const supabase = createAdminClient()

  // If setting as default, unset other defaults for this tenant
  if (settings.is_default) {
    await unsetDefaultEmbeddingModel(settings.tenant_id || null)
  }
  
  const { data, error } = await supabase
    .from('tenant_embedding_settings')
    .insert(settings)
    .select()
    .single()

  if (error) {
    console.error('Error creating embedding settings:', error)
    return null
  }

  return data
}

export async function updateEmbeddingSettings(
  settingsId: string, 
  updates: EmbeddingSettingsUpdate,
  tenantId: string | null = null
): Promise<EmbeddingSettings | null> {
  const supabase = createAdminClient()

  // If setting as default, unset other defaults for this tenant
  if (updates.is_default) {
    await unsetDefaultEmbeddingModel(tenantId)
  }

  let query = supabase
    .from('tenant_embedding_settings')
    .update(updates)
    .eq('id', settingsId)

  if (tenantId !== null && tenantId !== undefined) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query.select().single()

  if (error) {
    console.error('Error updating embedding settings:', error)
    return null
  }

  return data
}

export async function deleteEmbeddingSettings(settingsId: string, tenantId: string | null): Promise<boolean> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from('tenant_embedding_settings')
    .delete()
    .eq('id', settingsId)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { error } = await query

  if (error) {
    console.error('Error deleting embedding settings:', error)
    return false
  }

  return true
}

async function unsetDefaultEmbeddingModel(tenantId: string | null): Promise<void> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from('tenant_embedding_settings')
    .update({ is_default: false })
    .eq('is_default', true)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  await query
}

export async function initializeDefaultEmbeddingModels(): Promise<void> {
  const supabase = createAdminClient()

  // Check if default models already exist
  const { data: existing } = await supabase
    .from('tenant_embedding_settings')
    .select('id')
    .is('tenant_id', null)
    .limit(1)

  if (existing && existing.length > 0) {
    return // Already initialized
  }

  // Create default global settings
  const defaultSettings: EmbeddingSettingsInsert[] = [
    {
      tenant_id: null,
      model_id: 'voyage-large-2-instruct',
      model_name: 'Voyage Large 2 Instruct',
      provider: 'voyage',
      dimensions: 1536,
      is_default: true,
      settings: {
        batch_size: 100,
        auto_reprocess: false
      }
    },
    {
      tenant_id: null,
      model_id: 'voyage-large-2',
      model_name: 'Voyage Large 2',
      provider: 'voyage',
      dimensions: 1536,
      is_default: false,
      settings: {
        batch_size: 100,
        auto_reprocess: false
      }
    },
    {
      tenant_id: null,
      model_id: 'text-embedding-3-small',
      model_name: 'OpenAI Text Embedding 3 Small',
      provider: 'openai',
      dimensions: 1536,
      is_default: false,
      settings: {
        batch_size: 50,
        auto_reprocess: false
      }
    }
  ]

  const { error } = await supabase
    .from('tenant_embedding_settings')
    .insert(defaultSettings)

  if (error) {
    console.error('Error initializing default embedding models:', error)
  }
}
