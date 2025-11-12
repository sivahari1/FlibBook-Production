import { createClient, SupabaseClient } from '@supabase/supabase-js'

const BUCKET_NAME = 'documents'

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
 * Upload a file to Supabase Storage
 * @param file - File buffer or Blob to upload
 * @param path - Storage path (e.g., "userId/documentId.pdf")
 * @param contentType - MIME type of the file
 * @returns Storage path on success
 */
export async function uploadFile(
  file: Buffer | Blob,
  path: string,
  contentType: string = 'application/pdf'
): Promise<{ path: string; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
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
 * @returns File blob on success
 */
export async function downloadFile(path: string): Promise<{ data?: Blob; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
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
 * @param path - Storage path of the file
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL on success
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return { error: error.message }
    }

    return { url: data.signedUrl }
  } catch (error) {
    console.error('Get signed URL exception:', error)
    return { error: 'Failed to generate signed URL' }
  }
}

/**
 * Delete a file from Supabase Storage
 * @param path - Storage path of the file
 * @returns Success status
 */
export async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
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
 * Get public URL for a file (for public buckets only)
 * @param path - Storage path of the file
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * List files in a directory
 * @param path - Directory path (e.g., "userId/")
 * @returns List of files
 */
export async function listFiles(path: string): Promise<{ files?: any[]; error?: string }> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
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
