
'use client'

import { useSupabase } from '@/lib/providers/supabase-provider'
import { ChatContainer } from "@/components/chat/chat-container"
import { LoginForm } from "@/components/auth/login-form"
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  MessageSquare,
  Brain,
  Database,
  LogOut
} from 'lucide-react'

export function HomeContent() {
  const { user, loading, signOut } = useSupabase()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center mb-4">
              <Bot className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">AI Chatbot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />
  }

  // Show main app if authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">AI Chatbot</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {user.email}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signOut()}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bot className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Multi-Tenant AI Chatbot
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Intelligent conversations powered by advanced AI
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
              <CardTitle className="text-lg">Smart Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Engage in natural, contextual conversations with AI
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Brain className="h-6 w-6 text-green-600 mr-3" />
              <CardTitle className="text-lg">Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Access vast knowledge across multiple domains
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <Database className="h-6 w-6 text-purple-600 mr-3" />
              <CardTitle className="text-lg">Multi-Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Secure, isolated conversations for each user
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Start Chatting</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ChatContainer />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
