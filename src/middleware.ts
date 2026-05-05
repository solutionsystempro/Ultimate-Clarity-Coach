import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/coach', '/profile', '/admin']
const ADMIN_EMAIL = 'solutionsystempro@gmail.com'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only run on protected routes
  if (!PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(signInUrl)
  }

  if (pathname.startsWith('/admin') && user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/coach', request.url))
  }

  return response
}

export const config = {
  matcher: ['/coach/:path*', '/profile/:path*', '/admin/:path*'],
}
