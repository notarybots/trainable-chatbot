
/**
 * Client-side Tenant Context Utilities
 */

import type { ClientTenantContext } from '@/lib/types/tenant'

// Client-side tenant detection (for components)
export function getClientTenantContext(): ClientTenantContext {
  if (typeof window === 'undefined') {
    return { loading: true }
  }

  // For client-side, we can't access server environment variables
  // Use URL parameters or localStorage as fallback
  const urlParams = new URLSearchParams(window.location.search)
  const tenantParam = urlParams.get('tenant')
  
  if (tenantParam) {
    return {
      tenantSubdomain: tenantParam,
      isPreview: tenantParam.startsWith('branch-'),
      loading: false
    }
  }

  // Default to demo for client-side when no specific tenant is detected
  return {
    tenantSubdomain: 'demo',
    isPreview: false,
    loading: false
  }
}

// Client-safe environment detection
export function isClientPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const tenantParam = urlParams.get('tenant')
  
  return Boolean(tenantParam && tenantParam.startsWith('branch-'))
}
