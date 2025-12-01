/**
 * PDF to Image Conversion Service
 * 
 * Converts PDF documents to optimized JPG images for flipbook display.
 * Implements performance optimizations to meet < 5 seconds conversion requirement.
 * 
 * Requirements: 2.1, 2.2, 2.3, 17.1
 */

import sharp from 'sharp';
import { fromPath } from 'pdf2pic';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ConversionOptions {
  documentId: string;
  userId: string;
  pdfPath: string;
  quality?: number;
  dpi?: number;
  format?: 'jpg' | 'png' | 'webp';
}

export interface ConversionResult {
  success: boolean;
  pageCount: number;
  pageUrls: string[];
  processingTime: number;
  error?: string;
}

export interface PageConversionResult {
  pageNumber: number;
  url: string;
  size: number;
}

/**
 * Main PDF conversion function with performance optimizations
 * 
 * Optimizations:
 * - Parallel page processing (up to CPU cores)
 * - Optimized Sharp settings for speed
 * - Efficient memory management
 * - Batch uploads to storage
 * 
 * @param options Conversion configuration
 * @returns Conversion result with page URLs and timing
 */
export async function convertPdfToImages(
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = Date.now();
  const {
    documentId,
    userId,
    pdfPath,
    quality = 85,
    dpi = 150,
    format = 'jpg',
  } = options;

  try {
    logger.info('Starting PDF conversion', {
      documentId,
      userId,
      quality,
      dpi,
      format,
    });

    // Create temporary directory for conversion
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'));

    try {
      // Configure pdf2pic for optimal performance
      const converter = fromPath(pdfPath, {
        density: dpi,
        saveFilename: 'page',
        savePath: tempDir,
        format,
        width: 1200, // Fixed width for consistent sizing
        height: 1600, // Aspect ratio maintained
      });

      // Get page count first
      const pageCount = await getPageCount(pdfPath);
      logger.info(`PDF has ${pageCount} pages`);

      // Convert pages in parallel batches
      const batchSize = Math.min(os.cpus().length, 4); // Limit to 4 concurrent conversions
      const pageUrls: string[] = [];

      for (let i = 0; i < pageCount; i += batchSize) {
        const batch = [];
        const endIndex = Math.min(i + batchSize, pageCount);

        for (let pageNum = i + 1; pageNum <= endIndex; pageNum++) {
          batch.push(
            convertAndUploadPage(
              converter,
              pageNum,
              tempDir,
              userId,
              documentId,
              quality,
              format
            )
          );
        }

        // Process batch in parallel
        const results = await Promise.all(batch);
        pageUrls.push(...results.map((r) => r.url));

        logger.info(`Converted pages ${i + 1}-${endIndex} of ${pageCount}`);
      }

      const processingTime = Date.now() - startTime;

      logger.info('PDF conversion completed', {
        documentId,
        pageCount,
        processingTime,
        avgTimePerPage: processingTime / pageCount,
      });

      return {
        success: true,
        pageCount,
        pageUrls,
        processingTime,
      };
    } finally {
      // Cleanup temporary directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('PDF conversion failed', {
      documentId,
      error: errorMessage,
      processingTime,
    });

    return {
      success: false,
      pageCount: 0,
      pageUrls: [],
      processingTime,
      error: errorMessage,
    };
  }
}

/**
 * Convert a single page and upload to storage
 * 
 * @param converter pdf2pic converter instance
 * @param pageNumber Page number to convert (1-indexed)
 * @param tempDir Temporary directory for conversion
 * @param userId User ID for storage path
 * @param documentId Document ID for storage path
 * @param quality JPEG quality (0-100)
 * @param format Output format
 * @returns Page conversion result
 */
async function convertAndUploadPage(
  converter: any,
  pageNumber: number,
  tempDir: string,
  userId: string,
  documentId: string,
  quality: number,
  format: string
): Promise<PageConversionResult> {
  try {
    // Convert page to image
    const result = await converter(pageNumber, { responseType: 'image' });

    if (!result || !result.path) {
      throw new Error(`Failed to convert page ${pageNumber}`);
    }

    // Optimize image with Sharp
    const optimizedBuffer = await sharp(result.path)
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .resize({
        width: 1200,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // Upload to Supabase storage
    const storagePath = `${userId}/${documentId}/page-${pageNumber}.${format}`;
    const { data, error } = await supabase.storage
      .from('document-pages')
      .upload(storagePath, optimizedBuffer, {
        contentType: `image/${format}`,
        upsert: true,
        cacheControl: '604800', // 7 days
      });

    if (error) {
      throw new Error(`Upload failed for page ${pageNumber}: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('document-pages')
      .getPublicUrl(storagePath);

    return {
      pageNumber,
      url: urlData.publicUrl,
      size: optimizedBuffer.length,
    };
  } catch (error) {
    logger.error(`Failed to convert page ${pageNumber}`, { error });
    throw error;
  }
}

/**
 * Get the number of pages in a PDF using pdfjs-dist
 * 
 * @param pdfPath Path to PDF file
 * @returns Number of pages
 */
async function getPageCount(pdfPath: string): Promise<number> {
  try {
    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);
    
    // Use pdfjs-dist to get page count
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Load PDF document
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    
    logger.info('PDF page count determined', { pageCount });
    
    return pageCount;
  } catch (error) {
    logger.error('Failed to get page count', { error });
    // Fallback: try to estimate from file size
    // Average PDF page is ~100KB, so rough estimate
    try {
      const stats = await fs.stat(pdfPath);
      const estimatedPages = Math.max(1, Math.ceil(stats.size / 100000));
      logger.warn('Using estimated page count', { estimatedPages });
      return estimatedPages;
    } catch {
      return 1; // Default to 1 page
    }
  }
}

/**
 * Check if pages already exist in storage
 * 
 * @param userId User ID
 * @param documentId Document ID
 * @returns True if pages exist
 */
export async function checkPagesExist(
  userId: string,
  documentId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('document-pages')
      .list(`${userId}/${documentId}`);

    if (error) {
      logger.error('Failed to check existing pages', { error });
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    logger.error('Error checking pages existence', { error });
    return false;
  }
}

/**
 * Get URLs for existing pages
 * 
 * @param userId User ID
 * @param documentId Document ID
 * @returns Array of page URLs
 */
export async function getExistingPageUrls(
  userId: string,
  documentId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from('document-pages')
      .list(`${userId}/${documentId}`);

    if (error || !data) {
      return [];
    }

    // Sort by page number
    const sortedPages = data
      .filter((file) => file.name.startsWith('page-'))
      .sort((a, b) => {
        const aNum = parseInt(a.name.match(/page-(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.name.match(/page-(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });

    // Get public URLs
    return sortedPages.map((file) => {
      const storagePath = `${userId}/${documentId}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from('document-pages')
        .getPublicUrl(storagePath);
      return urlData.publicUrl;
    });
  } catch (error) {
    logger.error('Failed to get existing page URLs', { error });
    return [];
  }
}

/**
 * Delete all pages for a document
 * 
 * @param userId User ID
 * @param documentId Document ID
 */
export async function deleteDocumentPages(
  userId: string,
  documentId: string
): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from('document-pages')
      .list(`${userId}/${documentId}`);

    if (error || !data || data.length === 0) {
      return;
    }

    const filePaths = data.map((file) => `${userId}/${documentId}/${file.name}`);

    const { error: deleteError } = await supabase.storage
      .from('document-pages')
      .remove(filePaths);

    if (deleteError) {
      logger.error('Failed to delete document pages', { deleteError });
    }
  } catch (error) {
    logger.error('Error deleting document pages', { error });
  }
}
