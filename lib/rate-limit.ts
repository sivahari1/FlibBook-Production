import { logger } from './logger';

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based solution like Upstash
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier for the rate limit (e.g., email, IP)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  // If no entry or window has expired, create new entry
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    logger.debug('Rate limit: new window', {
      identifier,
      resetAt: new Date(entry.resetAt),
    });

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    logger.logRateLimitViolation('rate-limit', identifier, {
      count: entry.count,
      maxRequests: config.maxRequests,
      retryAfter,
    });

    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimits(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Rate limit cleanup', { cleaned });
  }

  return cleaned;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  cleanupRateLimits();
}, 5 * 60 * 1000);

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  EMAIL_VERIFICATION_RESEND: {
    maxRequests: 1,
    windowMs: 60 * 1000, // 1 request per 60 seconds
  },
  PASSWORD_RESET_REQUEST: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 3 requests per hour
  },
  LOGIN_ATTEMPT: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 10 requests per hour
  },
  PASSWORD_RESET_SUBMIT: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 5 requests per hour
  },
  REGISTRATION: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 3 registrations per hour per email
  },
  PAYMENT_CREATE_ORDER: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 payment attempts per minute per user
  },
  PAYMENT_VERIFY: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 20 verification attempts per minute per user
  },
  ACCESS_REQUEST: {
    maxRequests: 2,
    windowMs: 24 * 60 * 60 * 1000, // 2 access requests per day per email
  },
} as const;
