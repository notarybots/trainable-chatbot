

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { 
  createEmbeddingJob, 
  getEmbeddingJobs 
} from '@/lib/database/embedding-jobs'

interface CreateJobRequest {
  tenantId?: string | null
  modelId: string
  totalItems: number
  metadata?: any
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const status = searchParams.get('status') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    const jobs = await getEmbeddingJobs(tenantId, status, limit)

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Get embedding jobs error:', error)
    return NextResponse.json(
      { error: 'Failed to get embedding jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateJobRequest = await request.json()
    const { tenantId, modelId, totalItems, metadata = {} } = body

    if (!modelId || !totalItems) {
      return NextResponse.json(
        { error: 'Model ID and total items are required' },
        { status: 400 }
      )
    }

    const job = await createEmbeddingJob({
      tenant_id: tenantId,
      model_id: modelId,
      status: 'pending',
      progress: 0,
      total_items: totalItems,
      processed_items: 0,
      metadata
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Failed to create embedding job' },
        { status: 500 }
      )
    }

    return NextResponse.json(job)

  } catch (error) {
    console.error('Create embedding job error:', error)
    return NextResponse.json(
      { error: 'Failed to create embedding job' },
      { status: 500 }
    )
  }
}
