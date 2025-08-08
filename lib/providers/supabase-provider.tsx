
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [supabase] = useState(() => createClient()) // Memoize client creation

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || !supabase) return

    const getUser = async () => {
      try {
        const result = await supabase?.auth?.getUser?.()
        if (result?.data?.user) {
          setUser(result.data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.warn('Error getting user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    let subscription: any = null;
    
    try {
      if (supabase?.auth?.onAuthStateChange) {
        const authStateChange = supabase.auth.onAuthStateChange(
          (event: string, session: any) => {
            try {
              setUser(session?.user ?? null)
              setLoading(false)
            } catch (error) {
              console.warn('Error in auth state change handler:', error)
              setUser(null)
              setLoading(false)
            }
          }
        )
        subscription = authStateChange?.data?.subscription;
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.warn('Error setting up auth state change:', error)
      setLoading(false)
    }

    return () => {
      try {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.warn('Error unsubscribing from auth state change:', error)
      }
    }
  }, [isMounted, supabase])

  // Prevent hydration mismatch by not rendering with real data until mounted
  if (!isMounted) {
    return (
      <Context.Provider value={{ supabase: supabase as any, user: null, loading: true }}>
        {children}
      </Context.Provider>
    )
  }

  return (
    <Context.Provider value={{ supabase: supabase as any, user, loading }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}
