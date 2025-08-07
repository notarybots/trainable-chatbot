
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files only - NOT for API routes that need auth
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') && !pathname.startsWith('/api/')
  ) {
    return NextResponse.next()
  }

  // Handle session refresh for both web pages AND API routes
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh the session for both web pages and API routes
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Log session validation for API routes (helpful for debugging)
    if (pathname.startsWith('/api/')) {
      console.log(`🔍 Middleware session for ${pathname}:`, {
        user: user ? { id: user.id, email: user.email } : null,
        error: error?.message || null
      })
    }
    
  } catch (error) {
    console.error('Middleware error:', error)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
