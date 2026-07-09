import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_COOKIE_NAME = 'x-cms-role'
const ROLE_COOKIE_MAX_AGE = 30 // 30 seconds — minimizes privilege escalation window

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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
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

    if (systemRole === 'user' && isDashboardRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/unauthorized'
      return NextResponse.redirect(url)
    }

    if (systemRole !== 'user' && isAuthRoute) {
       const url = request.nextUrl.clone()
       url.pathname = '/dashboard'
       return NextResponse.redirect(url)
    }
  } else {
    supabaseResponse.cookies.delete(ROLE_COOKIE_NAME)
  }

  return supabaseResponse
}
