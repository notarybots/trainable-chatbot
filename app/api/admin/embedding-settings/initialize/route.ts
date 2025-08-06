

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { initializeDefaultEmbeddingModels } from '@/lib/database/embedding-settings'

export async function POST() {
  try {
    await initializeDefaultEmbeddingModels()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Initialize embedding models error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize default embedding models' },
      { status: 500 }
    )
  }
}
