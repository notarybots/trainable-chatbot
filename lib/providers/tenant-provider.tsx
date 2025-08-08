
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from './supabase-provider'
import { getClientTenantContext } from '@/lib/tenant-context'
import type { EnhancedTenantContext } from '@/lib/types/tenant'
import type { Database } from '@/lib/types/database'

type Tenant = Database['public']['Tables']['tenants']['Row']

// Legacy context for backward compatibility
type LegacyTenantContext = {
  tenant: Tenant | null
  loading: boolean
  switchTenant: (tenantId: string) => void
}

// Enhanced context
const EnhancedContext = createContext<EnhancedTenantContext | undefined>(undefined)
const LegacyContext = createContext<LegacyTenantContext | undefined>(undefined)

export default function TenantProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [enhancedContext, setEnhancedContext] = useState<EnhancedTenantContext>({
    tenantId: '',
    tenantSubdomain: '',
    isPreview: false,
    loading: true
  })
  const { supabase, user } = useSupabase()

  const switchTenant = (tenantId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tenant', tenantId)
    window.location.href = url.toString()
  }

  useEffect(() => {
    async function loadTenantContext() {
      try {
        // Get client-side context first
        const clientContext = getClientTenantContext()
        
        if (!clientContext.tenantSubdomain) {
          setEnhancedContext(prev => ({
            ...prev,
            loading: false,
            error: 'No tenant context available'
          }))
          return
        }

        // Fetch full tenant details from database
        const { data: fetchedTenant, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('subdomain', clientContext.tenantSubdomain)
          .single()

        if (error) {
          console.error('Error fetching tenant:', error)
          
          // Fallback to demo tenant for backward compatibility
          const { data: fallback } = await supabase
            .from('tenants')
            .select('*')
            .eq('subdomain', 'demo')
            .single()
          
          if (fallback) {
            setTenant(fallback)
            setEnhancedContext({
              tenantId: fallback.id,
              tenantSubdomain: fallback.subdomain,
              tenantName: fallback.name,
              isPreview: clientContext.isPreview || false,
              branchName: (fallback.settings as any)?.branch || undefined,
              loading: false,
              error: 'Fallback to demo tenant'
            })
          } else {
            setEnhancedContext(prev => ({
              ...prev,
              loading: false,
              error: 'Failed to fetch tenant details'
            }))
          }
          return
        }

        // Set both legacy and enhanced context
        setTenant(fetchedTenant)
        setEnhancedContext({
          tenantId: fetchedTenant.id,
          tenantSubdomain: fetchedTenant.subdomain,
          tenantName: fetchedTenant.name,
          isPreview: clientContext.isPreview || false,
          branchName: (fetchedTenant.settings as any)?.branch || undefined,
          loading: false
        })
      } catch (error) {
        console.error('Error loading tenant context:', error)
        setEnhancedContext(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load tenant context'
        }))
      }
    }

    if (supabase) {
      loadTenantContext()
    } else {
      setEnhancedContext(prev => ({ ...prev, loading: false }))
    }
  }, [user, supabase])

  const legacyContextValue: LegacyTenantContext = {
    tenant,
    loading: enhancedContext.loading,
    switchTenant
  }

  return (
    <LegacyContext.Provider value={legacyContextValue}>
      <EnhancedContext.Provider value={enhancedContext}>
        {children}
      </EnhancedContext.Provider>
    </LegacyContext.Provider>
  )
}

// Legacy hook for backward compatibility
export const useTenant = () => {
  const context = useContext(LegacyContext)
  if (context === undefined) {
    throw new Error('useTenant must be used inside TenantProvider')
  }
  return context
}

// Enhanced hook
export const useEnhancedTenant = () => {
  const context = useContext(EnhancedContext)
  if (context === undefined) {
    throw new Error('useEnhancedTenant must be used inside TenantProvider')
  }
  return context
}

// Main hook - returns enhanced context
export const useTenantContext = () => {
  const context = useContext(EnhancedContext)
  if (context === undefined) {
    throw new Error('useTenantContext must be used inside TenantProvider')
  }
  return context
}
