

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Conversation = Database['public']['Tables']['conversations']['Row']
type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export interface ConversationWithMessages extends Conversation {
  messages?: Array<{
    id: string
    role: string
    content: string
    metadata: any
    created_at: string
  }>
}

export async function getConversations(tenantId: string, userId: string): Promise<Conversation[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  return data || []
}

export async function getConversation(conversationId: string, tenantId: string): Promise<ConversationWithMessages | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (
        id,
        role,
        content,
        metadata,
        created_at
      )
    `)
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching conversation:', error)
    return null
  }

  return data
}

export async function createConversation(conversation: ConversationInsert): Promise<Conversation | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select()
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    
    // Check if it's a table not found error
    if (error.message?.includes('table') && error.message?.includes('conversations')) {
      console.error('MIGRATION REQUIRED: conversations table does not exist!')
      console.error('Please run the SQL script: create_tables_manually.sql in your Supabase dashboard')
    }
    
    // Check if it's an RLS policy error
    if (error.message?.includes('policy') || error.code === 'PGRST301') {
      console.error('RLS POLICY ERROR: User may not have permission to create conversations')
      console.error('Tenant ID:', conversation.tenant_id)
      console.error('User ID:', conversation.user_id)
    }
    
    return null
  }

  return data
}

export async function updateConversation(conversationId: string, tenantId: string, updates: ConversationUpdate): Promise<Conversation | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating conversation:', error)
    return null
  }

  return data
}

export async function deleteConversation(conversationId: string, tenantId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error deleting conversation:', error)
    return false
  }

  return true
}

export async function updateConversationTitle(conversationId: string, tenantId: string, title: string): Promise<Conversation | null> {
  return updateConversation(conversationId, tenantId, { 
    title, 
    updated_at: new Date().toISOString() 
  })
}

