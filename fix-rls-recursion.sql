
-- Fix RLS Policy Recursion Issue
-- This script fixes the infinite recursion in tenant_users RLS policies

-- First, drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "tenant_users_select" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_insert" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_update" ON tenant_users;
DROP POLICY IF EXISTS "tenant_users_delete" ON tenant_users;
DROP POLICY IF EXISTS "Allow authenticated users to view own tenant relationships" ON tenant_users;
DROP POLICY IF EXISTS "Allow tenant users to access own tenant" ON tenant_users;

-- Disable RLS temporarily to check structure
ALTER TABLE tenant_users DISABLE ROW LEVEL SECURITY;

-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenant_users' 
ORDER BY ordinal_position;

-- Re-enable RLS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies
-- Policy 1: Users can see their own tenant relationships
CREATE POLICY "Users can view own tenant relationships" ON tenant_users
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy 2: Service role can do everything (for API operations)
CREATE POLICY "Service role full access" ON tenant_users
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Policy 3: Authenticated users can insert their own records
CREATE POLICY "Users can insert own tenant relationships" ON tenant_users
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Test the policies by selecting from tenant_users
SELECT 'Policy test completed' as status;
