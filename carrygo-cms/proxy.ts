import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { loginLimiter } from './lib/rate-limit'

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' https: data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

function createNonce(): string {
  return btoa(crypto.randomUUID())
}

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
    if (!response.ok) {
      return loginLimiter(ip).allowed
    }
    return (await response.json()) === true
  } catch {
    return loginLimiter(ip).allowed
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
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (request.method === 'POST') {
      const ip = getClientIp(request)
      const allowed = await consumeLoginAttempt(ip)

      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'rate_limited')
        const redirectResponse = addSecurityHeaders(NextResponse.redirect(url))
        redirectResponse.headers.set('Content-Security-Policy', buildCsp(nonce))
        return redirectResponse
      }
    }
  }

  const response = await updateSession(request, requestHeaders)
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  return addSecurityHeaders(response as NextResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
