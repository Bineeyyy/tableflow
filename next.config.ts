import type { NextConfig } from "next";

const SUPABASE_HOST = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : '';
  } catch {
    return '';
  }
})();

// Connect-src needs Supabase REST + Supabase Realtime websockets + Stripe.js +
// the app itself. Script-src needs Stripe.js. style/img/font kept locked down.
//
// In dev we relax `script-src` because Next.js injects inline bootstrap and
// uses eval for Hot Reload — the permissive `'unsafe-eval' 'unsafe-inline'` is
// dev-only and stripped from production builds.
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.stripe.com`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  // Belt and braces — frame-ancestors in CSP is the modern check, X-Frame-
  // Options is the legacy one for older browsers / proxies that ignore CSP.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No camera / mic / geo / payment-from-iframe needed in this app.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Two years, include subdomains, allow preload list submission. Only sent on
  // HTTPS responses by Vercel anyway, but explicit is better.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework to anyone scanning HTTP responses.
  poweredByHeader: false,
  experimental: {
    // Keep prefetched/visited dashboard pages in the client cache so navigating
    // back to them feels instant. Defaults are dynamic: 0, static: 300.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
