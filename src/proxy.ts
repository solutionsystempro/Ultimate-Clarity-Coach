import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PAGE_PROTECTED = ['/coach', '/profile', '/admin']
const API_PROTECTED = ['/api/chat', '/api/conversations', '/api/profile', '/api/user']
const ADMIN_EMAIL = 'solutionsystempro@gmail.com'

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPageProtected = PAGE_PROTECTED.some(r => pathname.startsWith(r))
  const isApiProtected = API_PROTECTED.some(r => pathname.startsWith(r))

  if (!isPageProtected && !isApiProtected) {
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
    if (isApiProtected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
