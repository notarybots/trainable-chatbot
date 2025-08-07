
'use client'

import React from 'react'
import { SafeSupabaseWrapper } from '@/components/auth/safe-supabase-wrapper'
import { HomeContent } from './home-content'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <SafeSupabaseWrapper>
      <HomeContent />
    </SafeSupabaseWrapper>
  )
}
