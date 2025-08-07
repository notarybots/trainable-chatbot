
'use client'

import React, { ReactNode } from 'react'
import { useSupabase } from '@/lib/providers/supabase-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Loader2 } from 'lucide-react'

interface SafeSupabaseWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * SafeSupabaseWrapper - Handles SupabaseProvider context errors gracefully
 * 
 * This component catches the "useSupabase must be used within a SupabaseProvider" error
 * that occurs during build-time static generation and provides a fallback UI.
 */
export function SafeSupabaseWrapper({ children, fallback }: SafeSupabaseWrapperProps) {
  try {
    // Try to access the Supabase context
    const context = useSupabase()
    return <>{children}</>
  } catch (error) {
    // If context is not available (during build or provider missing), show fallback
    if (error instanceof Error && error.message.includes('useSupabase must be used within a SupabaseProvider')) {
      return fallback || (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center mb-4">
                <Bot className="h-12 w-12 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">AI Chatbot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Initializing application...</p>
            </CardContent>
          </Card>
        </div>
      )
    }
    // Re-throw other errors
    throw error
  }
}
