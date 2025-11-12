/**
 * Validation utilities for file uploads and user inputs
 */

// File validation constants
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
export const ALLOWED_FILE_TYPES = ['application/pdf']
export const ALLOWED_FILE_EXTENSIONS = ['.pdf']

/**
 * Validate file type by MIME type
 * @param mimeType - MIME type of the file
 * @returns True if valid PDF type
 */
export function isValidFileType(mimeType: string): boolean {
  return ALLOWED_FILE_TYPES.includes(mimeType.toLowerCase())
}

/**
 * Validate file extension
 * @param filename - Name of the file
 * @returns True if valid PDF extension
 */
export function isValidFileExtension(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return ALLOWED_FILE_EXTENSIONS.includes(extension)
}

/**
 * Validate file size
 * @param size - Size of the file in bytes
 * @param maxSize - Maximum allowed size (default: 50MB)
 * @returns True if within size limit
 */
export function isValidFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
  return size > 0 && size <= maxSize
}

/**
 * Comprehensive file validation
 * @param file - File object with name, type, and size
 * @returns Validation result with error message if invalid
 */
export function validateFile(file: {
  name: string
  type: string
  size: number
}): { valid: boolean; error?: string } {
  // Check file type
  if (!isValidFileType(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF files are allowed.'
    }
  }

  // Check file extension
  if (!isValidFileExtension(file.name)) {
    return {
      valid: false,
      error: 'Invalid file extension. Only .pdf files are allowed.'
    }
  }

  // Check file size
  if (!isValidFileSize(file.size)) {
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty.'
      }
    }
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    }
  }

  return { valid: true }
}

/**
 * Validate email format using regex
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validate email with detailed error message
 * @param email - Email address to validate
 * @returns Validation result with error message if invalid
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return {
      valid: false,
      error: 'Email is required.'
    }
  }

  if (!isValidEmail(email)) {
    return {
      valid: false,
      error: 'Invalid email format.'
    }
  }

  return { valid: true }
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @param minLength - Minimum password length (default: 8)
 * @returns Validation result with error message if invalid
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): { valid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return {
      valid: false,
      error: 'Password is required.'
    }
  }

  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters long.`
    }
  }

  return { valid: true }
}

/**
 * Sanitize filename to prevent path traversal attacks
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255) // Limit length
}

/**
 * Validate storage quota
 * @param currentUsage - Current storage used in bytes
 * @param fileSize - Size of new file in bytes
 * @param maxStorage - Maximum storage allowed in bytes
 * @returns Validation result with error message if quota exceeded
 */
export function validateStorageQuota(
  currentUsage: number,
  fileSize: number,
  maxStorage: number
): { valid: boolean; error?: string } {
  const newUsage = currentUsage + fileSize

  if (newUsage > maxStorage) {
    const availableSpace = maxStorage - currentUsage
    return {
      valid: false,
      error: `Storage quota exceeded. Available: ${formatBytes(availableSpace)}, Required: ${formatBytes(fileSize)}`
    }
  }

  return { valid: true }
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
