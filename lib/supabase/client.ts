
import { createBrowserClient } from '@supabase/ssr'

const createMockClient = () => {
  console.warn('Supabase environment variables not configured properly - using mock client');
  
  // Return a comprehensive mock client that prevents all errors
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: (callback?: any) => {
        // Call callback immediately with null session for consistency
        if (callback && typeof callback === 'function') {
          setTimeout(() => callback('SIGNED_OUT', null), 0);
        }
        return { 
          data: { 
            subscription: { 
              unsubscribe: () => {},
              id: 'mock-subscription'
            } 
          } 
        }
      },
      signUp: async () => ({ data: null, error: { message: 'Supabase not configured', status: 400 } }),
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured', status: 400 } }),
      signInWithOAuth: async () => ({ data: null, error: { message: 'Supabase not configured', status: 400 } }),
      signOut: async () => ({ error: null }),
      refreshSession: async () => ({ data: { session: null }, error: null }),
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: async () => ({ data: null, error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' } }),
          limit: (count: number) => ({
            data: [],
            error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' }
          })
        }),
        order: (column: string, options?: any) => ({
          data: [],
          error: { message: `Supabase not configured - table: ${table}`, code: 'SUPABASE_NOT_CONFIGURED' }
        })
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
    }),
    channel: (topic: string) => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    removeChannel: () => {},
    getChannels: () => []
  } as any;
};

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN') {
    return createMockClient();
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    // Return mock client as fallback
    return createMockClient();
  }
}
