
'use client'

import SupabaseProvider from '@/lib/providers/supabase-provider'
import TenantProvider from '@/lib/providers/tenant-provider'
import { ThemeProvider } from '@/components/theme-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      <TenantProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </TenantProvider>
    </SupabaseProvider>
  )
}
