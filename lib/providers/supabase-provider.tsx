

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const supabase = createClient()

  // Initialize auth state with better session persistence
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...')
        
        // Get initial session with retry logic
        let retries = 3
        let initialSession = null
        let sessionError = null

        while (retries > 0 && !initialSession && !sessionError) {
          try {
            const { data: { session }, error } = await supabase.auth.getSession()
            initialSession = session
            sessionError = error
            
            if (!session && !error && retries > 1) {
              // Wait a bit and retry if no session and no error
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            break
          } catch (err) {
            retries--
            if (retries === 0) {
              sessionError = err
            } else {
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }
        }
        
        if (sessionError) {
          console.error('❌ Error getting initial session:', sessionError)
        }

        if (isMounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setMounted(true)
          
          // Set loading to false after state is updated
          setTimeout(() => {
            if (isMounted) {
              setLoading(false)
            }
          }, 50) // Reduced timeout for faster loading

          console.log('✅ Auth initialized:', {
            hasSession: !!initialSession,
            hasUser: !!initialSession?.user,
            userEmail: initialSession?.user?.email,
            loading: false
          })
        }
      } catch (error) {
        console.error('❌ Error in auth initialization:', error)
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

  // Enhanced auth state change listener
  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`🔔 Auth state change: ${event}`, {
          hasSession: !!currentSession,
          userEmail: currentSession?.user?.email,
          timestamp: new Date().toISOString()
        })
        
        if (!isMounted) return

        // Handle different auth events with improved reliability
        switch (event) {
          case 'INITIAL_SESSION':
            // Handle initial session load
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            setLoading(false)
            console.log('📱 Initial session loaded')
            break

          case 'SIGNED_IN':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            setLoading(false)
            console.log('✅ User signed in successfully')
            
            // Add delay to ensure state propagation before any redirects
            setTimeout(() => {
              console.log('🔄 Auth state propagated after sign-in')
            }, 50)
            break

          case 'SIGNED_OUT':
            setSession(null)
            setUser(null)
            setLoading(false)
            console.log('👋 User signed out')
            
            // Clear any cached data and redirect to login
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname
                if (currentPath !== '/login' && !currentPath.startsWith('/auth')) {
                  router.push('/login')
                }
              }
            }, 100)
            break

          case 'TOKEN_REFRESHED':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            console.log('🔄 Token refreshed successfully')
            break

          case 'USER_UPDATED':
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            console.log('👤 User profile updated')
            break

          default:
            // Handle any other events
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            if (loading) {
              setLoading(false)
            }
            console.log(`⚡ Auth event: ${event}`)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth, router, loading])

  const signOut = async () => {
    console.log('🚪 Signing out user...')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Error signing out:', error)
        throw error
      } else {
        setUser(null)
        setSession(null)
        console.log('✅ Sign out successful')
        
        // Clear any client-side cache
        if (typeof window !== 'undefined') {
          // Clear localStorage if needed
          localStorage.removeItem('supabase-auth-token')
          localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1] + '-auth-token')
        }
        
        // Redirect to login
        setTimeout(() => {
          router.push('/login')
        }, 100)
      }
    } catch (error) {
      console.error('❌ Error in signOut:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    console.log('🔄 Refreshing session...')
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('❌ Error refreshing session:', error)
        throw error
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        console.log('✅ Session refreshed successfully')
      }
    } catch (error) {
      console.error('❌ Error in refreshSession:', error)
      throw error
    }
  }

  const isAuthenticated = !!(session && user)

  const value = {
    supabase,
    user,
    session,
    loading: loading || !mounted, // Include mounted state in loading
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
