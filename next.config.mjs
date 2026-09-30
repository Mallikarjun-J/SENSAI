/** @type {import('next').NextConfig} */

// ─── Startup environment validation ──────────────────────────────────────────
// Runs at build time and server startup. Fails fast with a clear message
// instead of a cryptic runtime error deep inside a request handler.
const REQUIRED_ENV_VARS = [
  // Database
  "DATABASE_URL",
  // Clerk auth
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  // AI
  "GEMINI_API_KEY",
  "ROADMAP_API",
  "RESUME_ANALYSIS_KEY",
  // LiveKit
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "NEXT_PUBLIC_LIVEKIT_URL",
  // File uploads
  "UPLOADTHING_TOKEN",
  // Inngest background jobs
  "INNGEST_SIGNING_KEY",
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `\n\n🚨 Missing required environment variables:\n\n` +
    missing.map((k) => `  ❌  ${k}`).join("\n") +
    `\n\nSet these in your .env file or deployment environment before starting the app.\n` +
    `See .env.example for the full list of required variables.\n`
  );
}

// ─── Security headers ─────────────────────────────────────────────────────────
const securityHeaders = [
  // Prevent MIME-type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Disallow embedding in iframes (clickjacking protection)
  // SAMEORIGIN used instead of DENY because Clerk renders its UI in iframes
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Force HTTPS for 1 year (only meaningful in production behind TLS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Don't send full URL in Referer header to third parties
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restrict browser feature access to only what this app needs:
  // camera + microphone required for voice interview; everything else denied
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
  },
  // Content Security Policy
  // Rationale for each directive:
  //   script-src  'unsafe-inline' + 'unsafe-eval' → required by Next.js App Router hydration
  //   connect-src https: wss:                     → LiveKit WebSocket + all API/CDN calls
  //   frame-src   clerk domains                   → Clerk's hosted auth UI renders in iframes
  //   img-src     https: data: blob:              → Clerk avatar, randomuser.me, UploadThing CDN
  //   media-src   blob:                           → webcam MediaStream for voice interview
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "connect-src 'self' https: wss:",
      "frame-src https://clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://utfs.io https://*.ufs.sh",
      "worker-src 'self' blob:",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      }
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
