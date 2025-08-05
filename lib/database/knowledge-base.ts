
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
