
/**
 * Server-side Tenant Context for Environment-Based Tenant Isolation
 * 
 * This module provides utilities for managing tenant context based on environment
 * (production vs preview branches), enabling safe data separation between
 * production and preview branch deployments.
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ServerTenantContext } from '@/lib/types/tenant'

// Environment-based tenant identification
export function getBranchTenantId(): string {
  // For production, use the main tenant
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_GIT_COMMIT_REF) {
    return 'production'
  }

  // For preview branches, use branch name as tenant identifier
  const branchName = process.env.VERCEL_GIT_COMMIT_REF || 
                     process.env.BRANCH_NAME || 
                     process.env.VERCEL_ENV ||
                     'development'

  // Clean branch name for use as tenant identifier
  const cleanBranchName = branchName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) // Limit length

  // Add prefix to distinguish from production
  return `branch-${cleanBranchName}`
}

export function isPreviewEnvironment(): boolean {
  return process.env.VERCEL_ENV === 'preview' || 
         process.env.NODE_ENV !== 'production' ||
         Boolean(process.env.VERCEL_GIT_COMMIT_REF)
}

// Ensure tenant exists for current environment
export async function ensureTenantExists(): Promise<string> {
  const tenantSubdomain = getBranchTenantId()
  const supabase = createAdminClient()

  try {
    // Check if tenant already exists
    const { data: existingTenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, subdomain')
      .eq('subdomain', tenantSubdomain)
      .single()

    if (existingTenant && !fetchError) {
      return existingTenant.id
    }

    // Create tenant if it doesn't exist
    const tenantName = isPreviewEnvironment() 
      ? `Preview: ${process.env.VERCEL_GIT_COMMIT_REF || 'Development'}`
      : 'Production'

    const { data: newTenant, error: createError } = await supabase
      .from('tenants')
      .insert({
        name: tenantName,
        subdomain: tenantSubdomain,
        subscription_tier: 'pro',
        status: 'active',
        settings: {
          environment: isPreviewEnvironment() ? 'preview' : 'production',
          branch: process.env.VERCEL_GIT_COMMIT_REF || 'main',
          deployment_url: process.env.VERCEL_URL,
        }
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating tenant:', createError)
      throw new Error(`Failed to create tenant: ${createError.message}`)
    }

    console.log(`Created new tenant: ${tenantName} (${tenantSubdomain})`)
    return newTenant.id
  } catch (error) {
    console.error('Error ensuring tenant exists:', error)
    // Fallback to a default tenant ID format
    return tenantSubdomain
  }
}

// Get current tenant context
export async function getCurrentTenantContext(): Promise<ServerTenantContext> {
  const tenantSubdomain = getBranchTenantId()
  const isPreview = isPreviewEnvironment()
  const tenantId = await ensureTenantExists()

  return {
    tenantId,
    tenantSubdomain,
    isPreview,
    branchName: process.env.VERCEL_GIT_COMMIT_REF || process.env.BRANCH_NAME,
  }
}

// Utility to get tenant ID for database queries
export async function getCurrentTenantId(): Promise<string> {
  return await ensureTenantExists()
}
