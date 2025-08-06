

-- Phase 1: Conversation History Migration
-- This migration creates proper conversations and messages tables with RLS policies

-- First, let's rename chat_sessions to conversations for better semantic clarity
ALTER TABLE public.chat_sessions RENAME TO conversations_temp;

-- Create conversations table with improved structure
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for individual message storage
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate data from old structure to new structure
INSERT INTO public.conversations (id, tenant_id, user_id, title, metadata, created_at, updated_at)
SELECT 
  id,
  tenant_id,
  user_id,
  COALESCE(title, 'New Conversation'),
  COALESCE(metadata, '{}'),
  created_at,
  updated_at
FROM public.conversations_temp;

-- Migrate messages from JSONB array to individual rows
INSERT INTO public.messages (conversation_id, role, content, metadata, created_at)
SELECT 
  ct.id as conversation_id,
  (msg->>'role')::VARCHAR(20) as role,
  msg->>'content' as content,
  COALESCE(msg->'metadata', '{}') as metadata,
  COALESCE((msg->>'timestamp')::TIMESTAMP WITH TIME ZONE, ct.created_at) as created_at
FROM public.conversations_temp ct,
     jsonb_array_elements(ct.messages) as msg
WHERE jsonb_array_length(ct.messages) > 0;

-- Drop the temporary table
DROP TABLE public.conversations_temp;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_user ON public.conversations(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);

-- Add updated_at trigger for conversations
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS Policies
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own conversations" ON public.conversations
  FOR ALL USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Tenant admins can view all conversations in their tenant
CREATE POLICY "Tenant admins can view all tenant conversations" ON public.conversations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Messages RLS Policies
CREATE POLICY "Users can view messages from their conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE user_id = auth.uid() AND
      tenant_id IN (
        SELECT tenant_id FROM public.tenant_users 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage messages from their conversations" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE user_id = auth.uid() AND
      tenant_id IN (
        SELECT tenant_id FROM public.tenant_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Tenant admins can view all messages in their tenant
CREATE POLICY "Tenant admins can view all tenant messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.tenant_users 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Service role can manage all data (for admin functions)
CREATE POLICY "Service role can manage conversations" ON public.conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage messages" ON public.messages
  FOR ALL USING (auth.role() = 'service_role');

-- Insert sample conversation for demo tenant
DO $$
DECLARE
    demo_tenant_id UUID;
    demo_user_id UUID;
    sample_conversation_id UUID;
BEGIN
    -- Get demo tenant ID
    SELECT id INTO demo_tenant_id FROM public.tenants WHERE subdomain = 'demo';
    
    -- Create a demo user if it doesn't exist (this would normally be handled by auth)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'demo@example.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMye5sL8FVQ0N0QLZjUcEzUOjUDMUj8CsZG', -- password: demo123
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Create tenant_user relationship
    INSERT INTO public.tenant_users (tenant_id, user_id, role)
    VALUES (
        demo_tenant_id,
        '550e8400-e29b-41d4-a716-446655440000',
        'user'
    ) ON CONFLICT (tenant_id, user_id) DO NOTHING;
    
    -- Create sample conversation
    INSERT INTO public.conversations (id, tenant_id, user_id, title)
    VALUES (
        uuid_generate_v4(),
        demo_tenant_id,
        '550e8400-e29b-41d4-a716-446655440000',
        'Welcome to Your Trainable Chatbot!'
    ) RETURNING id INTO sample_conversation_id;
    
    -- Create sample messages
    INSERT INTO public.messages (conversation_id, role, content) VALUES
    (sample_conversation_id, 'user', 'Hello! Can you tell me about this chatbot?'),
    (sample_conversation_id, 'assistant', 'Hello! I''m your trainable AI chatbot powered by Voyage AI. I can help you with various tasks, answer questions, and learn from the knowledge base specific to your organization. This system supports multi-tenant architecture, so your conversations and data are completely isolated from other tenants. How can I assist you today?');
    
EXCEPTION WHEN OTHERS THEN
    -- If there's an error (like demo tenant doesn't exist), just continue
    NULL;
END $$;

