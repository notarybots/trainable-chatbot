
'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { loading, isAuthenticated } = useSupabase()

  if (loading) {
    return fallback || <AuthLoadingState />
  }

  if (!isAuthenticated) {
    return fallback || <AuthRequiredState />
  }

  return <>{children}</>
}

function AuthLoadingState() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Loading...
        </h2>
        <p className="text-gray-600">
          Checking authentication status
        </p>
      </div>
    </div>
  )
}

function AuthRequiredState() {
  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Lock className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold">
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Please sign in to access the chatbot interface.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">
              Sign In
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
