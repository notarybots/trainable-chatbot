
'use client'

import { AdminRoute } from '@/components/auth/route-guard'
import { SessionGuard } from '@/components/auth/session-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmbeddingSettingsPanel } from '@/components/admin/settings/embedding-settings-panel'
import { EmbeddingAnalyticsDashboard } from '@/components/admin/analytics/embedding-analytics-dashboard'
import { Settings, Database, BarChart3, Shield } from 'lucide-react'

export function AdminSettingsContent() {
  return (
    <AdminRoute>
      <SessionGuard>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-8 w-8 text-blue-600" />
                  AI Settings & Configuration
                </h1>
                <p className="text-gray-600 mt-1">
                  Configure embedding models, manage batch processing, and monitor system analytics.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Embedding Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Embedding Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmbeddingSettingsPanel />
              </CardContent>
            </Card>

            {/* Analytics Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  System Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EmbeddingAnalyticsDashboard />
              </CardContent>
            </Card>
          </div>
        </div>
      </SessionGuard>
    </AdminRoute>
  )
}
