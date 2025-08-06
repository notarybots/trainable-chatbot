
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
        }

        if (isMounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setMounted(true)
          
          // Only set loading to false after we have the initial state
          setTimeout(() => {
            if (isMounted) {
              setLoading(false)
            }
          }, 100)
        }

        console.log('Auth initialized:', {
          hasSession: !!initialSession,
          hasUser: !!initialSession?.user,
          userEmail: initialSession?.user?.email
        })
      } catch (error) {
        console.error('Error in auth initialization:', error)
        if (isMounted) {
          setLoading(false)
          setMounted(true)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [supabase.auth])

  // Listen for auth changes
  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state change:', event, {
          hasSession: !!currentSession,
          userEmail: currentSession?.user?.email
        })
        
        if (!isMounted) return

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            setLoading(false)
            console.log('✅ User signed in successfully')
            break

          case 'SIGNED_OUT':
            setSession(null)
            setUser(null)
            setLoading(false)
            console.log('👋 User signed out')
            break

          case 'TOKEN_REFRESHED':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            console.log('🔄 Token refreshed')
            break

          case 'USER_UPDATED':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            console.log('👤 User updated')
            break

          default:
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signOut = async () => {
    console.log('Signing out user...')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      } else {
        setUser(null)
        setSession(null)
        console.log('✅ Sign out successful')
      }
    } catch (error) {
      console.error('Error in signOut:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    console.log('Refreshing session...')
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('Error refreshing session:', error)
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        console.log('✅ Session refreshed')
      }
    } catch (error) {
      console.error('Error in refreshSession:', error)
    }
  }

  const isAuthenticated = !!(session && user)

  const value = {
    supabase,
    user,
    session,
    loading: loading && mounted,
    isAuthenticated,
    signOut,
    refreshSession
  }

  return (
    <Context.Provider value={value}>
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
