

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { embeddingService } from '@/lib/services/embedding-service'
import { createClient } from '@/lib/supabase/server'

interface EmbeddingRequest {
  text: string | string[]
  model?: string
  tenantId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EmbeddingRequest = await request.json()
    const { text, model = 'voyage-large-2-instruct', tenantId } = body

    if (!text || (Array.isArray(text) && text.length === 0)) {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      )
    }

    // Verify tenant if provided
    if (tenantId) {
      const supabase = createClient()
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .single()

      if (!tenant) {
        return NextResponse.json(
          { error: 'Invalid tenant ID' },
          { status: 403 }
        )
      }
    }

    const result = await embeddingService.generateEmbeddings({
      text,
      model,
      tenantId
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Embedding API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate embeddings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const models = embeddingService.getAvailableModels()
    return NextResponse.json({ models })
  } catch (error) {
    console.error('Get models error:', error)
    return NextResponse.json(
      { error: 'Failed to get available models' },
      { status: 500 }
    )
  }
}
