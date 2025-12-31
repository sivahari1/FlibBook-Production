import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ContentType } from './types/content'

const BUCKET_NAME = 'documents' // Default bucket for PDFs

// Bucket mapping for different content types
const BUCKET_MAP: Record<ContentType, string> = {
  [ContentType.PDF]: 'documents',
  [ContentType.IMAGE]: 'images',
  [ContentType.VIDEO]: 'videos',
  [ContentType.LINK]: 'documents' // Links don't need storage
}

// Lazy-load Supabase client to avoid build-time initialization
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return _supabaseAdmin
}

/**
 * Get the appropriate bucket name for a content type
 * Requirements: 3.3, 4.3
 */
export function getBucketForContentType(contentType: ContentType): string {
  return BUCKET_MAP[contentType] || BUCKET_NAME
}

/**
 * Upload a file to Supabase Storage
 * @param file - File buffer or Blob to upload
 * @param path - Storage path (e.g., "userId/documentId.pdf")
 * @param contentType - MIME type of the file
 * @param bucketName - Optional bucket name (defaults to 'documents')
 * @returns Storage path on success
 */
export async function uploadFile(
  file: Buffer | Blob,
  path: string,
  contentType: string = 'application/pdf',
  bucketName: string = BUCKET_NAME
): Promise<{ path: string; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(path, file, {
        contentType,
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { path: '', error: error.message }
    }

    return { path: data.path }
  } catch (error) {
    console.error('Upload file exception:', error)
    return { path: '', error: 'Failed to upload file' }
  }
}

/**
 * Download a file from Supabase Storage
 * @param path - Storage path of the file
 * @param bucketName - Optional bucket name (defaults to 'documents')
 * @returns File blob on success
 */
export async function downloadFile(
  path: string,
  bucketName: string = BUCKET_NAME
): Promise<{ data?: Blob; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .download(path)

    if (error) {
      console.error('Storage download error:', error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Download file exception:', error)
    return { error: 'Failed to download file' }
  }
}

/**
 * Generate a signed URL for temporary file access
 * 
 * Requirements: 8.1, 8.3 - CORS headers and signed URL compatibility
 * 
 * @param path - Storage path of the file
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param bucketName - Optional bucket name (defaults to 'documents')
 * @param options - Additional options for signed URL generation
 * @returns Signed URL on success
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600,
  bucketName: string = BUCKET_NAME,
  options?: {
    download?: boolean;
    transform?: Record<string, unknown>;
  }
): Promise<{ url?: string; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Configure signed URL options for PDF.js compatibility
    // - Don't force download to allow fetch API access
    // - No transformations to preserve original file
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(path, expiresIn, {
        download: options?.download ?? false,
        transform: options?.transform,
      })

    if (error) {
      console.error('Signed URL error:', error)
      return { error: error.message }
    }

    // Supabase signed URLs automatically include CORS headers
    // when accessed via fetch API. The storage bucket must be
    // configured with CORS settings in Supabase dashboard.
    return { url: data.signedUrl }
  } catch (error) {
    console.error('Get signed URL exception:', error)
    return { error: 'Failed to generate signed URL' }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param path - Storage path of the file
 * @param bucketName - Optional bucket name (defaults to 'documents')
 * @returns Success status
 */
export async function deleteFile(
  path: string,
  bucketName: string = BUCKET_NAME
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete file exception:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

/**
 * Delete a file from a specific bucket in Supabase Storage
 * Bucket-aware deletion for PDF-only storage implementation
 * @param bucket - Bucket name (e.g., 'documents')
 * @param path - Storage path of the file (bucket-relative path)
 * @returns Success status
 */
export async function deleteFileFromBucket(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete file exception:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}

/**
 * Legacy alias for bucket-aware deletion
 * @deprecated Use deleteFileFromBucket instead
 */
export const deleteFromStorage = deleteFileFromBucket

/**
 * Get public URL for a file (for public buckets only)
 * @param path - Storage path of the file
 * @param bucketName - Optional bucket name (defaults to 'documents')
 * @returns Public URL
 */
export function getPublicUrl(path: string, bucketName: string = BUCKET_NAME): string {
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = supabaseAdmin.storage
    .from(bucketName)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * List files in a directory
 * @param path - Directory path (e.g., "userId/")
 * @param bucketName - Optional bucket name (defaults to 'documents')
 * @returns List of files
 */
export async function listFiles(
  path: string,
  bucketName: string = BUCKET_NAME
): Promise<{ files?: Array<any>; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(path)

    if (error) {
      console.error('Storage list error:', error)
      return { error: error.message }
    }

    return { files: data }
  } catch (error) {
    console.error('List files exception:', error)
    return { error: 'Failed to list files' }
  }
}
/**
 * Infer content type from file path extension
 * @param path - File path or URL
 * @returns MIME type string
 */
export function inferContentTypeFromPath(path: string): string {
  const extension = path.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}