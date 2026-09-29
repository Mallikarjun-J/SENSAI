import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";

// ─── Protected page routes (redirect to sign-in if not authed) ───────────────
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/resume(.*)",
  "/resume-analyzer(.*)",
  "/career-roadmap(.*)",
  "/interview(.*)",
  "/ai-cover-letter(.*)",
  "/onboarding(.*)",
]);

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Fixed-window in-memory store. Works on single-instance servers (Railway,
// Render, VPS). On Vercel (serverless) each function instance has its own
// memory — upgrade to Upstash Redis if you need cross-instance limiting.
//
// Store shape: Map<"ip:pathname", { count: number, windowStart: number }>

const rateLimitStore = new Map();

const RATE_LIMITS = {
  "/api/livekit/token":        { limit: 3,  windowMs: 60_000 }, // 3 / min  — room creation + agent dispatch
  "/api/roadmap/generate":     { limit: 5,  windowMs: 60_000 }, // 5 / min  — heavy Gemini + YouTube calls
  "/api/parse-resume-pdf":     { limit: 5,  windowMs: 60_000 }, // 5 / min  — PDF → base64 → Gemini
  "/api/roadmap/instructions": { limit: 20, windowMs: 60_000 }, // 20 / min — lighter Gemini call per node
};

/**
 * Returns { limited: false } if within the allowed rate,
 * or { limited: true, retryAfter: number } when the limit is exceeded.
 */
function checkRateLimit(ip, pathname) {
  const config = RATE_LIMITS[pathname];
  if (!config) return { limited: false };

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No entry yet, or previous window has expired — start fresh
  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { limited: false };
  }

  // Within the window and under the limit
  if (entry.count < config.limit) {
    entry.count++;
    return { limited: false };
  }

  // Limit exceeded — tell client how many seconds to wait
  const retryAfter = Math.ceil((config.windowMs - (now - entry.windowStart)) / 1000);
  return { limited: true, retryAfter };
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // ── Rate limiting (API routes only) ────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    const { limited, retryAfter } = checkRateLimit(ip, pathname);

    if (limited) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down and try again." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }
  }

  // ── Clerk auth — redirect unauthenticated users from protected pages ────────
  const { userId } = await auth();

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};