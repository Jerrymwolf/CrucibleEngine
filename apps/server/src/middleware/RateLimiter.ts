// =============================================================================
// RATE LIMITER MIDDLEWARE
// =============================================================================
//
// Provides rate limiting for auth attempts, messages, and session joins.
// Uses sliding window algorithm with optional extended blocking for brute force.
//
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blocked: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  blocked: boolean;
}

// =============================================================================
// RATE LIMITER CLASS
// =============================================================================

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly blockDurationMs: number = 0 // 0 = no extended block
  ) {
    // Cleanup stale entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Check if a request should be allowed
   */
  check(identifier: string): RateLimitResult {
    const now = Date.now();
    let entry = this.limits.get(identifier);

    // Check if blocked
    if (entry?.blocked && now < entry.resetAt) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetAt - now,
        blocked: true,
      };
    }

    // Reset if window expired
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs, blocked: false };
      this.limits.set(identifier, entry);
    }

    // Check limit
    if (entry.count >= this.maxRequests) {
      // Apply extended block if configured
      if (this.blockDurationMs > 0) {
        entry.blocked = true;
        entry.resetAt = now + this.blockDurationMs;
      }
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetAt - now,
        blocked: entry.blocked,
      };
    }

    // Increment and allow
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetAt - now,
      blocked: false,
    };
  }

  /**
   * Reset limit for an identifier (e.g., after successful auth)
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Get current count for an identifier
   */
  getCount(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() >= entry.resetAt) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Check if identifier is blocked
   */
  isBlocked(identifier: string): boolean {
    const entry = this.limits.get(identifier);
    return !!(entry?.blocked && Date.now() < entry.resetAt);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now >= entry.resetAt && !entry.blocked) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }
}

// =============================================================================
// PRE-CONFIGURED LIMITERS
// =============================================================================

const authMax = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10');
const authWindow = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000');
const msgMax = parseInt(process.env.RATE_LIMIT_MESSAGE_MAX || '100');
const msgWindow = parseInt(process.env.RATE_LIMIT_MESSAGE_WINDOW_MS || '60000');

/**
 * Auth limiter: 10 attempts/min, block for 5 min after exceeding
 * Used for: login attempts, token validation
 */
export const authLimiter = new RateLimiter(authMax, authWindow, 300_000);

/**
 * Message limiter: 100/min, no extended block
 * Used for: game messages, decisions, chat
 */
export const messageLimiter = new RateLimiter(msgMax, msgWindow);

/**
 * Session join limiter: 5/min per IP, block for 10 min
 * Used for: room join attempts
 */
export const joinLimiter = new RateLimiter(5, 60_000, 600_000);

/**
 * Session code limiter: 3 invalid attempts, block for 30 min
 * Used for: preventing brute force of session codes
 */
export const sessionCodeLimiter = new RateLimiter(3, 60_000, 1_800_000);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get client IP from various sources
 */
export function getClientIp(client: { req?: { socket?: { remoteAddress?: string } } }, fallback: string): string {
  return client.req?.socket?.remoteAddress || fallback;
}
