
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  CheckCircle
} from 'lucide-react'

type AuthState = 'idle' | 'loading' | 'success' | 'error'

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('john@doe.com') // Demo credentials
  const [password, setPassword] = useState('johndoe123') // Demo credentials
  const [showPassword, setShowPassword] = useState(false)
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const { supabase } = useSupabase()
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (authState === 'loading') return
    
    setAuthState('loading')
    setError('')
    setSuccessMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user?.email_confirmed_at) {
          setSuccessMessage('Account created successfully!')
          setAuthState('success')
          // Router will be handled by the main app when user state updates
        } else {
          setSuccessMessage('Please check your email to verify your account.')
          setAuthState('success')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setSuccessMessage('Welcome back!')
        setAuthState('success')
        // Router will be handled by the main app when user state updates
      }
    } catch (error: any) {
      console.error('Authentication error:', error)
      setError(error.message || 'Authentication failed')
      setAuthState('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <Bot className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            AI Chatbot
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your email"
                  required
                  disabled={authState === 'loading'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter your password"
                  required
                  disabled={authState === 'loading'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={authState === 'loading'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-green-200 text-green-800 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={authState === 'loading' || authState === 'success'}
            >
              {authState === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </>
              ) : authState === 'success' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Success!
                </>
              ) : (
                <>
                  {isSignUp ? (
                    <UserPlus className="mr-2 h-4 w-4" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </>
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setSuccessMessage('')
                  setAuthState('idle')
                }}
                disabled={authState === 'loading'}
                className="text-sm"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500 space-y-1">
              <p className="font-medium">Demo Credentials:</p>
              <p>Email: john@doe.com</p>
              <p>Password: johndoe123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
