

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'

type EmbeddingJob = Database['public']['Tables']['embedding_jobs']['Row']
type EmbeddingJobInsert = Database['public']['Tables']['embedding_jobs']['Insert']
type EmbeddingJobUpdate = Database['public']['Tables']['embedding_jobs']['Update']

export async function createEmbeddingJob(job: EmbeddingJobInsert): Promise<EmbeddingJob | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('embedding_jobs')
    .insert(job)
    .select()
    .single()

  if (error) {
    console.error('Error creating embedding job:', error)
    return null
  }

  return data
}

export async function getEmbeddingJob(jobId: string, tenantId: string | null): Promise<EmbeddingJob | null> {
  const supabase = createClient()
  
  let query = supabase
    .from('embedding_jobs')
    .select('*')
    .eq('id', jobId)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query.single()

  if (error) {
    console.error('Error fetching embedding job:', error)
    return null
  }

  return data
}

export async function getEmbeddingJobs(
  tenantId: string | null, 
  status?: string,
  limit: number = 50
): Promise<EmbeddingJob[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('embedding_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching embedding jobs:', error)
    return []
  }

  return data || []
}

export async function updateEmbeddingJob(
  jobId: string,
  updates: EmbeddingJobUpdate,
  tenantId: string | null
): Promise<EmbeddingJob | null> {
  const supabase = createAdminClient()
  
  let query = supabase
    .from('embedding_jobs')
    .update(updates)
    .eq('id', jobId)

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  } else {
    query = query.is('tenant_id', null)
  }

  const { data, error } = await query.select().single()

  if (error) {
    console.error('Error updating embedding job:', error)
    return null
  }

  return data
}

export async function updateEmbeddingJobProgress(
  jobId: string,
  processedItems: number,
  totalItems?: number,
  status?: string
): Promise<void> {
  const supabase = createAdminClient()
  
  const progress = totalItems ? Math.round((processedItems / totalItems) * 100) : 0
  
  const updates: EmbeddingJobUpdate = {
    processed_items: processedItems,
    progress,
    updated_at: new Date().toISOString()
  }

  if (totalItems) {
    updates.total_items = totalItems
  }

  if (status) {
    updates.status = status
  }

  await supabase
    .from('embedding_jobs')
    .update(updates)
    .eq('id', jobId)
}

export async function markEmbeddingJobCompleted(jobId: string): Promise<void> {
  await updateEmbeddingJob(jobId, {
    status: 'completed',
    progress: 100,
    updated_at: new Date().toISOString()
  }, null)
}

export async function markEmbeddingJobFailed(jobId: string, errorMessage: string): Promise<void> {
  await updateEmbeddingJob(jobId, {
    status: 'failed',
    error_message: errorMessage,
    updated_at: new Date().toISOString()
  }, null)
}
