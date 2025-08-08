
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const createMockServerClient = () => {
  console.warn('Supabase not configured for server client - using mock');
  
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: null, error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' } }),
          limit: (count: number) => async () => ({ data: [], error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' } })
        }),
        order: (column: string, options?: any) => async () => ({ data: [], error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' } })
      }),
      insert: (values: any) => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' } })
        })
      }),
      update: (values: any) => ({
        eq: (column: string, value: any) => ({
          select: () => ({
            single: async () => ({ data: null, error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' } })
          })
        })
      })
    })
  } as any;
};

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN') {
    return createMockServerClient();
  }

  try {
    const cookieStore = cookies()

    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('Error creating server Supabase client:', error);
    return createMockServerClient();
  }
}
