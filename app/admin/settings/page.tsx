

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmbeddingSettingsPanel } from '@/components/admin/settings/embedding-settings-panel'
import { EmbeddingAnalyticsDashboard } from '@/components/admin/analytics/embedding-analytics-dashboard'
import { Settings, BarChart3, Database } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Model Management
        </h1>
        <p className="text-gray-600">
          Configure embedding models, monitor performance, and manage AI settings for your chatbot
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Model Settings
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics & Processing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <EmbeddingSettingsPanel />
        </TabsContent>

        <TabsContent value="analytics">
          <EmbeddingAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
