
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useSupabase } from './supabase-provider'
import type { Database } from '@/lib/types/database'

type Tenant = Database['public']['Tables']['tenants']['Row']

type TenantContext = {
  tenant: Tenant | null
  loading: boolean
  error: string | null
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
  const [error, setError] = useState<string | null>(null)
  const { supabase, user, isAuthenticated, loading: authLoading } = useSupabase()

  const getTenantFromURL = () => {
    if (typeof window === 'undefined') return 'demo'
    
    const hostname = window.location.hostname
    const subdomain = hostname.split('.')[0]
    
    // For development
    if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('tenant') || 'demo'
    }
    
    // For production with subdomains
    return subdomain !== 'www' ? subdomain : 'demo'
  }

  const fetchTenant = async (subdomain: string) => {
    try {
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (fetchError) {
        console.warn('Error fetching tenant:', fetchError)
        // Fallback to demo tenant
        const { data: fallback, error: fallbackError } = await supabase
          .from('tenants')
          .select('*')
          .eq('subdomain', 'demo')
          .single()
        
        if (fallbackError) {
          setError('Failed to load tenant configuration')
          console.error('Error loading demo tenant:', fallbackError)
        } else {
          setTenant(fallback)
          console.log('Loaded fallback tenant:', fallback?.name)
        }
      } else {
        setTenant(data)
        console.log('Loaded tenant:', data?.name)
      }
    } catch (error) {
      console.error('Error in fetchTenant:', error)
      setError('Failed to load tenant configuration')
    } finally {
      setLoading(false)
    }
  }

  const switchTenant = (tenantId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tenant', tenantId)
    window.location.href = url.toString()
  }

  useEffect(() => {
    // Don't load tenant until auth is resolved
    if (authLoading) {
      return
    }

    if (isAuthenticated) {
      const tenantSubdomain = getTenantFromURL()
      fetchTenant(tenantSubdomain)
    } else {
      // User not authenticated, clear tenant state
      setTenant(null)
      setLoading(false)
      setError(null)
    }
  }, [user, isAuthenticated, authLoading, supabase])

  return (
    <Context.Provider value={{ tenant, loading, error, switchTenant }}>
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
