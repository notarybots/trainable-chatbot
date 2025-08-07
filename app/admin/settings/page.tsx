
'use client'

import React from 'react'
import { SafeSupabaseWrapper } from '@/components/auth/safe-supabase-wrapper'
import { AdminSettingsContent } from './admin-settings-content'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function AdminSettingsPage() {
  return (
    <SafeSupabaseWrapper>
      <AdminSettingsContent />
    </SafeSupabaseWrapper>
  )
}
