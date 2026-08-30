import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { loginLimiter } from './lib/rate-limit'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1'
}

async function consumeLoginAttempt(ip: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return process.env.NODE_ENV !== 'production' && loginLimiter(ip).allowed
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_cms_login_attempt`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_key: ip }),
      cache: 'no-store',
    })
    if (!response.ok) return false
    return (await response.json()) === true
  } catch {
    return false
  }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (request.method === 'POST') {
      const ip = getClientIp(request)
      const allowed = await consumeLoginAttempt(ip)

      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'rate_limited')
        return addSecurityHeaders(NextResponse.redirect(url))
      }
    }
  }

  const response = await updateSession(request)
  return addSecurityHeaders(response as NextResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
