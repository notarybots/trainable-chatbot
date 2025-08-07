

import { ProtectedRoute } from '@/components/auth/route-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatContainer } from "@/components/chat/chat-container"
import Link from 'next/link'
import { 
  Bot, 
  Settings, 
  Database, 
  Zap, 
  BarChart3,
  CheckCircle,
  MessageSquare,
  Brain
} from 'lucide-react'

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Bot className="h-16 w-16 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Multi-Tenant AI Chatbot
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful chatbot platform with Voyage AI embeddings, knowledge base integration, 
              and advanced multi-tenant architecture.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">System Status</p>
                  <p className="text-lg font-semibold text-green-600">Active</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Brain className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Models</p>
                  <p className="text-lg font-semibold">Voyage + OpenAI</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Database className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Backend</p>
                  <p className="text-lg font-semibold">Supabase</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <Zap className="h-8 w-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Embeddings</p>
                  <p className="text-lg font-semibold">Vector Search</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Chat Interface
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] border rounded-lg">
                  <ChatContainer />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Key Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Multi-Model Embeddings</h4>
                      <p className="text-sm text-gray-600">
                        Switch between Voyage AI and OpenAI embedding models with ease
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Tenant Isolation</h4>
                      <p className="text-sm text-gray-600">
                        Secure multi-tenant architecture with per-tenant configurations
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Vector Search</h4>
                      <p className="text-sm text-gray-600">
                        Semantic search through knowledge base with vector similarity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Batch Processing</h4>
                      <p className="text-sm text-gray-600">
                        Bulk embedding generation and model migration tools
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button asChild className="w-full">
                      <Link href="/admin/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure AI Settings
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Technology Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Technology Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Next.js 14</Badge>
                <Badge variant="secondary">TypeScript</Badge>
                <Badge variant="secondary">Supabase</Badge>
                <Badge variant="secondary">Voyage AI</Badge>
                <Badge variant="secondary">OpenAI</Badge>
                <Badge variant="secondary">Tailwind CSS</Badge>
                <Badge variant="secondary">Prisma</Badge>
                <Badge variant="secondary">Vector Search</Badge>
                <Badge variant="secondary">Multi-tenant</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
    </ProtectedRoute>
  );
}
