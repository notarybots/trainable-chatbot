

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // FIRST: Clean up Vercel toolbar parameters from URLs
  const cleanUrl = request.nextUrl.clone()
  let hasToolbarParams = false
  
  // List of Vercel toolbar parameters to remove
  const toolbarParams = [
    '__vercel_toolbar_code',
    '__vercel_toolbar',
    'vercel_toolbar_code',
    'vercel_toolbar',
    '__vt',
    'vt'
  ]
  
  // Check and remove toolbar parameters
  toolbarParams.forEach(param => {
    if (cleanUrl.searchParams.has(param)) {
      cleanUrl.searchParams.delete(param)
      hasToolbarParams = true
    }
  })
  
  // If we removed toolbar parameters, redirect to clean URL
  if (hasToolbarParams) {
    console.log('🧹 Cleaning toolbar parameters from URL:', request.nextUrl.pathname)
    return NextResponse.redirect(cleanUrl)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  let user = null
  let error = null

  try {
    const response = await supabase.auth.getUser()
    user = response.data.user
    error = response.error
  } catch (e) {
    console.error('Error getting user in middleware:', e)
  }

  // Extract tenant from subdomain or path
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // If subdomain is not main domain, treat as tenant
  const tenant = subdomain !== 'localhost' && subdomain !== 'www' && !hostname.includes('vercel.app') 
    ? subdomain 
    : request.nextUrl.searchParams.get('tenant') || process.env.NEXT_PUBLIC_DEFAULT_TENANT

  // Add tenant to headers for downstream use
  if (tenant) {
    supabaseResponse.headers.set('x-tenant-id', tenant)
  }

  // Define route patterns
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/auth')
  
  const isPublicAPI = request.nextUrl.pathname.startsWith('/api/auth')
  const isPrivateAPI = request.nextUrl.pathname.startsWith('/api/') && !isPublicAPI
  
  // Define protected routes - routes that require authentication
  const protectedRoutes = [
    '/', // Main chat interface
    '/admin',
    '/admin/settings',
    '/chat',
    '/dashboard'
  ]
  
  // Define public routes - routes accessible without authentication
  const publicRoutes = [
    '/login',
    '/auth',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ]

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + '/')
  )

  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + '/')
  )

  // Enhanced authentication logic
  if (!user) {
    // Handle unauthenticated users (regardless of error state)
    console.log('Unauthenticated user accessing:', request.nextUrl.pathname, { error: error?.message })
    
    if (isPrivateAPI) {
      // API routes should return 401 Unauthorized, not redirect
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
    
    if (isProtectedRoute && !isPublicRoute) {
      // Store intended destination for post-login redirect
      const redirectUrl = url.clone()
      redirectUrl.pathname = '/login'
      
      // Preserve the intended destination
      const intendedDestination = request.nextUrl.pathname + request.nextUrl.search
      redirectUrl.searchParams.set('redirect', intendedDestination)
      
      console.log('Middleware redirecting to login with intended destination:', intendedDestination)
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (user && isAuthPage) {
    // User is authenticated but on auth page - redirect appropriately
    const redirectUrl = url.clone()
    
    // Check if there's an intended destination from the redirect parameter
    const intendedDestination = request.nextUrl.searchParams.get('redirect')
    
    if (intendedDestination && intendedDestination !== '/login') {
      // Redirect to intended destination
      redirectUrl.pathname = intendedDestination
      redirectUrl.search = ''
      console.log('Redirecting authenticated user to intended destination:', intendedDestination)
    } else {
      // Default redirect to home
      redirectUrl.pathname = '/'
      redirectUrl.search = ''
      console.log('Redirecting authenticated user to home')
    }
    
    return NextResponse.redirect(redirectUrl)
  }

  // Handle session refresh and persistence
  if (user) {
    // Set authentication headers for better session persistence
    supabaseResponse.headers.set('x-user-id', user.id)
    supabaseResponse.headers.set('x-user-email', user.email || '')
    
    // Add cache control headers for authenticated requests
    supabaseResponse.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0')
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object here instead of the supabaseResponse object

  return supabaseResponse
}
