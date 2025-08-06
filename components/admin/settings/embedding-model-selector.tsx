
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Bot, 
  Database, 
  FileText, 
  Zap,
  Plus,
  X
} from 'lucide-react'
import type { EmbeddingModel } from '@/lib/services/embedding-service'

interface EmbeddingModelSelectorProps {
  availableModels: EmbeddingModel[]
  onAdd: (modelId: string, isDefault: boolean) => void
  onCancel: () => void
}

export function EmbeddingModelSelector({
  availableModels,
  onAdd,
  onCancel
}: EmbeddingModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [setAsDefault, setSetAsDefault] = useState(false)

  const handleAdd = () => {
    if (!selectedModel) return
    onAdd(selectedModel, setAsDefault)
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'voyage': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'openai': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'voyage': return <Bot className="h-4 w-4" />
      case 'openai': return <Zap className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Add Model Configuration</h3>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableModels.map((model) => (
          <Card 
            key={model.id}
            className={`cursor-pointer transition-all ${
              selectedModel === model.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => setSelectedModel(model.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className={getProviderColor(model.provider)}>
                  {getProviderIcon(model.provider)}
                  <span className="ml-1">{model.provider.toUpperCase()}</span>
                </Badge>
                {selectedModel === model.id && (
                  <div className="h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
              <CardTitle className="text-base">{model.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{model.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>{model.dimensions}D</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{(model.maxTokens / 1000).toFixed(0)}K tokens</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedModel && (
        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="set-default"
              checked={setAsDefault}
              onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
            />
            <label
              htmlFor="set-default"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Set as default model for this tenant
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Model Configuration
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
