/**
 * PDF.js Authentication Utilities
 * 
 * Requirements: 8.4 - Authentication handling for signed URLs
 * 
 * Handles:
 * 1. Passing authentication with signed URLs
 * 2. Token expiration detection
 * 3. Token refresh when needed
 */

import { getSignedUrl } from './storage';

/**
 * Signed URL with expiration tracking
 */
export interface AuthenticatedPDFSource {
  /** Signed URL for PDF */
  url: string;
  
  /** Expiration timestamp (milliseconds since epoch) */
  expiresAt: number;
  
  /** Storage path for regenerating URL */
  storagePath: string;
  
  /** Bucket name */
  bucket: string;
}

/**
 * Create an authenticated PDF source with expiration tracking
 * 
 * @param storagePath - Storage path of the PDF
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param bucket - Storage bucket name (default: 'documents')
 * @returns Authenticated PDF source
 */
export async function createAuthenticatedPDFSource(
  storagePath: string,
  expiresIn: number = 3600,
  bucket: string = 'documents'
): Promise<AuthenticatedPDFSource | null> {
  const { url, error } = await getSignedUrl(storagePath, expiresIn, bucket, {
    download: false, // Critical for fetch API
  });
  
  if (error || !url) {
    console.error('Failed to create authenticated PDF source:', error);
    return null;
  }
  
  return {
    url,
    expiresAt: Date.now() + (expiresIn * 1000),
    storagePath,
    bucket,
  };
}

/**
 * Check if a signed URL has expired or is about to expire
 * 
 * @param source - Authenticated PDF source
 * @param bufferSeconds - Consider expired if within this many seconds of expiration (default: 60)
 * @returns True if expired or about to expire
 */
export function isSignedUrlExpired(
  source: AuthenticatedPDFSource,
  bufferSeconds: number = 60
): boolean {
  const now = Date.now();
  const bufferMs = bufferSeconds * 1000;
  return now >= (source.expiresAt - bufferMs);
}

/**
 * Refresh an expired signed URL
 * 
 * @param source - Authenticated PDF source to refresh
 * @param expiresIn - New expiration time in seconds (default: 3600)
 * @returns Refreshed authenticated PDF source
 */
export async function refreshSignedUrl(
  source: AuthenticatedPDFSource,
  expiresIn: number = 3600
): Promise<AuthenticatedPDFSource | null> {
  console.log('Refreshing signed URL:', {
    storagePath: source.storagePath,
    oldExpiresAt: new Date(source.expiresAt).toISOString(),
  });
  
  return createAuthenticatedPDFSource(
    source.storagePath,
    expiresIn,
    source.bucket
  );
}

/**
 * Get a valid signed URL, refreshing if necessary
 * 
 * @param source - Authenticated PDF source
 * @param expiresIn - Expiration time for refresh (default: 3600)
 * @returns Valid signed URL
 */
export async function getValidSignedUrl(
  source: AuthenticatedPDFSource,
  expiresIn: number = 3600
): Promise<string | null> {
  // Check if URL needs refresh
  if (isSignedUrlExpired(source)) {
    const refreshed = await refreshSignedUrl(source, expiresIn);
    if (!refreshed) {
      return null;
    }
    // Update the source object
    source.url = refreshed.url;
    source.expiresAt = refreshed.expiresAt;
  }
  
  return source.url;
}

/**
 * HTTP headers for authenticated requests
 * 
 * Note: Signed URLs include authentication in the URL itself,
 * so additional headers are typically not needed. However,
 * this function is provided for custom authentication scenarios.
 */
export interface AuthHeaders {
  /** Authorization header */
  Authorization?: string;
  
  /** Custom headers */
  [key: string]: string | undefined;
}

/**
 * Create HTTP headers for authenticated PDF requests
 * 
 * @param token - Optional bearer token
 * @returns HTTP headers object
 */
export function createAuthHeaders(token?: string): AuthHeaders {
  const headers: AuthHeaders = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Handle authentication errors from PDF.js
 * 
 * @param error - Error from PDF.js
 * @returns True if error is authentication-related
 */
export function isAuthenticationError(error: Error): boolean {
  const authErrorPatterns = [
    /unauthorized/i,
    /forbidden/i,
    /401/,
    /403/,
    /authentication/i,
    /access denied/i,
  ];
  
  return authErrorPatterns.some(pattern => 
    pattern.test(error.message) || pattern.test(error.name)
  );
}

/**
 * Retry PDF loading with refreshed authentication
 * 
 * @param source - Authenticated PDF source
 * @param loadFn - Function to load PDF
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns Result from load function
 */
export async function retryWithAuth<T>(
  source: AuthenticatedPDFSource,
  loadFn: (url: string) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get valid URL (refresh if needed)
      const url = await getValidSignedUrl(source);
      if (!url) {
        throw new Error('Failed to get valid signed URL');
      }
      
      // Attempt to load
      return await loadFn(url);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's an authentication error
      if (isAuthenticationError(lastError)) {
        console.log(`Authentication error on attempt ${attempt + 1}, refreshing URL...`);
        
        // Force refresh the URL
        const refreshed = await refreshSignedUrl(source);
        if (refreshed) {
          source.url = refreshed.url;
          source.expiresAt = refreshed.expiresAt;
          continue; // Retry with new URL
        }
      }
      
      // If not auth error or last attempt, throw
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error('Failed after retries');
}

/**
 * Calculate time until URL expiration
 * 
 * @param source - Authenticated PDF source
 * @returns Milliseconds until expiration (negative if already expired)
 */
export function getTimeUntilExpiration(source: AuthenticatedPDFSource): number {
  return source.expiresAt - Date.now();
}

/**
 * Format expiration time as human-readable string
 * 
 * @param source - Authenticated PDF source
 * @returns Human-readable expiration time
 */
export function formatExpirationTime(source: AuthenticatedPDFSource): string {
  const ms = getTimeUntilExpiration(source);
  
  if (ms < 0) {
    return 'Expired';
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
