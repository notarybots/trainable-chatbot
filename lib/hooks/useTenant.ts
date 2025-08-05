
'use client'

import { useEffect, useState } from 'react'

export interface Tenant {
  id: string
  name: string
  subdomain: string
  settings: any
  subscription_tier: string
  status: 'active' | 'inactive' | 'suspended'
}

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getTenant = async () => {
      try {
        // Extract tenant from URL or headers
        const hostname = window.location.hostname
        const subdomain = hostname.split('.')[0]
        
        // For development, use query param or default
        const urlParams = new URLSearchParams(window.location.search)
        const tenantId = urlParams.get('tenant') || 
          (subdomain !== 'localhost' && subdomain !== 'www' ? subdomain : 'demo')

        // TODO: Fetch tenant data from Supabase
        // For now, mock data
        setTenant({
          id: tenantId,
          name: `${tenantId.charAt(0).toUpperCase() + tenantId.slice(1)} Corp`,
          subdomain: tenantId,
          settings: {},
          subscription_tier: 'pro',
          status: 'active'
        })
      } catch (error) {
        console.error('Error fetching tenant:', error)
      } finally {
        setLoading(false)
      }
    }

    getTenant()
  }, [])

  return { tenant, loading }
}
