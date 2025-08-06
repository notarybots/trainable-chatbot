

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database'

type Message = Database['public']['Tables']['messages']['Row']
type MessageInsert = Database['public']['Tables']['messages']['Insert']
type MessageUpdate = Database['public']['Tables']['messages']['Update']

export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }

  return data || []
}

export async function createMessage(message: MessageInsert): Promise<Message | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  if (error) {
    console.error('Error creating message:', error)
    return null
  }

  return data
}

export async function createMessages(messages: MessageInsert[]): Promise<Message[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('messages')
    .insert(messages)
    .select()

  if (error) {
    console.error('Error creating messages:', error)
    return []
  }

  return data || []
}

export async function updateMessage(messageId: string, updates: MessageUpdate): Promise<Message | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single()

  if (error) {
    console.error('Error updating message:', error)
    return null
  }

  return data
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId)

  if (error) {
    console.error('Error deleting message:', error)
    return false
  }

  return true
}

export async function deleteMessages(conversationId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId)

  if (error) {
    console.error('Error deleting messages:', error)
    return false
  }

  return true
}

