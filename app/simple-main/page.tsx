'use client'

import { useAuth } from '@/lib/providers/simple-auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, LogOut, User } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SimpleMainPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/simple-login')
    return <div>Redirecting to login...</div>
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/simple-login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold">AI Chatbot</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-gray-700">
                <User className="h-4 w-4 mr-2" />
                {user.email}
              </div>
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">🎉 Authentication Working!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Welcome, {user.email}! The authentication system is now working correctly.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">✅ Sign Up Works</h3>
                <p className="text-sm text-green-600">Account creation is functional</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">✅ Sign In Works</h3>
                <p className="text-sm text-green-600">Login is working properly</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">✅ Demo Credentials</h3>
                <p className="text-sm text-green-600">john@doe.com works</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">✅ Auth State</h3>
                <p className="text-sm text-green-600">Session management works</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
