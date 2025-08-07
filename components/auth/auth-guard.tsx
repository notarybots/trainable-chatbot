

'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Loader2, Lock, Shield, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
  adminOnly?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  fallback,
  requireAuth = true,
  adminOnly = false,
  redirectTo 
}: AuthGuardProps) {
  const { loading, isAuthenticated, user, refreshSession } = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [refreshing, setRefreshing] = useState(false)

  // Handle intended destination after authentication with loop prevention
  useEffect(() => {
    if (!loading && isAuthenticated && requireAuth) {
      const redirect = searchParams?.get('redirect')
      
      // Validate redirect parameter
      if (redirect) {
        try {
          const decodedRedirect = decodeURIComponent(redirect)
          
          // Enhanced validation to prevent redirect loops
          const isValidRedirect = (
            decodedRedirect !== pathname &&
            decodedRedirect !== '/login' &&
            decodedRedirect !== '/auth' &&
            decodedRedirect.startsWith('/') &&
            !decodedRedirect.includes('..') // Path traversal protection
          )
          
          if (isValidRedirect) {
            console.log('AuthGuard: Redirecting to intended destination:', decodedRedirect)
            
            // Special handling for root path - redirect to dashboard instead
            const finalDestination = decodedRedirect === '/' ? '/dashboard' : decodedRedirect
            
            // Use replace to avoid back button issues
            router.replace(finalDestination)
          } else {
            console.warn('AuthGuard: Invalid redirect destination:', decodedRedirect)
          }
        } catch (error) {
          console.error('AuthGuard: Error processing redirect parameter:', error)
        }
      }
    }
  }, [loading, isAuthenticated, requireAuth, searchParams, pathname, router])

  const handleRefreshSession = async () => {
    setRefreshing(true)
    try {
      await refreshSession()
    } catch (error) {
      console.error('Failed to refresh session:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const getLoginPath = () => {
    if (redirectTo) return redirectTo
    
    // Store current path as intended destination with loop prevention
    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    
    // Don't add redirect parameter for certain paths to prevent loops
    if (
      pathname === '/' || 
      pathname === '/login' || 
      pathname === '/auth' ||
      searchParams?.get('redirect') // Already has redirect parameter
    ) {
      console.log('AuthGuard: Skipping redirect parameter for path:', pathname)
      return '/login'
    }
    
    return `/login?redirect=${encodeURIComponent(currentPath)}`
  }

  if (loading) {
    return fallback || <AuthLoadingState />
  }

  // Check if authentication is required
  if (requireAuth && !isAuthenticated) {
    return fallback || <AuthRequiredState loginPath={getLoginPath()} />
  }

  // Check for admin-only access
  if (adminOnly && isAuthenticated) {
    const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'
    if (!isAdmin) {
      return fallback || (
        <AdminRequiredState 
          onRefresh={handleRefreshSession} 
          refreshing={refreshing}
        />
      )
    }
  }

  return <>{children}</>
}

function AuthLoadingState() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Verifying Authentication
        </h2>
        <p className="text-gray-600">
          Please wait while we check your session...
        </p>
      </div>
    </div>
  )
}

function AuthRequiredState({ loginPath }: { loginPath: string }) {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold">
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Please sign in to access this page. You'll be redirected back here after signing in.
          </p>
          <Button asChild className="w-full">
            <Link href={loginPath}>
              <Shield className="h-4 w-4 mr-2" />
              Sign In
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function AdminRequiredState({ 
  onRefresh, 
  refreshing 
}: { 
  onRefresh: () => void
  refreshing: boolean 
}) {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-bold">
            Admin Access Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            This page requires administrator privileges. Please contact your system administrator if you believe this is an error.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={onRefresh} 
              disabled={refreshing}
              variant="outline"
              className="flex-1"
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Session
                </>
              )}
            </Button>
            <Button asChild variant="default" className="flex-1">
              <Link href="/">
                <Bot className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Route-specific guard components
export function ChatGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} redirectTo="/login">
      {children}
    </AuthGuard>
  )
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} adminOnly={true}>
      {children}
    </AuthGuard>
  )
}

export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={false}>
      {children}
    </AuthGuard>
  )
}
