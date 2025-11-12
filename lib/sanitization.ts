/**
 * Input sanitization utilities for API security
 * Requirements: 9.3 - Sanitize and validate all parameters to prevent SQL injection and XSS attacks
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * Prevents XSS attacks by escaping HTML and script tags
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .slice(0, 1000); // Limit length to prevent DoS
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .slice(0, 254); // RFC 5321 max email length
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  return num;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === '') return null;
  
  const num = typeof input === 'string' ? parseInt(input, 10) : Math.floor(input);
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  return num;
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: string | boolean | null | undefined): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true' || input === '1';
  }
  return false;
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (!filename) return '';
  
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove multiple dots (path traversal)
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 255); // Limit filename length
}

/**
 * Sanitize object by applying sanitization to all string values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  stringFields: (keyof T)[]
): T {
  const sanitized = { ...obj };
  
  for (const field of stringFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field] as string) as T[keyof T];
    }
  }
  
  return sanitized;
}

/**
 * Rate limiting helper - simple in-memory store
 * For production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  if (!record || record.resetAt < now) {
    // Create new record
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}
