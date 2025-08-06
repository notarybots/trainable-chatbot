

'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  adminOnly?: boolean
  redirectTo?: string
  fallback?: React.ReactNode
}

/**
 * RouteGuard - A comprehensive route protection component
 * 
 * Features:
 * - Protects routes based on authentication status
 * - Admin-only route protection
 * - Automatic redirects with intended destination handling
 * - Persistent session validation
 * - Smooth loading states
 */
export function RouteGuard({ 
  children, 
  requireAuth = true, 
  adminOnly = false,
  redirectTo,
  fallback
}: RouteGuardProps) {
  const { user, loading, isAuthenticated, refreshSession } = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const [validating, setValidating] = useState(true)
  const [sessionValidated, setSessionValidated] = useState(false)

  // Validate session on mount and when auth state changes
  useEffect(() => {
    const validateSession = async () => {
      if (loading) return

      setValidating(true)

      try {
        // If authentication is required but user is not authenticated
        if (requireAuth && !isAuthenticated) {
          const currentPath = pathname
          const loginPath = redirectTo || `/login?redirect=${encodeURIComponent(currentPath)}`
          
          console.log('RouteGuard: Redirecting unauthenticated user to login')
          router.replace(loginPath)
          return
        }

        // If admin access is required
        if (requireAuth && adminOnly && isAuthenticated) {
          const isAdmin = user?.user_metadata?.role === 'admin' || 
                          user?.app_metadata?.role === 'admin'
          
          if (!isAdmin) {
            console.log('RouteGuard: User lacks admin privileges')
            router.replace('/')
            return
          }
        }

        // Session is valid
        setSessionValidated(true)
        console.log('RouteGuard: Session validation successful')

      } catch (error) {
        console.error('RouteGuard: Session validation error:', error)
        
        // Try to refresh session
        if (requireAuth && isAuthenticated) {
          try {
            await refreshSession()
            setSessionValidated(true)
          } catch (refreshError) {
            console.error('RouteGuard: Session refresh failed:', refreshError)
            router.replace('/login')
          }
        }
      } finally {
        setValidating(false)
      }
    }

    validateSession()
  }, [
    user, 
    loading, 
    isAuthenticated, 
    requireAuth, 
    adminOnly, 
    pathname, 
    router, 
    redirectTo, 
    refreshSession
  ])

  // Show loading state during validation
  if (loading || validating) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    )
  }

  // Don't render children until session is validated
  if (requireAuth && !sessionValidated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Preparing your session...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth={true}>
      {children}
    </RouteGuard>
  )
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth={true} adminOnly={true}>
      {children}
    </RouteGuard>
  )
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard requireAuth={false}>
      {children}
    </RouteGuard>
  )
}
