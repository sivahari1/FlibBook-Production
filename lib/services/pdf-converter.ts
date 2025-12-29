/**
 * PDF to Image Conversion Service
 * 
 * Converts PDF documents to optimized JPG images for flipbook display.
 * Uses Poppler pdftoppm for reliable PDF→image conversion.
 * 
 * CRITICAL FIX: Replaced pdfjs-dist with Poppler pdftoppm to prevent blank pages
 * 
 * Requirements: 2.1, 2.2, 2.3, 17.1
 */

import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { convertPdfToImages as convertWithPoppler } from '@/lib/pdf/convertPdfToImages';

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
 * Main PDF conversion function using Poppler pdftoppm
 * 
 * Optimizations:
 * - Uses Poppler pdftoppm for reliable PDF rendering
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
    logger.info('Starting PDF conversion with Poppler', {
      documentId,
      userId,
      quality,
      dpi,
      format,
    });

    // Create temporary directory for conversion
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'));
    const tempPdfPath = path.join(tempDir, 'document.pdf');
    const tempOutputDir = path.join(tempDir, 'pages');

    try {
      // Download PDF from Supabase storage
      logger.info('Downloading PDF from storage', { pdfPath });
      const { downloadFile } = await import('../storage');
      const downloadResult = await downloadFile(pdfPath, 'documents');
      
      if (downloadResult.error || !downloadResult.data) {
        throw new Error(`Failed to download PDF: ${downloadResult.error}`);
      }

      // Save PDF to temporary file
      const pdfBuffer = Buffer.from(await downloadResult.data.arrayBuffer());
      await fs.writeFile(tempPdfPath, pdfBuffer);
      
      logger.info('PDF downloaded and saved to temp file', { 
        tempPath: tempPdfPath,
        sizeKB: (pdfBuffer.length / 1024).toFixed(2)
      });

      // Convert PDF to images using Poppler pdftoppm
      logger.info('Converting PDF to images with Poppler pdftoppm');
      await convertWithPoppler({
        pdfPath: tempPdfPath,
        outputDir: tempOutputDir,
        dpi: dpi,
      });

      // Get list of generated page files
      const pageFiles = await fs.readdir(tempOutputDir);
      const sortedPageFiles = pageFiles
        .filter(file => file.startsWith('page-') && file.endsWith('.jpg'))
        .sort((a, b) => {
          const aNum = parseInt(a.match(/page-(\d+)/)?.[1] || '0');
          const bNum = parseInt(b.match(/page-(\d+)/)?.[1] || '0');
          return aNum - bNum;
        });

      const pageCount = sortedPageFiles.length;
      logger.info(`Poppler generated ${pageCount} page images`);

      // Verify page sizes and log them
      for (const pageFile of sortedPageFiles) {
        const pageFilePath = path.join(tempOutputDir, pageFile);
        const stats = await fs.stat(pageFilePath);
        const pageNumber = parseInt(pageFile.match(/page-(\d+)/)?.[1] || '0');
        
        console.log(
          `Generated ${pageFile} size:`,
          stats.size,
          'bytes',
          `(${(stats.size / 1024).toFixed(2)} KB)`
        );
        
        logger.info(`Generated ${pageFile} size:`, {
          pageNumber,
          sizeBytes: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2)
        });

        // Verify non-blank page (typically > 20KB)
        if (stats.size < 20000) {
          logger.warn(`⚠️ Page ${pageNumber} is suspiciously small (${stats.size} bytes) - may be blank`);
        }
      }

      // Process and upload pages in parallel batches
      const batchSize = Math.min(os.cpus().length, 4);
      const pageUrls: string[] = [];

      for (let i = 0; i < pageCount; i += batchSize) {
        const batch = [];
        const endIndex = Math.min(i + batchSize, pageCount);

        for (let j = i; j < endIndex; j++) {
          const pageFile = sortedPageFiles[j];
          const pageNumber = parseInt(pageFile.match(/page-(\d+)/)?.[1] || '0');
          const pageFilePath = path.join(tempOutputDir, pageFile);

          batch.push(
            optimizeAndUploadPage(
              pageFilePath,
              pageNumber,
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

        logger.info(`Processed and uploaded pages ${i + 1}-${endIndex} of ${pageCount}`);
      }

      const processingTime = Date.now() - startTime;

      logger.info('PDF conversion completed with Poppler', {
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
 * Optimize and upload a page image generated by Poppler
 * 
 * @param pageFilePath Path to the page image file generated by Poppler
 * @param pageNumber Page number (1-indexed)
 * @param userId User ID for storage path
 * @param documentId Document ID for storage path
 * @param quality JPEG quality (0-100)
 * @param format Output format
 * @returns Page conversion result
 */
async function optimizeAndUploadPage(
  pageFilePath: string,
  pageNumber: number,
  userId: string,
  documentId: string,
  quality: number,
  format: string
): Promise<PageConversionResult> {
  try {
    // Read the image file generated by Poppler
    const imageBuffer = await fs.readFile(pageFilePath);
    
    logger.info(`[Converter] Processing page ${pageNumber}:`, {
      originalSizeKB: (imageBuffer.length / 1024).toFixed(2),
    });
    
    // Verify we have actual content (not blank)
    if (imageBuffer.length < 20000) {
      logger.warn(`[Converter] ⚠️ Page ${pageNumber} is suspiciously small (${imageBuffer.length} bytes) - may be blank`);
    }
    
    // Optimize image with Sharp
    const optimizedBuffer = await sharp(imageBuffer)
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
    
    logger.info(`[Converter] Optimized page ${pageNumber}:`, {
      originalKB: (imageBuffer.length / 1024).toFixed(2),
      optimizedKB: (optimizedBuffer.length / 1024).toFixed(2),
      compressionRatio: ((1 - optimizedBuffer.length / imageBuffer.length) * 100).toFixed(1) + '%',
    });
    
    // CRITICAL: Verify final image is reasonable size
    if (optimizedBuffer.length < 10000) {
      logger.warn(
        `[Converter] ⚠️ Page ${pageNumber} JPEG is too small (${optimizedBuffer.length} bytes) - likely blank. ` +
        `Original was ${imageBuffer.length} bytes.`
      );
    }

    // Upload to Supabase storage
    const storagePath = `${userId}/${documentId}/page-${pageNumber}.${format}`;
    const { error } = await supabase.storage
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

    logger.info(`[Converter] ✅ Page ${pageNumber} uploaded successfully to ${storagePath}`);

    return {
      pageNumber,
      url: urlData.publicUrl,
      size: optimizedBuffer.length,
    };
  } catch (error) {
    logger.error(`[Converter] ❌ Failed to process page ${pageNumber}:`, {
      error: error instanceof Error ? error.message : String(error),
      pageNumber,
    });
    throw error;
  }
}

/**
 * Get the number of pages in a PDF using Poppler pdfinfo
 * 
 * @param pdfPath Path to PDF file
 * @returns Number of pages
 */
async function getPageCount(pdfPath: string): Promise<number> {
  try {
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);
    
    // Use pdfinfo to get page count
    const { stdout } = await execFileAsync('pdfinfo', [pdfPath]);
    const match = stdout.match(/Pages:\s+(\d+)/);
    
    if (match) {
      const pageCount = parseInt(match[1], 10);
      logger.info('PDF page count determined with pdfinfo', { pageCount });
      return pageCount;
    }
    
    throw new Error('Could not parse page count from pdfinfo output');
  } catch (error) {
    logger.error('Failed to get page count with pdfinfo', { error });
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
