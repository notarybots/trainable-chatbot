
'use client'

import { useState, useEffect } from 'react'
import SupabaseProvider from '@/lib/providers/supabase-provider'
import { ThemeProvider } from '@/components/theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // Wait for client-side hydration to complete
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering providers until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SupabaseProvider>
        {children}
      </SupabaseProvider>
    </ThemeProvider>
  )
}
