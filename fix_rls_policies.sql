
-- =======================================================
-- RLS POLICY FIX SCRIPT
-- =======================================================
-- Run this script in your Supabase SQL Editor to fix infinite recursion
-- This script will drop all existing policies and create new non-circular ones
-- =======================================================

-- Drop all existing policies that may cause circular references
DROP POLICY IF EXISTS "Users can view their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Service role can manage tenants" ON public.tenants;

DROP POLICY IF EXISTS "Users can view their tenant users" ON public.tenant_users;
DROP POLICY IF EXISTS "Tenant admins can manage tenant users" ON public.tenant_users;

DROP POLICY IF EXISTS "Users can view their own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view knowledge base for their tenant" ON public.knowledge_base;
DROP POLICY IF EXISTS "Tenant admins can manage knowledge base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Service role can manage global knowledge base" ON public.knowledge_base;

-- Create completely new non-circular policies

-- Service role policies (complete access for service operations)
CREATE POLICY "Service role full access tenants" ON public.tenants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access tenant_users" ON public.tenant_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access chat_sessions" ON public.chat_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access knowledge_base" ON public.knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- Simple user-based policies (NO table self-references)
-- Tenants: All authenticated users can view all tenants (simplified for demo)
CREATE POLICY "Authenticated users can view all tenants" ON public.tenants
  FOR SELECT USING (auth.role() = 'authenticated');

-- Tenant Users: Users can only manage their own records
CREATE POLICY "Users manage own tenant_user records" ON public.tenant_users
  FOR ALL USING (auth.uid() = user_id);

-- Chat Sessions: Users can only manage their own sessions  
CREATE POLICY "Users manage own chat sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Knowledge Base: Simplified access - all authenticated users can view, service role manages
CREATE POLICY "Users can view knowledge base" ON public.knowledge_base
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify knowledge base (eliminates circular reference issues)
CREATE POLICY "Service role manages knowledge base" ON public.knowledge_base
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates knowledge base" ON public.knowledge_base  
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Service role deletes knowledge base" ON public.knowledge_base
  FOR DELETE USING (auth.role() = 'service_role');

-- =======================================================
-- POLICIES FIXED - NO MORE CIRCULAR REFERENCES
-- =======================================================
-- The infinite recursion error should now be resolved
-- Test by running: SELECT * FROM public.tenant_users LIMIT 1;
-- =======================================================
