import crypto from 'crypto'

/**
 * Generate a cryptographically secure share key
 * @param length - Length of random bytes (default: 32)
 * @returns Base64url encoded share key
 */
export function generateShareKey(length: number = 32): string {
  const buffer = crypto.randomBytes(length)
  // Use base64url encoding (URL-safe, no padding)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Format date to readable string
 * @param date - Date object or ISO string
 * @param includeTime - Whether to include time (default: true)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, includeTime: boolean = true): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return 'Invalid Date'
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return d.toLocaleDateString('en-US', options)
}

/**
 * Format timestamp for watermark display
 * @param date - Date object or ISO string
 * @returns Formatted timestamp (e.g., "2024-01-15 14:30")
 */
export function formatWatermarkTimestamp(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return 'Invalid Date'
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Generate watermark text
 * @param email - Viewer's email
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Watermark text string
 */
export function generateWatermarkText(email: string, timestamp?: Date | string): string {
  const ts = formatWatermarkTimestamp(timestamp)
  return `${email} - ${ts}`
}

/**
 * Calculate time remaining until expiration
 * @param expiresAt - Expiration date
 * @returns Human-readable time remaining or null if expired
 */
export function getTimeRemaining(expiresAt: Date | string): string | null {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const now = new Date()

  if (expiry <= now) {
    return null // Expired
  }

  const diff = expiry.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }
}

/**
 * Check if a share link is expired
 * @param expiresAt - Expiration date (null means no expiration)
 * @returns True if expired
 */
export function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) {
    return false // No expiration set
  }

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expiry <= new Date()
}

/**
 * Generate a unique document ID
 * @returns Unique ID string
 */
export function generateDocumentId(): string {
  return crypto.randomUUID()
}

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: "...")
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Convert bytes to appropriate storage unit
 * @param bytes - Number of bytes
 * @returns Object with value and unit
 */
export function bytesToUnit(bytes: number): { value: number; unit: string } {
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const k = 1024

  if (bytes === 0) {
    return { value: 0, unit: 'Bytes' }
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2))

  return { value, unit: units[i] }
}

/**
 * Create a storage path for a document
 * @param userId - User ID
 * @param documentId - Document ID
 * @param filename - Original filename
 * @returns Storage path string
 */
export function createStoragePath(userId: string, documentId: string, filename: string): string {
  const extension = filename.substring(filename.lastIndexOf('.'))
  return `${userId}/${documentId}${extension}`
}

/**
 * Extract IP address from request headers
 * @param headers - Request headers object
 * @returns IP address string
 */
export function getIpAddress(headers: Headers): string {
  // Check common headers for IP address
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return 'unknown'
}

/**
 * Combine class names (utility for Tailwind CSS)
 * @param classes - Class names to combine
 * @returns Combined class string
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
