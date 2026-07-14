import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { loginLimiter } from './lib/rate-limit'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self';"
  );
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (request.method === 'POST') {
      const ip = getClientIp(request);
      const result = loginLimiter(ip);

      if (!result.allowed) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Too many login attempts. Please try again later.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)),
              },
            }
          )
        );
      }
    }
  }

  const response = await updateSession(request);
  return addSecurityHeaders(response as NextResponse);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
