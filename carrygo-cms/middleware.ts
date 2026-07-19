import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'
import { loginLimiter } from './lib/rate-limit'

function getClientIp(request: NextRequest): string {
  // SECURITY: In production, only trust x-forwarded-for from a known proxy (e.g., Vercel, Cloudflare).
  // The first hop (rightmost value appended by your proxy) is the only trustworthy one.
  // This naive first-element extraction is acceptable only behind a single trusted reverse proxy
  // that overwrites x-forwarded-for entirely (as Vercel does).
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
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (request.method === 'POST') {
      const ip = getClientIp(request);
      const result = loginLimiter(ip);

      if (!result.allowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('error', 'rate_limited');
        return addSecurityHeaders(NextResponse.redirect(url));
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
