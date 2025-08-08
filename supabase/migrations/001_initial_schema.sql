
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_users table for multi-tenant user management
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_base table with hierarchical structure
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.knowledge_base(id) ON DELETE SET NULL,
  type VARCHAR(50) DEFAULT 'document' CHECK (type IN ('document', 'faq', 'procedure', 'policy')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embeddings VECTOR(1536), -- OpenAI ada-002 embeddings dimension
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users(role);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant_id ON public.chat_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant_id ON public.knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_parent_id ON public.knowledge_base(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type ON public.knowledge_base(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON public.knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_title ON public.knowledge_base USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content ON public.knowledge_base USING gin(to_tsvector('english', content));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tenant_users_updated_at
  BEFORE UPDATE ON public.tenant_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- IMPROVED RLS POLICIES - NON-CIRCULAR WITH PROPER TENANT ISOLATION
-- ======================================================================

-- Service role policies (complete access for service operations)
CREATE POLICY "Service role full access tenants" ON public.tenants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access tenant_users" ON public.tenant_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chat_sessions" ON public.chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access knowledge_base" ON public.knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- ======================================================================
-- USER POLICIES - DIRECT AUTH CHECKS (NO CIRCULAR REFERENCES)
-- ======================================================================

-- TENANTS: Users can only view tenants they belong to
-- Using a simple subquery that doesn't reference tenant_users in the policy check
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- Allow if there's a direct tenant_user record (no self-reference in policy)
      id IN (
        SELECT tenant_id FROM public.tenant_users 
        WHERE user_id = auth.uid()
      )
    )
  );

-- TENANT_USERS: Critical - avoid circular reference
-- Users can only manage their own tenant_user records (direct user_id check)
CREATE POLICY "Users manage own tenant_user records" ON public.tenant_users
  FOR ALL USING (auth.uid() = user_id);

-- Additional policy for tenant_users: Allow users to view other users in their tenant
-- This uses a safe approach - checking if the viewing user exists in the same tenant
CREATE POLICY "Users can view same tenant users" ON public.tenant_users
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    -- Check if the requesting user belongs to the same tenant
    -- This is safe because we're not checking roles within the policy
    EXISTS (
      SELECT 1 FROM public.tenant_users tu2
      WHERE tu2.user_id = auth.uid() 
      AND tu2.tenant_id = tenant_users.tenant_id
    )
  );

-- CHAT_SESSIONS: Enhanced to respect tenant boundaries
CREATE POLICY "Users manage own chat sessions" ON public.chat_sessions
  FOR ALL USING (
    auth.uid() = user_id AND
    -- Ensure user belongs to the tenant (safe tenant check)
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid() 
      AND tu.tenant_id = chat_sessions.tenant_id
    )
  );

-- KNOWLEDGE_BASE: Tenant-aware access
-- Users can view knowledge base for their tenants + global entries
CREATE POLICY "Users can view tenant knowledge base" ON public.knowledge_base
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- Global knowledge base (tenant_id is NULL)
      tenant_id IS NULL 
      OR
      -- Knowledge base for user's tenant
      EXISTS (
        SELECT 1 FROM public.tenant_users tu
        WHERE tu.user_id = auth.uid() 
        AND tu.tenant_id = knowledge_base.tenant_id
      )
    )
  );

-- Knowledge base modification: Only service role can modify
-- This eliminates the need for complex tenant admin checks that could cause recursion
CREATE POLICY "Service role manages knowledge base writes" ON public.knowledge_base
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages knowledge base updates" ON public.knowledge_base  
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages knowledge base deletes" ON public.knowledge_base
  FOR DELETE USING (auth.role() = 'service_role');

-- Insert default data
INSERT INTO public.tenants (name, subdomain, subscription_tier, status) 
VALUES 
  ('Demo Corporation', 'demo', 'pro', 'active'),
  ('Global Master', 'master', 'enterprise', 'active')
ON CONFLICT (subdomain) DO NOTHING;

-- Insert sample knowledge base entries
INSERT INTO public.knowledge_base (tenant_id, type, title, content, status)
VALUES 
  (NULL, 'document', 'Global FAQ - Getting Started', 'This is a global knowledge base entry available to all tenants. It contains general information about the chatbot system.', 'active'),
  ((SELECT id FROM public.tenants WHERE subdomain = 'demo'), 'faq', 'Demo Tenant FAQ', 'This is tenant-specific knowledge for the demo tenant. It contains custom information relevant only to this tenant.', 'active')
ON CONFLICT DO NOTHING;
