

'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SessionGuardProps {
  children: React.ReactNode
  checkInterval?: number // ms
  fallback?: React.ReactNode
}

/**
 * SessionGuard - Monitors and maintains session health
 * 
 * Features:
 * - Periodic session validation
 * - Automatic session refresh on expiry
 * - Session health monitoring
 * - Graceful handling of session errors
 */
export function SessionGuard({ 
  children, 
  checkInterval = 60000, // Check every minute
  fallback 
}: SessionGuardProps) {
  const { user, session, loading, isAuthenticated, refreshSession } = useSupabase()
  const [sessionHealth, setSessionHealth] = useState<'healthy' | 'warning' | 'expired'>('healthy')
  const [refreshing, setRefreshing] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  // Monitor session health
  useEffect(() => {
    if (!isAuthenticated || loading) return

    const checkSessionHealth = () => {
      if (!session) {
        setSessionHealth('expired')
        return
      }

      const now = new Date()
      const expiresAt = new Date(session.expires_at! * 1000)
      const timeToExpiry = expiresAt.getTime() - now.getTime()

      // Warn if session expires within 5 minutes
      if (timeToExpiry < 5 * 60 * 1000 && timeToExpiry > 0) {
        setSessionHealth('warning')
      } else if (timeToExpiry <= 0) {
        setSessionHealth('expired')
      } else {
        setSessionHealth('healthy')
      }

      setLastCheck(now)
    }

    // Check immediately
    checkSessionHealth()

    // Set up periodic checks
    const interval = setInterval(checkSessionHealth, checkInterval)

    return () => clearInterval(interval)
  }, [session, isAuthenticated, loading, checkInterval])

  // Auto-refresh session when in warning state
  useEffect(() => {
    if (sessionHealth === 'warning' && !refreshing) {
      console.log('SessionGuard: Session nearing expiry, auto-refreshing...')
      handleRefreshSession()
    }
  }, [sessionHealth, refreshing])

  const handleRefreshSession = async () => {
    if (refreshing) return

    setRefreshing(true)
    try {
      await refreshSession()
      setSessionHealth('healthy')
      console.log('SessionGuard: Session refreshed successfully')
    } catch (error) {
      console.error('SessionGuard: Failed to refresh session:', error)
      setSessionHealth('expired')
    } finally {
      setRefreshing(false)
    }
  }

  // Show loading state during initial auth
  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  // Show session expired state
  if (sessionHealth === 'expired' && isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-bold text-red-600">
              Session Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your session has expired. Please refresh your session to continue.
            </p>
            <Button 
              onClick={handleRefreshSession} 
              disabled={refreshing}
              className="w-full"
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing Session...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Session
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show session warning indicator (non-blocking)
  const showWarning = sessionHealth === 'warning' && isAuthenticated

  return (
    <>
      {showWarning && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-yellow-800">
                Session expires soon
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshSession}
                disabled={refreshing}
                className="ml-2 h-7"
              >
                {refreshing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {children}
    </>
  )
}
