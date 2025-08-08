
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check if Supabase is properly configured
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN') {
    console.warn('Supabase not configured in middleware - allowing all requests');
    
    // Extract tenant from subdomain or path for header setting
    const hostname = request.headers.get('host') || ''
    const subdomain = hostname.split('.')[0]
    
    const tenant = subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('vercel.app') 
      ? subdomain 
      : request.nextUrl.searchParams.get('tenant') || process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'demo'

    // Add tenant to headers for downstream use
    if (tenant) {
      supabaseResponse.headers.set('x-tenant-id', tenant)
    }

    // Allow all requests when Supabase is not configured (for development/demo)
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    let user = null;
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user
    } catch (authError) {
      console.warn('Auth error in middleware:', authError)
      // Continue with null user
    }

    // Extract tenant from subdomain or path
    const url = request.nextUrl.clone()
    const hostname = request.headers.get('host') || ''
    const subdomain = hostname.split('.')[0]
    
    // If subdomain is not main domain, treat as tenant
    const tenant = subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('vercel.app') 
      ? subdomain 
      : request.nextUrl.searchParams.get('tenant') || process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'demo'

    // Add tenant to headers for downstream use
    if (tenant) {
      supabaseResponse.headers.set('x-tenant-id', tenant)
    }

    // Temporarily disable authentication redirect for testing
    // Allow access to all pages when Supabase is not configured
    const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'REPLACE_WITH_YOUR_ACTUAL_ANON_JWT_TOKEN';
    
    if (
      !user &&
      isSupabaseConfigured &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/auth')
    ) {
      // no user, potentially respond by redirecting the user to the login page
      const redirectUrl = url.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse

  } catch (error) {
    console.error('Middleware error:', error)
    
    // Fallback: Extract tenant and continue without authentication
    const hostname = request.headers.get('host') || ''
    const subdomain = hostname.split('.')[0]
    
    const tenant = subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('vercel.app') 
      ? subdomain 
      : request.nextUrl.searchParams.get('tenant') || process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'demo'

    if (tenant) {
      supabaseResponse.headers.set('x-tenant-id', tenant)
    }

    // Continue without authentication when Supabase fails
    return supabaseResponse
  }
}
