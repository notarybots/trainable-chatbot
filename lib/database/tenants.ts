
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database'

type Tenant = Database['public']['Tables']['tenants']['Row']
type TenantInsert = Database['public']['Tables']['tenants']['Insert']
type TenantUpdate = Database['public']['Tables']['tenants']['Update']

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data
}

export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (error) {
    console.error('Error fetching tenant by subdomain:', error)
    return null
  }

  return data
}

export async function createTenant(tenant: TenantInsert): Promise<Tenant | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant)
    .select()
    .single()

  if (error) {
    console.error('Error creating tenant:', error)
    return null
  }

  return data
}

export async function updateTenant(tenantId: string, updates: TenantUpdate): Promise<Tenant | null> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating tenant:', error)
    return null
  }

  return data
}

export async function listTenants(): Promise<Tenant[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing tenants:', error)
    return []
  }

  return data || []
}
