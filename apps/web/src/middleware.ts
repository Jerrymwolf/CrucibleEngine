import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// =============================================================================
// ROUTE MATCHERS
// =============================================================================

/**
 * Clerk Authentication Middleware with CVE-2025-29927 Defense-in-Depth
 *
 * Route protection strategy:
 * - Public routes: Home, join sessions, spectate, sign-in/up, webhooks
 * - CM routes: Require authentication (Crucible Master dashboard)
 * - API routes: Protected based on endpoint
 *
 * Security: Blocks middleware bypass attempts (CVE-2025-29927)
 */

// Public routes - no authentication required
const isPublicRoute = createRouteMatcher([
  '/',
  '/join(.*)',
  '/session/(.*)',         // Participants join via session code
  '/spectate/(.*)',        // Spectator mode
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/(.*)',    // Webhook endpoints
  '/api/health(.*)',       // Health check
  '/api/session/validate(.*)', // Anonymous session validation
]);

// CM routes - require authentication
const isCMRoute = createRouteMatcher([
  '/cm(.*)',
  '/api/simulations/(.*)',
  '/api/cm/(.*)',
]);

// =============================================================================
// SECURITY: CVE-2025-29927 DEFENSE-IN-DEPTH
// =============================================================================

/**
 * Headers that could be used to bypass middleware
 * Reference: https://github.com/advisories/GHSA-f82v-jwr5-mffw
 *
 * These headers should NEVER be present in external requests.
 * Their presence indicates an attack attempt.
 */
const BLOCKED_HEADERS = [
  'x-middleware-subrequest',
  'x-middleware-invoke',
  'x-invoke-path',
  'x-invoke-query',
  'x-middleware-rewrite',
];

/**
 * Block any request that contains bypass headers
 *
 * This is a defense-in-depth measure. Even with Next.js patched,
 * we explicitly reject these headers to prevent future variants.
 *
 * @returns NextResponse with 403 status if bypass attempted, null otherwise
 */
function blockBypassAttempts(req: NextRequest): NextResponse | null {
  for (const header of BLOCKED_HEADERS) {
    if (req.headers.has(header)) {
      // Log the attempt (don't include header value for security)
      console.error(
        `[SECURITY] BLOCKED middleware bypass attempt: ${header} from ${
          req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
        } to ${req.nextUrl.pathname}`
      );

      // Return generic 403 - don't leak which header triggered it
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  return null;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Check if Clerk is configured
const hasClerkKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Passthrough middleware when Clerk is not configured
 * Still applies security checks
 */
function passthroughMiddleware(req: NextRequest) {
  // FIRST: Block bypass attempts even without Clerk
  const blocked = blockBypassAttempts(req);
  if (blocked) return blocked;

  return NextResponse.next();
}

/**
 * Clerk middleware when configured
 * Applies both security checks and authentication
 */
const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  // FIRST: Block bypass attempts before any auth logic
  const blocked = blockBypassAttempts(req);
  if (blocked) return blocked;

  // Public routes - no auth required
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // CM routes - require auth
  if (isCMRoute(req)) {
    try {
      await auth.protect();
    } catch {
      // Redirect to sign-in if not authenticated
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  return NextResponse.next();
});

export default hasClerkKey ? protectedMiddleware : passthroughMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
