
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type ChatSession = Database['public']['Tables']['chat_sessions']['Row']
type ChatSessionInsert = Database['public']['Tables']['chat_sessions']['Insert']
type ChatSessionUpdate = Database['public']['Tables']['chat_sessions']['Update']

export async function getChatSessions(tenantId: string, userId: string): Promise<ChatSession[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching chat sessions:', error)
    return []
  }

  return data || []
}

export async function getChatSession(sessionId: string, tenantId: string): Promise<ChatSession | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching chat session:', error)
    return null
  }

  return data
}

export async function createChatSession(session: ChatSessionInsert): Promise<ChatSession | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert(session)
    .select()
    .single()

  if (error) {
    console.error('Error creating chat session:', error)
    return null
  }

  return data
}

export async function updateChatSession(sessionId: string, tenantId: string, updates: ChatSessionUpdate): Promise<ChatSession | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating chat session:', error)
    return null
  }

  return data
}

export async function deleteChatSession(sessionId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error deleting chat session:', error)
    return false
  }

  return true
}
