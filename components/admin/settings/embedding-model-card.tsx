
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Star, 
  StarOff, 
  Play, 
  Trash2, 
  Zap,
  Database,
  Clock,
  Settings
} from 'lucide-react'
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

interface EmbeddingModelCardProps {
  settings: EmbeddingSettings
  availableModels: EmbeddingModel[]
  onSetDefault: () => void
  onTest: () => void
  onDelete: () => void
  isDefault: boolean
}

export function EmbeddingModelCard({
  settings,
  availableModels,
  onSetDefault,
  onTest,
  onDelete,
  isDefault
}: EmbeddingModelCardProps) {
  const model = availableModels.find(m => m.id === settings.model_id)
  
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'voyage': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'openai': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <Card className="relative">
      {isDefault && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="bg-green-100 text-green-800">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Default
          </Badge>
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{settings.model_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getProviderColor(settings.provider)}>
                  {settings.provider.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">{settings.model_id}</span>
              </div>
            </div>
          </div>

          {/* Model Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span>{settings.dimensions} dimensions</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>{formatDate(settings.updated_at)}</span>
            </div>
          </div>

          {/* Description */}
          {model?.description && (
            <p className="text-sm text-gray-600">{model.description}</p>
          )}

          {/* Settings */}
          {settings.settings && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Configuration</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>Batch Size: {settings.settings.batch_size || 'N/A'}</div>
                <div>Auto Reprocess: {settings.settings.auto_reprocess ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onTest}
              >
                <Play className="h-3 w-3 mr-1" />
                Test
              </Button>
              
              {!isDefault && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onSetDefault}
                >
                  <Star className="h-3 w-3 mr-1" />
                  Set Default
                </Button>
              )}
            </div>

            {!isDefault && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
