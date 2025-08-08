
/**
 * Centralized Tenant Context Exports
 * Provides clean barrel exports for all tenant-related functionality
 */

// Types
export type {
  EnhancedTenantContext,
  ServerTenantContext,
  ClientTenantContext
} from '@/lib/types/tenant'

// Client-side utilities (safe for browser)
export {
  getClientTenantContext,
  isClientPreviewEnvironment
} from '@/lib/tenant-context'

// Server-side utilities (Node.js only)
export {
  getBranchTenantId,
  isPreviewEnvironment,
  ensureTenantExists,
  getCurrentTenantContext,
  getCurrentTenantId
} from '@/lib/tenant-context-server'

// Database utilities
export {
  getTenant,
  getTenantBySubdomain,
  createTenant,
  updateTenant,
  listTenants
} from '@/lib/database/tenants'

// Provider hooks
export {
  default as TenantProvider,
  useTenant,
  useEnhancedTenant,
  useTenantContext
} from '@/lib/providers/tenant-provider'
