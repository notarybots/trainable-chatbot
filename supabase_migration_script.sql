
-- =======================================================
-- TRAINABLE CHATBOT - DATABASE MIGRATION SCRIPT
-- =======================================================
-- Run this script in your Supabase SQL Editor
-- This will create all necessary tables, indexes, and security policies
-- =======================================================

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

-- Tenants policies (admin access only for tenant management)
CREATE POLICY "Users can view their tenant" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage tenants" ON public.tenants
  FOR ALL USING (auth.role() = 'service_role');

-- Tenant users policies
CREATE POLICY "Users can view their tenant users" ON public.tenant_users
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage tenant users" ON public.tenant_users
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Chat sessions policies
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
  FOR SELECT USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own chat sessions" ON public.chat_sessions
  FOR ALL USING (
    user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- Knowledge base policies
CREATE POLICY "Users can view knowledge base for their tenant" ON public.knowledge_base
  FOR SELECT USING (
    tenant_id IS NULL OR  -- Global knowledge base
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins can manage knowledge base" ON public.knowledge_base
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users 
      WHERE user_id = auth.uid() AND role IN ('admin')
    )
  );

CREATE POLICY "Service role can manage global knowledge base" ON public.knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

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

-- =======================================================
-- MIGRATION COMPLETE
-- =======================================================
-- After running this script, you should see the following tables:
-- ✅ tenants (with demo and master tenants)
-- ✅ tenant_users (empty, ready for registrations)
-- ✅ chat_sessions (empty, ready for conversations)
-- ✅ knowledge_base (with sample entries)
-- =======================================================
