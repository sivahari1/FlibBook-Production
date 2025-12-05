/**
 * Supabase Storage URL Helper
 * 
 * Centralized utility for generating correct Supabase storage URLs
 * Prevents 400 Bad Request errors by ensuring proper URL construction
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase Storage] Missing environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get public URL for a document page image
 * Uses Supabase's getPublicUrl method to avoid manual URL construction errors
 * 
 * Note: The actual storage path includes userId, but we need to extract it from existing URLs
 * or pass it as a parameter. For now, we'll use a simpler approach that works with the cache.
 * 
 * @param documentId - Document ID
 * @param pageIndex - Page index (0-based)
 * @param userId - Optional user ID (if known)
 * @returns Public URL for the page image
 */
export function getDocumentPageUrl(documentId: string, pageIndex: number, userId?: string): string {
  // If userId is provided, use the full path
  // Otherwise, just use documentId (works if pages are cached with full URLs)
  const path = userId 
    ? `${userId}/${documentId}/page-${pageIndex + 1}.jpg`
    : `${documentId}/page-${pageIndex + 1}.jpg`;
    
  const { data } = supabase.storage
    .from('document-pages')
    .getPublicUrl(path);
  
  const url = data.publicUrl;
  
  console.debug('[Storage URL] Generated page URL:', {
    documentId,
    pageIndex,
    userId: userId ? '***' : undefined,
    path,
    url,
  });
  
  return url;
}

/**
 * Extract storage path from a full Supabase URL
 * Useful for regenerating URLs from cached data
 * 
 * @param url - Full Supabase storage URL
 * @returns Storage path (without bucket)
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf('public') + 1;
    
    if (bucketIndex > 0 && bucketIndex < pathParts.length) {
      return pathParts.slice(bucketIndex + 1).join('/'); // Skip bucket name
    }
    
    return null;
  } catch (error) {
    console.error('[Storage URL] Failed to extract path from URL:', { url, error });
    return null;
  }
}

/**
 * Get public URLs for all pages of a document
 * 
 * @param documentId - Document ID
 * @param totalPages - Total number of pages
 * @returns Array of public URLs
 */
export function getDocumentPageUrls(documentId: string, totalPages: number): string[] {
  const urls: string[] = [];
  
  for (let i = 0; i < totalPages; i++) {
    urls.push(getDocumentPageUrl(documentId, i));
  }
  
  console.log('[Storage URL] Generated URLs for', totalPages, 'pages');
  
  return urls;
}

/**
 * Verify if a storage URL is accessible
 * Useful for debugging 400/404 errors
 * 
 * @param url - URL to verify
 * @returns Promise<boolean> - true if accessible
 */
export async function verifyStorageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const accessible = response.ok;
    
    console.debug('[Storage URL] Verification:', {
      url,
      status: response.status,
      accessible,
    });
    
    return accessible;
  } catch (error) {
    console.error('[Storage URL] Verification failed:', { url, error });
    return false;
  }
}

/**
 * Get the bucket name for document pages
 */
export const DOCUMENT_PAGES_BUCKET = 'document-pages';

/**
 * Get the storage path for a document page
 * 
 * @param documentId - Document ID
 * @param pageNumber - Page number (1-based)
 * @returns Storage path
 */
export function getDocumentPagePath(documentId: string, pageNumber: number): string {
  return `${documentId}/page-${pageNumber}.jpg`;
}
