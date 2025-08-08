
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from './supabase-provider'
import type { Database } from '@/lib/types/database'

type Tenant = Database['public']['Tables']['tenants']['Row']

type TenantContext = {
  tenant: Tenant | null
  loading: boolean
  switchTenant: (tenantId: string) => void
}

const Context = createContext<TenantContext | undefined>(undefined)

export default function TenantProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const { supabase, user } = useSupabase()

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getTenantFromURL = () => {
    if (typeof window === 'undefined') return 'demo'
    
    try {
      const hostname = window.location.hostname
      const subdomain = hostname.split('.')[0]
      
      // For development
      if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
        const urlParams = new URLSearchParams(window.location.search)
        return urlParams.get('tenant') || 'demo'
      }
      
      // For production with subdomains
      return subdomain !== 'www' ? subdomain : 'demo'
    } catch (error) {
      console.warn('Error getting tenant from URL:', error)
      return 'demo'
    }
  }

  const createMockTenant = (subdomain: string): Tenant => ({
    id: `mock-tenant-${subdomain}`,
    name: `Demo Tenant (${subdomain})`,
    subdomain: subdomain,
    settings: {},
    subscription_tier: 'free',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  const fetchTenant = async (subdomain: string) => {
    if (!isMounted) {
      setLoading(false)
      return
    }

    try {
      const response = await supabase
        ?.from?.('tenants')
        ?.select?.('*')
        ?.eq?.('subdomain', subdomain)
        ?.single?.()

      const { data, error } = response ?? { data: null, error: new Error('Supabase not configured') }

      if (error) {
        console.warn('Error fetching tenant:', error.message)
        
        // Check if it's a Supabase configuration error
        if (error.code === 'SUPABASE_NOT_CONFIGURED' || error.message?.includes('Supabase not configured')) {
          // Create a mock tenant for demo purposes
          const mockTenant = createMockTenant(subdomain)
          setTenant(mockTenant)
        } else {
          // Try fallback to demo tenant
          try {
            const fallbackResponse = await supabase
              ?.from?.('tenants')
              ?.select?.('*')
              ?.eq?.('subdomain', 'demo')
              ?.single?.()

            const { data: fallback, error: fallbackError } = fallbackResponse ?? { data: null, error: new Error('Supabase not configured') }
            
            if (fallbackError || !fallback) {
              // Create mock demo tenant
              const mockTenant = createMockTenant('demo')
              setTenant(mockTenant)
            } else {
              setTenant(fallback)
            }
          } catch (fallbackError) {
            console.warn('Error fetching fallback tenant:', fallbackError)
            const mockTenant = createMockTenant('demo')
            setTenant(mockTenant)
          }
        }
      } else {
        setTenant(data ?? createMockTenant(subdomain))
      }
    } catch (error) {
      console.warn('Error in fetchTenant:', error)
      const mockTenant = createMockTenant(subdomain)
      setTenant(mockTenant)
    } finally {
      setLoading(false)
    }
  }

  const switchTenant = (tenantId: string) => {
    if (typeof window === 'undefined') return
    
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tenant', tenantId)
      window.location.href = url.toString()
    } catch (error) {
      console.warn('Error switching tenant:', error)
    }
  }

  useEffect(() => {
    if (!isMounted) return

    // Always fetch tenant, regardless of user status for demo mode
    const tenantSubdomain = getTenantFromURL()
    fetchTenant(tenantSubdomain)
  }, [isMounted, user, supabase])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <Context.Provider value={{ tenant: null, loading: true, switchTenant: () => {} }}>
        {children}
      </Context.Provider>
    )
  }

  return (
    <Context.Provider value={{ tenant, loading, switchTenant }}>
      {children}
    </Context.Provider>
  )
}

export const useTenant = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useTenant must be used inside TenantProvider')
  }
  return context
}
