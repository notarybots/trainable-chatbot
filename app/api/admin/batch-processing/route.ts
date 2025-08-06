

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { batchProcessingService } from '@/lib/services/batch-processing-service'

interface BatchProcessingRequest {
  tenantId?: string | null
  modelId?: string
  batchSize?: number
  action: 'process_all' | 'migrate' | 'stats'
  fromModelId?: string
  toModelId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchProcessingRequest = await request.json()
    const { action, tenantId, modelId, batchSize, fromModelId, toModelId } = body

    switch (action) {
      case 'process_all':
        const jobId = await batchProcessingService.processAllKnowledgeBase({
          tenantId,
          modelId,
          batchSize
        })
        return NextResponse.json({ jobId })

      case 'migrate':
        if (!fromModelId || !toModelId) {
          return NextResponse.json(
            { error: 'Both fromModelId and toModelId are required for migration' },
            { status: 400 }
          )
        }
        
        const migrationJobId = await batchProcessingService.migrateToNewModel(
          fromModelId,
          toModelId,
          tenantId
        )
        return NextResponse.json({ jobId: migrationJobId })

      case 'stats':
        const stats = await batchProcessingService.getProcessingStats(tenantId)
        return NextResponse.json({ stats })

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Batch processing API error:', error)
    return NextResponse.json(
      { 
        error: 'Batch processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
