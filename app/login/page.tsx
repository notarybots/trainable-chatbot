

'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/providers/supabase-provider'
import { cleanCurrentUrl, getCleanSearchParams, useUrlCleanup } from '@/lib/utils/url-cleanup'
import { PublicOnlyGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Bot, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  Loader2,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

type AuthState = 'idle' | 'loading' | 'success' | 'email-confirmation' | 'redirecting' | 'error'

// Redirect loop prevention
const MAX_REDIRECT_ATTEMPTS = 3
const REDIRECT_HISTORY_KEY = 'auth_redirect_history'

function LoginPageContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('john@doe.com') // Pre-filled for demo
  const [password, setPassword] = useState('johndoe123') // Pre-filled for demo
  const [showPassword, setShowPassword] = useState(false)
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [redirectAttempts, setRedirectAttempts] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const redirectTimeoutRef = useRef<NodeJS.Timeout>()
  
  const { supabase, isAuthenticated, loading: authLoading } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current)
    }
  }, [])

  // Clean URL on component mount and setup automatic cleanup
  useEffect(() => {
    const cleanup = useUrlCleanup()
    return cleanup
  }, [])
  
  // Redirect loop detection and prevention
  const checkRedirectHistory = () => {
    if (typeof window === 'undefined') return { canRedirect: true, history: [] }
    
    const historyJson = localStorage.getItem(REDIRECT_HISTORY_KEY)
    let history: { url: string; timestamp: number }[] = []
    
    try {
      history = historyJson ? JSON.parse(historyJson) : []
    } catch (e) {
      console.warn('Failed to parse redirect history:', e)
      history = []
    }
    
    // Clean old entries (older than 10 seconds)
    const now = Date.now()
    history = history.filter(entry => now - entry.timestamp < 10000)
    
    // Check for recent redirects to same URL
    const currentUrl = window.location.href
    const recentSameUrl = history.filter(entry => entry.url === currentUrl).length
    
    return {
      canRedirect: recentSameUrl < MAX_REDIRECT_ATTEMPTS,
      history,
      attempts: recentSameUrl
    }
  }
  
  const recordRedirectAttempt = (url: string) => {
    if (typeof window === 'undefined') return
    
    const { history } = checkRedirectHistory()
    const newEntry = { url, timestamp: Date.now() }
    const updatedHistory = [...history, newEntry]
    
    localStorage.setItem(REDIRECT_HISTORY_KEY, JSON.stringify(updatedHistory))
  }
  
  const clearRedirectHistory = () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(REDIRECT_HISTORY_KEY)
  }
  
  // Get clean search parameters (without toolbar params)
  const getCleanParams = () => {
    return getCleanSearchParams()
  }
  
  // Safe redirect parameter validation and decoding
  const getValidRedirectDestination = () => {
    try {
      const cleanParams = getCleanParams()
      const redirect = cleanParams.get('redirect')
      
      if (!redirect) return null
      
      // Decode URL-encoded redirect parameter
      let decodedRedirect: string
      try {
        decodedRedirect = decodeURIComponent(redirect)
      } catch (e) {
        console.warn('Failed to decode redirect parameter:', redirect, e)
        return null
      }
      
      // Validate redirect destination
      if (
        decodedRedirect === '/login' || 
        decodedRedirect === '/auth' || 
        !decodedRedirect.startsWith('/') ||
        decodedRedirect.includes('..') // Path traversal protection
      ) {
        console.warn('Invalid redirect destination:', decodedRedirect)
        return null
      }
      
      // Special handling for root path to prevent loops
      if (decodedRedirect === '/') {
        console.log('🔄 Root path redirect detected, using fallback')
        return '/dashboard' // Fallback to dashboard instead of root
      }
      
      return decodedRedirect
    } catch (error) {
      console.error('Error validating redirect destination:', error)
      return null
    }
  }

  // Handle post-authentication redirect with loop prevention
  useEffect(() => {
    if (!authLoading && isAuthenticated && authState !== 'redirecting') {
      console.log('🔐 User authenticated, preparing redirect...')
      setAuthState('redirecting')
      setSuccessMessage('Welcome! Taking you to the app...')
      
      // Clear any existing timeouts
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current)
      
      // Add small delay to show success message, then redirect
      redirectTimeoutRef.current = setTimeout(() => {
        const { canRedirect, attempts } = checkRedirectHistory()
        
        if (!canRedirect) {
          console.warn(`🚫 Redirect loop detected (${attempts} attempts), using fallback navigation`)
          setError('Redirect loop detected. Taking you to the dashboard instead.')
          clearRedirectHistory()
          
          // Direct navigation to dashboard as fallback
          setTimeout(() => {
            cleanCurrentUrl()
            router.replace('/dashboard')
          }, 2000)
          return
        }
        
        // Get validated redirect destination
        const validDestination = getValidRedirectDestination()
        const fallbackDestination = '/dashboard'
        const destination = validDestination || fallbackDestination
        
        console.log('🔐 Redirecting to:', destination, {
          validDestination,
          fallbackUsed: !validDestination,
          attempts
        })
        
        // Record redirect attempt
        const targetUrl = window.location.origin + destination
        recordRedirectAttempt(targetUrl)
        
        // Clear URL parameters and redirect
        cleanCurrentUrl()
        router.replace(destination)
      }, 1500) // Show success message for 1.5 seconds
    }
  }, [isAuthenticated, authLoading, authState, router])
  
  // Clear redirect history on successful authentication (prevent stale data)
  useEffect(() => {
    if (isAuthenticated && authState === 'success') {
      const timer = setTimeout(() => {
        clearRedirectHistory()
      }, 5000) // Clear after 5 seconds of successful auth
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, authState])

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }

  const isFormDisabled = () => {
    return authState === 'loading' || authState === 'success' || authState === 'redirecting'
  }

  const canToggleMode = () => {
    return authState === 'idle' || authState === 'error'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setAuthState('loading')

    // Set a timeout to prevent infinite loading states
    resetTimeout()
    timeoutRef.current = setTimeout(() => {
      console.warn('⏰ Authentication timeout after 15 seconds')
      setAuthState('error')
      setError('Authentication is taking longer than expected. Please try again.')
    }, 15000) // 15 second timeout

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0] // Simple name from email
            }
          }
        })

        resetTimeout() // Clear the timeout on success

        if (error) throw error

        console.log('✅ Sign-up successful:', { needsConfirmation: !data.session })
        
        if (data.session) {
          // User is immediately authenticated (e.g., email confirmation disabled)
          setAuthState('success')
          setSuccessMessage('Account created successfully!')
        } else {
          // Email confirmation required
          setAuthState('email-confirmation')
          setSuccessMessage('Account created! Please check your email for a confirmation link.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        resetTimeout() // Clear the timeout on success

        if (error) throw error
        
        console.log('✅ Sign-in successful')
        setAuthState('success')
        setSuccessMessage('Welcome back! Signing you in...')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      resetTimeout()
      setAuthState('error')
      
      // Provide user-friendly error messages
      let errorMessage = 'Authentication failed'
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.'
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    }
  }

  const getRedirectDestination = () => {
    // Use validated redirect destination for display purposes
    const validDestination = getValidRedirectDestination()
    if (validDestination) {
      // Remove leading slash for display (e.g., "/dashboard" -> "dashboard")
      return validDestination.replace('/', '') || 'main app'
    }
    return 'dashboard'
  }
  
  // Debug information logging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cleanParams = getCleanParams()
      const redirect = cleanParams.get('redirect')
      const { canRedirect, attempts } = checkRedirectHistory()
      
      console.log('🔍 Login Page Debug Info:', {
        currentUrl: window.location.href,
        redirectParam: redirect,
        decodedRedirect: redirect ? decodeURIComponent(redirect) : null,
        canRedirect,
        redirectAttempts: attempts,
        isAuthenticated,
        authLoading,
        authState
      })
    }
  }, [isAuthenticated, authLoading, authState])

  // Show loading state while checking auth or during redirect
  if (authLoading || authState === 'redirecting') {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {authState === 'redirecting' ? 'Redirecting...' : 'Loading...'}
              </h3>
              <p className="text-gray-600">
                {authState === 'redirecting' && successMessage
                  ? successMessage
                  : authLoading 
                    ? 'Checking your authentication status...'
                    : `Taking you to your ${getRedirectDestination()}...`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PublicOnlyGuard>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </CardTitle>
            <p className="text-gray-600">
              {isSignUp 
                ? 'Sign up to start using the AI chatbot'
                : `Sign in to access your chatbot ${getRedirectDestination()}`
              }
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isFormDisabled()}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isFormDisabled()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isFormDisabled()}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Success Message Display */}
              {successMessage && (authState === 'success' || authState === 'email-confirmation') && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                </Alert>
              )}

              {/* Error Display */}
              {error && authState === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Confirmation Info */}
              {authState === 'email-confirmation' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    A confirmation email has been sent to <strong>{email}</strong>. 
                    Please check your email and click the confirmation link to complete your account setup.
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={authState === 'loading' || authState === 'success' || authState === 'email-confirmation'}
              >
                {authState === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : authState === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    {isSignUp ? 'Account Created!' : 'Signed In!'}
                  </>
                ) : authState === 'email-confirmation' ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Check Your Email
                  </>
                ) : (
                  <>
                    {isSignUp ? <UserPlus className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Try Again Button for Email Confirmation */}
              {authState === 'email-confirmation' && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setAuthState('idle')
                    setSuccessMessage('')
                    setIsSignUp(false) // Switch to sign-in mode
                  }}
                  className="w-full mt-2"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  I've confirmed my email, sign me in
                </Button>
              )}
            </form>

            {/* Toggle Mode */}
            {canToggleMode() && (
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError('')
                    setSuccessMessage('')
                    setAuthState('idle')
                  }}
                  disabled={!canToggleMode()}
                  className="p-0 h-auto font-medium"
                >
                  {isSignUp ? 'Sign in here' : 'Create one here'}
                </Button>
              </div>
            )}

            {/* Demo Credentials Notice */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 text-center">
                <Bot className="h-4 w-4 inline mr-1" />
                Demo credentials are pre-filled for quick testing
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicOnlyGuard>
  )
}

function LoginPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="text-center">
            <Skeleton className="h-4 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  )
}
