import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.razorpay.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // Razorpay checkout runs inside an iframe
  "frame-src 'self' https://*.razorpay.com https://checkout.razorpay.com",
  // Next.js + Razorpay SDK. 'unsafe-inline' is required for Next's bootstrap
  // scripts unless a per-request nonce is wired up.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com",
  // Tailwind / inline critical CSS needs 'unsafe-inline'
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Avatars / parcel photos from Supabase storage, plus data URIs for inline SVG
  "img-src 'self' data: blob: https: https://*.supabase.co",
  // Supabase REST + realtime websocket, Razorpay API
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.razorpay.com https://lumberjack.razorpay.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Download-Options', value: 'noopen' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
