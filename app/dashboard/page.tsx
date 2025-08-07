
'use client'

import React from 'react'
import { SafeSupabaseWrapper } from '@/components/auth/safe-supabase-wrapper'
import { DashboardContent } from './dashboard-content'

// Force dynamic rendering  
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <SafeSupabaseWrapper>
      <DashboardContent />
    </SafeSupabaseWrapper>
  )
}
