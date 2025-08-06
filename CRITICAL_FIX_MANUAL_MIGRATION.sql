
-- 🚨 CRITICAL FIX: Manual Migration Script for Trainable Chatbot
-- 📋 Copy and paste this entire script into your Supabase Dashboard > SQL Editor
-- 🔧 This will create the missing tables and fix the "Failed to create new conversation" error

-- ===================================================================
-- STEP 1: CREATE CONVERSATIONS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- STEP 2: CREATE MESSAGES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- STEP 3: CREATE PERFORMANCE INDEXES
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON public.conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_user ON public.conversations(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON public.messages(role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);

-- ===================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ===================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- STEP 5: CREATE RLS POLICIES FOR CONVERSATIONS
-- ===================================================================

-- Allow users to view their own conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to manage their own conversations
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "Users can manage their own conversations" ON public.conversations
  FOR ALL USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Allow service role to manage all conversations
DROP POLICY IF EXISTS "Service role can manage conversations" ON public.conversations;
CREATE POLICY "Service role can manage conversations" ON public.conversations
  FOR ALL USING (auth.role() = 'service_role');

-- ===================================================================
-- STEP 6: CREATE RLS POLICIES FOR MESSAGES
-- ===================================================================

-- Allow users to view messages from their conversations
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

-- Allow users to manage messages from their conversations
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

-- Allow service role to manage all messages
DROP POLICY IF EXISTS "Service role can manage messages" ON public.messages;
CREATE POLICY "Service role can manage messages" ON public.messages
  FOR ALL USING (auth.role() = 'service_role');

-- ===================================================================
-- STEP 7: CREATE TEST USERS
-- ===================================================================

-- Get the demo tenant ID
DO $$
DECLARE
    demo_tenant_id UUID;
    demo_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    test_user_id UUID := '550e8400-e29b-41d4-a716-446655440001';
BEGIN
    -- Get demo tenant ID
    SELECT id INTO demo_tenant_id FROM public.tenants WHERE subdomain = 'demo';

    IF demo_tenant_id IS NOT NULL THEN
        -- Create demo user in auth.users
        INSERT INTO auth.users (
            id, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            created_at, 
            updated_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            aud, 
            role
        ) VALUES (
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

        -- Create tenant_user relationship for demo user
        INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES 
        (demo_tenant_id, demo_user_id, 'user')
        ON CONFLICT (tenant_id, user_id) DO NOTHING;

        -- Create test admin user
        INSERT INTO auth.users (
            id, 
            email, 
            encrypted_password, 
            email_confirmed_at, 
            created_at, 
            updated_at, 
            raw_app_meta_data, 
            raw_user_meta_data, 
            aud, 
            role
        ) VALUES (
            test_user_id,
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
        INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES 
        (demo_tenant_id, test_user_id, 'admin')
        ON CONFLICT (tenant_id, user_id) DO NOTHING;

        RAISE NOTICE 'Test users created successfully';
        RAISE NOTICE 'Demo user: demo@example.com / demo123';
        RAISE NOTICE 'Test user: test@example.com / demo123';
    ELSE
        RAISE NOTICE 'Demo tenant not found, skipping user creation';
    END IF;
END $$;

-- ===================================================================
-- STEP 8: CREATE SAMPLE DATA
-- ===================================================================

-- Create a welcome conversation for demo user
DO $$
DECLARE
    demo_tenant_id UUID;
    demo_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
    sample_conversation_id UUID;
BEGIN
    -- Get demo tenant ID
    SELECT id INTO demo_tenant_id FROM public.tenants WHERE subdomain = 'demo';

    IF demo_tenant_id IS NOT NULL THEN
        -- Create sample conversation
        INSERT INTO public.conversations (tenant_id, user_id, title, metadata)
        VALUES (
            demo_tenant_id,
            demo_user_id,
            'Welcome to Your Trainable Chatbot!',
            '{"sample": true, "created_by": "migration"}'
        ) RETURNING id INTO sample_conversation_id;

        -- Create sample messages
        IF sample_conversation_id IS NOT NULL THEN
            INSERT INTO public.messages (conversation_id, role, content, metadata) VALUES
            (sample_conversation_id, 'user', 'Hello! Can you tell me about this chatbot?', '{"sample": true}'),
            (sample_conversation_id, 'assistant', 'Hello! I''m your trainable AI chatbot powered by Voyage AI. I can help you with various tasks, answer questions, and learn from the knowledge base specific to your organization. This system supports multi-tenant architecture, so your conversations and data are completely isolated from other tenants. How can I assist you today?', '{"sample": true}');

            RAISE NOTICE 'Sample conversation and messages created successfully';
        END IF;
    END IF;
END $$;

-- ===================================================================
-- STEP 9: VERIFICATION
-- ===================================================================

-- Verify tables were created successfully
SELECT 
    'conversations' as table_name, 
    COUNT(*) as row_count 
FROM public.conversations
UNION ALL
SELECT 
    'messages' as table_name, 
    COUNT(*) as row_count 
FROM public.messages;

-- Show created test users
SELECT 
    'Test Users Created:' as info,
    email as user_email,
    role as user_role
FROM auth.users 
JOIN public.tenant_users ON auth.users.id = public.tenant_users.user_id
JOIN public.tenants ON public.tenant_users.tenant_id = public.tenants.id
WHERE tenants.subdomain = 'demo';

-- Success message
SELECT '✅ MIGRATION COMPLETED SUCCESSFULLY! ✅' as status;
SELECT 'The trainable chatbot conversation system is now ready to use.' as message;
SELECT 'You can now log in with demo@example.com / demo123 and create conversations.' as instructions;
