
/**
 * Shared Tenant Types
 * Used by both server and client-side tenant context utilities
 */

// Enhanced tenant context interface
export interface EnhancedTenantContext {
  tenantId: string
  tenantSubdomain: string
  tenantName?: string
  isPreview: boolean
  branchName?: string
  loading: boolean
  error?: string
}

// Server-side tenant context return type
export interface ServerTenantContext {
  tenantId: string
  tenantSubdomain: string
  isPreview: boolean
  branchName?: string
}

// Client-side partial context type
export type ClientTenantContext = Partial<Pick<EnhancedTenantContext, 'tenantSubdomain' | 'isPreview' | 'loading'>>
