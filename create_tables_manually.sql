
-- Manual SQL Script to Create Conversations and Messages Tables
-- Run this directly in Supabase SQL Editor

-- Step 1: Check if chat_sessions exists and rename it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_sessions') THEN
        EXECUTE 'ALTER TABLE public.chat_sessions RENAME TO conversations_temp';
        RAISE NOTICE 'Renamed chat_sessions to conversations_temp';
    ELSE
        RAISE NOTICE 'chat_sessions table does not exist, skipping rename';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error renaming chat_sessions: %', SQLERRM;
END $$;

-- Step 2: Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Migrate data from old structure if conversations_temp exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations_temp') THEN
        -- Migrate conversations
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
        
        RAISE NOTICE 'Data migration completed successfully';
    ELSE
        RAISE NOTICE 'No conversations_temp table found, skipping data migration';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error during data migration: %', SQLERRM;
END $$;

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_user ON public.conversations(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);

-- Step 6: Add updated_at trigger for conversations (if handle_updated_at function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'handle_updated_at') THEN
        EXECUTE 'CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
        RAISE NOTICE 'Updated_at trigger created successfully';
    ELSE
        RAISE NOTICE 'handle_updated_at function not found, skipping trigger creation';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating updated_at trigger: %', SQLERRM;
END $$;

-- Step 7: Enable Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "Users can manage their own conversations" ON public.conversations
  FOR ALL USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenant admins can view all tenant conversations" ON public.conversations;
CREATE POLICY "Tenant admins can view all tenant conversations" ON public.conversations
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role can manage conversations" ON public.conversations;
CREATE POLICY "Service role can manage conversations" ON public.conversations
  FOR ALL USING (auth.role() = 'service_role');

-- Step 9: Create RLS Policies for messages
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
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

DROP POLICY IF EXISTS "Users can manage messages from their conversations" ON public.messages;
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

DROP POLICY IF EXISTS "Tenant admins can view all tenant messages" ON public.messages;
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

DROP POLICY IF EXISTS "Service role can manage messages" ON public.messages;
CREATE POLICY "Service role can manage messages" ON public.messages
  FOR ALL USING (auth.role() = 'service_role');

-- Step 10: Create test users and sample data for demo tenant
DO $$
DECLARE
    demo_tenant_id UUID;
    demo_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    sample_conversation_id UUID;
BEGIN
    -- Get demo tenant ID
    SELECT id INTO demo_tenant_id FROM public.tenants WHERE subdomain = 'demo';
    
    IF demo_tenant_id IS NOT NULL THEN
        -- Create a demo user if it doesn't exist (this would normally be handled by auth)
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            demo_user_id,
            'demo@example.com',
            '$2a$10$N9qo8uLOickgx2ZMRZoMye5sL8FVQ0N0QLZjUcEzUOjUDMUj8CsZG', -- password: demo123
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Create tenant_user relationship
        INSERT INTO public.tenant_users (tenant_id, user_id, role)
        VALUES (
            demo_tenant_id,
            demo_user_id,
            'user'
        ) ON CONFLICT (tenant_id, user_id) DO NOTHING;
        
        -- Create additional test user
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
        VALUES (
            '550e8400-e29b-41d4-a716-446655440001',
            'test@example.com',
            '$2a$10$N9qo8uLOickgx2ZMRZoMye5sL8FVQ0N0QLZjUcEzUOjUDMUj8CsZG', -- password: demo123
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            'authenticated',
            'authenticated'
        ) ON CONFLICT (id) DO NOTHING;
        
        -- Create tenant_user relationship for test user
        INSERT INTO public.tenant_users (tenant_id, user_id, role)
        VALUES (
            demo_tenant_id,
            '550e8400-e29b-41d4-a716-446655440001',
            'admin'
        ) ON CONFLICT (tenant_id, user_id) DO NOTHING;
        
        -- Create sample conversation
        INSERT INTO public.conversations (tenant_id, user_id, title)
        VALUES (
            demo_tenant_id,
            demo_user_id,
            'Welcome to Your Trainable Chatbot!'
        ) RETURNING id INTO sample_conversation_id;
        
        -- Create sample messages
        IF sample_conversation_id IS NOT NULL THEN
            INSERT INTO public.messages (conversation_id, role, content) VALUES
            (sample_conversation_id, 'user', 'Hello! Can you tell me about this chatbot?'),
            (sample_conversation_id, 'assistant', 'Hello! I''m your trainable AI chatbot powered by Voyage AI. I can help you with various tasks, answer questions, and learn from the knowledge base specific to your organization. This system supports multi-tenant architecture, so your conversations and data are completely isolated from other tenants. How can I assist you today?');
            
            RAISE NOTICE 'Sample conversation and messages created successfully';
        END IF;
        
        RAISE NOTICE 'Demo users created:';
        RAISE NOTICE '- demo@example.com (user role)';
        RAISE NOTICE '- test@example.com (admin role)';
        RAISE NOTICE 'Password for both: demo123';
        
    ELSE
        RAISE NOTICE 'Demo tenant not found, skipping sample data creation';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating sample data: %', SQLERRM;
END $$;

-- Final verification
SELECT 'conversations' as table_name, count(*) as row_count FROM public.conversations
UNION ALL
SELECT 'messages' as table_name, count(*) as row_count FROM public.messages;
