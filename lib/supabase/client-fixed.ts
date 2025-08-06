
import { createBrowserClient } from '@supabase/ssr'

// Get the correct anonymous key from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Validate that we're using the anonymous key, not service key
if (supabaseAnonKey.includes('service_role')) {
  console.error('🚨 CRITICAL: Using service role key as anonymous key! This is a security issue.')
  throw new Error('Invalid anonymous key configuration')
}

export const createClient = () => {
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'supabase.auth.token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  
  return client
}

// Export a singleton instance for consistent usage
export const supabase = createClient()
