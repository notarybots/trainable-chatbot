
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Bot, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Edit
} from 'lucide-react'
import { EmbeddingModelSelector } from './embedding-model-selector'
import { EmbeddingModelCard } from './embedding-model-card'
import type { EmbeddingModel } from '@/lib/services/embedding-service'

interface EmbeddingSettings {
  id: string
  tenant_id: string | null
  model_id: string
  model_name: string
  provider: string
  dimensions: number
  is_default: boolean
  settings: any
  created_at: string
  updated_at: string
}

interface SettingsData {
  settings: EmbeddingSettings[]
  defaultModel: EmbeddingSettings | null
  availableModels: EmbeddingModel[]
}

export function EmbeddingSettingsPanel() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModel, setShowAddModel] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    initializeDefaultModels()
  }, [tenantId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (tenantId) {
        params.append('tenantId', tenantId)
      }
      
      const response = await fetch(`/api/admin/embedding-settings?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load settings')
      
      const settingsData = await response.json()
      setData(settingsData)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializeDefaultModels = async () => {
    try {
      await fetch('/api/admin/embedding-settings/initialize', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error initializing default models:', error)
    }
  }

  const handleAddModel = async (modelId: string, isDefault: boolean) => {
    try {
      const response = await fetch('/api/admin/embedding-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          modelId,
          isDefault,
          settings: {
            batch_size: 100,
            auto_reprocess: false
          }
        })
      })

      if (!response.ok) throw new Error('Failed to add model')
      
      await loadSettings()
      setShowAddModel(false)
    } catch (error) {
      console.error('Error adding model:', error)
    }
  }

  const handleSetDefault = async (settingsId: string) => {
    try {
      const response = await fetch(`/api/admin/embedding-settings/${settingsId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId,
          isDefault: true
        })
      })

      if (!response.ok) throw new Error('Failed to set default')
      
      await loadSettings()
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  const handleDeleteModel = async (settingsId: string) => {
    if (!confirm('Are you sure you want to delete this model configuration?')) {
      return
    }

    try {
      const params = new URLSearchParams()
      if (tenantId) {
        params.append('tenantId', tenantId)
      }

      const response = await fetch(`/api/admin/embedding-settings/${settingsId}?${params.toString()}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete model')
      
      await loadSettings()
    } catch (error) {
      console.error('Error deleting model:', error)
    }
  }

  const handleTestModel = async (modelId: string) => {
    try {
      const response = await fetch('/api/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'This is a test embedding for model validation.',
          model: modelId,
          tenantId
        })
      })

      if (!response.ok) throw new Error('Model test failed')
      
      const result = await response.json()
      alert(`Model test successful! Generated ${result.embeddings?.[0]?.length || 0} dimensional embedding.`)
    } catch (error) {
      console.error('Error testing model:', error)
      alert('Model test failed. Please check your configuration.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Failed to load embedding settings</p>
      </div>
    )
  }

  const configuredModels = data.settings || []
  const availableModels = data.availableModels || []
  const unconfiguredModels = availableModels.filter(
    model => !configuredModels.some(config => config.model_id === model.id)
  )

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Bot className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Configured Models</p>
              <p className="text-2xl font-bold">{configuredModels.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Settings className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Available Models</p>
              <p className="text-2xl font-bold">{availableModels.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Default Model</p>
              <p className="text-lg font-semibold">{data.defaultModel?.model_name || 'None'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Default Model */}
      {data.defaultModel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Current Default Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmbeddingModelCard
              settings={data.defaultModel}
              availableModels={availableModels}
              onSetDefault={() => {}}
              onTest={() => handleTestModel(data.defaultModel!.model_id)}
              onDelete={() => handleDeleteModel(data.defaultModel!.id)}
              isDefault={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Configured Models */}
      {configuredModels.filter(config => !config.is_default).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Configured Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {configuredModels
                .filter(config => !config.is_default)
                .map((config) => (
                  <EmbeddingModelCard
                    key={config.id}
                    settings={config}
                    availableModels={availableModels}
                    onSetDefault={() => handleSetDefault(config.id)}
                    onTest={() => handleTestModel(config.model_id)}
                    onDelete={() => handleDeleteModel(config.id)}
                    isDefault={false}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Models to Add */}
      {unconfiguredModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Available Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showAddModel ? (
              <Button onClick={() => setShowAddModel(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Model Configuration
              </Button>
            ) : (
              <EmbeddingModelSelector
                availableModels={unconfiguredModels}
                onAdd={handleAddModel}
                onCancel={() => setShowAddModel(false)}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
