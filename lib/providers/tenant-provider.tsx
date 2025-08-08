
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
  const { supabase, user } = useSupabase()

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
      const { data, error } = await supabase
        ?.from?.('tenants')
        ?.select?.('*')
        ?.eq?.('subdomain', subdomain)
        ?.single?.() ?? { data: null, error: new Error('Supabase not configured') }

      if (error) {
        console.error('Error fetching tenant:', error)
        // Fallback to demo tenant
        try {
          const { data: fallback } = await supabase
            ?.from?.('tenants')
            ?.select?.('*')
            ?.eq?.('subdomain', 'demo')
            ?.single?.() ?? { data: null, error: new Error('Supabase not configured') }
          setTenant(fallback ?? null)
        } catch (fallbackError) {
          console.error('Error fetching fallback tenant:', fallbackError)
          setTenant(null)
        }
      } else {
        setTenant(data ?? null)
      }
    } catch (error) {
      console.error('Error in fetchTenant:', error)
      setTenant(null)
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
    if (user) {
      const tenantSubdomain = getTenantFromURL()
      fetchTenant(tenantSubdomain)
    } else {
      setLoading(false)
    }
  }, [user, supabase])

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
