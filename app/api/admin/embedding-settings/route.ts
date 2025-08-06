

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { 
  getTenantEmbeddingSettings, 
  createEmbeddingSettings, 
  getDefaultEmbeddingModel,
  initializeDefaultEmbeddingModels 
} from '@/lib/database/embedding-settings'
import { embeddingService } from '@/lib/services/embedding-service'

interface CreateSettingsRequest {
  tenantId?: string | null
  modelId: string
  isDefault?: boolean
  settings?: any
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    const settings = await getTenantEmbeddingSettings(tenantId)
    const defaultModel = await getDefaultEmbeddingModel(tenantId)
    const availableModels = embeddingService.getAvailableModels()

    return NextResponse.json({
      settings,
      defaultModel,
      availableModels
    })

  } catch (error) {
    console.error('Get embedding settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get embedding settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSettingsRequest = await request.json()
    const { tenantId, modelId, isDefault = false, settings = {} } = body

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }

    // Validate model exists
    const modelConfig = embeddingService.getModelConfig(modelId)
    if (!modelConfig) {
      return NextResponse.json(
        { error: 'Invalid model ID' },
        { status: 400 }
      )
    }

    const newSettings = await createEmbeddingSettings({
      tenant_id: tenantId,
      model_id: modelId,
      model_name: modelConfig.name,
      provider: modelConfig.provider,
      dimensions: modelConfig.dimensions,
      is_default: isDefault,
      settings
    })

    if (!newSettings) {
      return NextResponse.json(
        { error: 'Failed to create embedding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(newSettings)

  } catch (error) {
    console.error('Create embedding settings error:', error)
    return NextResponse.json(
      { error: 'Failed to create embedding settings' },
      { status: 500 }
    )
  }
}
