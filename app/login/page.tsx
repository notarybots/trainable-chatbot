

'use client'

import { useState, useEffect, Suspense } from 'react'
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
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

function LoginPageContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('john@doe.com') // Pre-filled for demo
  const [password, setPassword] = useState('johndoe123') // Pre-filled for demo
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { supabase, isAuthenticated, loading: authLoading } = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Clean URL on component mount and setup automatic cleanup
  useEffect(() => {
    const cleanup = useUrlCleanup()
    return cleanup
  }, [])
  
  // Get clean search parameters (without toolbar params)
  const getCleanParams = () => {
    return getCleanSearchParams()
  }

  // Simple and reliable post-authentication redirect
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Get clean parameters without toolbar interference
      const cleanParams = getCleanParams()
      const redirect = cleanParams.get('redirect')
      const destination = redirect && redirect !== '/login' ? redirect : '/'
      
      console.log('🔐 User authenticated, redirecting to:', destination)
      setLoading(true) // Keep loading active during redirect
      
      // Clean the URL before redirecting
      cleanCurrentUrl()
      
      // Simple redirect to proper default path
      router.replace(destination)
    }
  }, [isAuthenticated, authLoading, searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0] // Simple name from email
            }
          }
        })

        if (error) throw error
        
        console.log('✅ Sign-up successful, auth state will handle redirect')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        
        console.log('✅ Sign-in successful, auth state will handle redirect')
      }

      // Don't set loading to false here - keep it active during auth state change
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.message || 'Authentication failed')
      setLoading(false)
    }
  }

  const getRedirectDestination = () => {
    // Use clean parameters to avoid toolbar interference
    const cleanParams = getCleanParams()
    const redirect = cleanParams.get('redirect')
    if (redirect && redirect !== '/login' && redirect.startsWith('/')) {
      return redirect.replace('/', '')
    }
    return 'dashboard'
  }

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isAuthenticated ? 'Redirecting...' : 'Loading...'}
              </h3>
              <p className="text-gray-600">
                {isAuthenticated 
                  ? `Taking you to your ${getRedirectDestination()}...`
                  : 'Checking your authentication status...'
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? <UserPlus className="h-4 w-4 mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <Button
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                disabled={loading}
                className="p-0 h-auto font-medium"
              >
                {isSignUp ? 'Sign in here' : 'Create one here'}
              </Button>
            </div>

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
