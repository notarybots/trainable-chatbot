
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

  // Enhanced redirect logic
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                    request.nextUrl.pathname.startsWith('/auth')
  
  const isPublicAPI = request.nextUrl.pathname.startsWith('/api/auth')

  if (!user && !isAuthPage && !isPublicAPI) {
    // no user, potentially respond by redirecting the user to the login page
    const redirectUrl = url.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    
    console.log('Redirecting to login:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthPage) {
    // User is authenticated but on login page, redirect to home
    const redirectUrl = url.clone()
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
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
