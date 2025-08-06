

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { 
  updateEmbeddingSettings, 
  deleteEmbeddingSettings 
} from '@/lib/database/embedding-settings'
import { embeddingService } from '@/lib/services/embedding-service'

interface UpdateSettingsRequest {
  tenantId?: string | null
  modelId?: string
  isDefault?: boolean
  settings?: any
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settingsId = params.id
    const body: UpdateSettingsRequest = await request.json()
    const { tenantId, modelId, isDefault, settings } = body

    const updates: any = {}
    
    if (modelId) {
      const modelConfig = embeddingService.getModelConfig(modelId)
      if (!modelConfig) {
        return NextResponse.json(
          { error: 'Invalid model ID' },
          { status: 400 }
        )
      }
      
      updates.model_id = modelId
      updates.model_name = modelConfig.name
      updates.provider = modelConfig.provider
      updates.dimensions = modelConfig.dimensions
    }

    if (typeof isDefault === 'boolean') {
      updates.is_default = isDefault
    }

    if (settings) {
      updates.settings = settings
    }

    updates.updated_at = new Date().toISOString()

    const updatedSettings = await updateEmbeddingSettings(settingsId, updates, tenantId)

    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Failed to update embedding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedSettings)

  } catch (error) {
    console.error('Update embedding settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update embedding settings' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settingsId = params.id
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || null

    const success = await deleteEmbeddingSettings(settingsId, tenantId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete embedding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete embedding settings error:', error)
    return NextResponse.json(
      { error: 'Failed to delete embedding settings' },
      { status: 500 }
    )
  }
}
