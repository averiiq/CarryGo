import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_COOKIE_NAME = 'x-cms-role'
// Shorter cache window — reduces the staleness gap when an admin is demoted.
// 60s is enough to coalesce bursty nav within a single session without
// stretching the privilege-revocation window to minutes.
const ROLE_COOKIE_MAX_AGE = 60

function safeNextPath(raw: string | null): string | null {
  if (!raw) return null
  // Must be a single-segment internal path. Reject protocol-relative (//evil),
  // absolute URLs, and backslash tricks that some browsers normalize.
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null
  if (raw.includes('://')) return null
  return raw
}

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders ?? request.headers,
    },
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
            request: {
              headers: requestHeaders ?? request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
  const isCustomerProtectedRoute =
    request.nextUrl.pathname.startsWith('/activity') ||
    request.nextUrl.pathname.startsWith('/kyc') ||
    request.nextUrl.pathname.startsWith('/profile') ||
    request.nextUrl.pathname.startsWith('/payment')

  if (!user && (isDashboardRoute || isCustomerProtectedRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user) {
    let systemRole: string = request.cookies.get(ROLE_COOKIE_NAME)?.value ?? ''

    if (!systemRole) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('system_role')
        .eq('id', user.id)
        .single()

      systemRole = profile?.system_role || 'user'

      supabaseResponse.cookies.set(ROLE_COOKIE_NAME, systemRole, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ROLE_COOKIE_MAX_AGE,
        path: '/',
      })
    }

    if (systemRole !== 'admin' && isDashboardRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }

    if (isAuthRoute) {
      const nextUrl = safeNextPath(request.nextUrl.searchParams.get('next'))
      const url = request.nextUrl.clone()
      url.searchParams.delete('next')
      if (systemRole === 'admin') {
        url.pathname = nextUrl || '/dashboard'
      } else {
        url.pathname = nextUrl || '/activity'
      }
      return NextResponse.redirect(url)
    }
  } else {
    supabaseResponse.cookies.delete(ROLE_COOKIE_NAME)
  }

  return supabaseResponse
}
