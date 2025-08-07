
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/route-guard'
import { Card, CardContent } from '@/components/ui/card'
import { Bot, Loader2 } from 'lucide-react'

export function DashboardContent() {
  const router = useRouter()

  useEffect(() => {
    // Brief delay to ensure redirect loop is broken, then go to main page
    const timer = setTimeout(() => {
      console.log('📊 Dashboard: Redirecting to main page')
      router.replace('/')
    }, 1000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading Dashboard</h3>
              <p className="text-gray-600">
                Taking you to your AI chatbot interface...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
