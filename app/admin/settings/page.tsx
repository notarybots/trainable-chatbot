
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmbeddingSettingsPanel } from '@/components/admin/settings/embedding-settings-panel'
import { EmbeddingAnalyticsDashboard } from '@/components/admin/analytics/embedding-analytics-dashboard'
import { Settings, Database, BarChart3 } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            AI Settings & Configuration
          </h1>
          <p className="text-gray-600">
            Configure embedding models, manage batch processing, and monitor system analytics.
          </p>
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
    </AuthGuard>
  )
}
