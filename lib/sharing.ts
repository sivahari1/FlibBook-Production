/**
 * Utility functions for Secure Sharing & Inbox feature
 */

import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { ShareLink, DocumentShare, User } from '@prisma/client'

/**
 * Generate a cryptographically secure share key
 * Uses nanoid with 24 characters for URL-safe random strings
 * @returns A unique share key
 */
export function generateShareKey(): string {
  return nanoid(24)
}

/**
 * Hash a password using bcrypt with 12 rounds
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Verify a password against a bcrypt hash
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Check if a share has expired
 * @param expiresAt - Expiration date or null
 * @returns True if expired
 */
export function isShareExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date() > new Date(expiresAt)
}

/**
 * Check if a link share can be accessed by a user
 * @param share - ShareLink record
 * @param userEmail - Email of the user attempting access
 * @param hasValidPasswordCookie - Whether user has verified password
 * @returns Object with isValid flag and error details
 */
export function canAccessLinkShare(
  share: ShareLink,
  userEmail: string,
  hasValidPasswordCookie: boolean = false
): {
  isValid: boolean
  canAccess: boolean
  requiresPassword: boolean
  error?: { code: string; message: string }
} {
  // Check if share is active
  if (!share.isActive) {
    return {
      isValid: false,
      canAccess: false,
      requiresPassword: false,
      error: {
        code: 'INACTIVE',
        message: 'This share has been revoked',
      },
    }
  }

  // Check expiration
  if (isShareExpired(share.expiresAt)) {
    return {
      isValid: false,
      canAccess: false,
      requiresPassword: false,
      error: {
        code: 'EXPIRED',
        message: 'This share has expired',
      },
    }
  }

  // Check view limit
  if (share.maxViews && share.viewCount >= share.maxViews) {
    return {
      isValid: false,
      canAccess: false,
      requiresPassword: false,
      error: {
        code: 'VIEW_LIMIT_EXCEEDED',
        message: 'This share has reached its maximum view limit',
      },
    }
  }

  // Check email restriction
  if (share.restrictToEmail && share.restrictToEmail !== userEmail) {
    return {
      isValid: false,
      canAccess: false,
      requiresPassword: false,
      error: {
        code: 'EMAIL_MISMATCH',
        message: 'This share is restricted to a different email address',
      },
    }
  }

  // Check password requirement
  if (share.password && !hasValidPasswordCookie) {
    return {
      isValid: true,
      canAccess: false,
      requiresPassword: true,
      error: {
        code: 'PASSWORD_REQUIRED',
        message: 'Password required to access this share',
      },
    }
  }

  return {
    isValid: true,
    canAccess: true,
    requiresPassword: false,
  }
}

/**
 * Check if an email share can be accessed by a user
 * @param share - DocumentShare record
 * @param userId - ID of the user attempting access
 * @param userEmail - Email of the user attempting access
 * @returns Object with isValid flag and error details
 */
export function canAccessEmailShare(
  share: DocumentShare & { sharedWithUser?: User | null },
  userId: string,
  userEmail: string
): {
  isValid: boolean
  error?: { code: string; message: string }
} {
  // Check expiration
  if (isShareExpired(share.expiresAt)) {
    return {
      isValid: false,
      error: {
        code: 'EXPIRED',
        message: 'This share has expired',
      },
    }
  }

  // Check if user matches
  const matchesUserId = share.sharedWithUserId === userId
  const matchesEmail = share.sharedWithEmail === userEmail

  if (!matchesUserId && !matchesEmail) {
    return {
      isValid: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This document was not shared with you',
      },
    }
  }

  return {
    isValid: true,
  }
}

/**
 * Format share URL
 * @param shareKey - The share key
 * @param baseUrl - Base URL of the application
 * @returns Complete share URL
 */
export function formatShareUrl(shareKey: string, baseUrl: string): string {
  return `${baseUrl}/view/${shareKey}`
}

/**
 * Generate a password cookie name for a share
 * @param shareKey - The share key
 * @returns Cookie name string
 */
export function getPasswordCookieName(shareKey: string): string {
  return `share_pwd_${shareKey}`
}

/**
 * Calculate cookie expiration time (1 hour from now)
 * @returns Date object representing expiration time
 */
export function getPasswordCookieExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 1)
  return expiry
}

/**
 * Extract IP address from request headers
 * @param headers - Request headers object
 * @returns IP address string or null
 */
export function getClientIP(headers: Headers): string | null {
  // Try various headers in order of preference
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]

  for (const header of ipHeaders) {
    const value = headers.get(header)
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }

  return null
}

/**
 * Extract user agent from request headers
 * @param headers - Request headers object
 * @returns User agent string or null
 */
export function getUserAgent(headers: Headers): string | null {
  return headers.get('user-agent') || null
}

/**
 * Sanitize a note string for safe storage and display
 * @param note - Raw note string
 * @returns Sanitized note string
 */
export function sanitizeNote(note: string): string {
  return note
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .substring(0, 500) // Enforce length limit
}

/**
 * Get base URL from request headers
 * @param headers - Request headers object
 * @returns Base URL string
 */
export function getBaseUrl(headers: Headers): string {
  // Try to get from environment variables first
  const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL
  if (authUrl) {
    return authUrl
  }

  // Fallback to request headers
  const host = headers.get('host')
  const protocol = headers.get('x-forwarded-proto') || 'https'
  
  if (host) {
    return `${protocol}://${host}`
  }

  // Final fallback
  return 'http://localhost:3000'
}


