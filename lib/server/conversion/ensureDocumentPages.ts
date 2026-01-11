import { prisma } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { ConversionStatus } from '@prisma/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ConversionResult {
  status: 'READY' | 'PROCESSING' | 'FAILED';
  pageCount?: number;
  message?: string;
}

/**
 * Ensures document pages exist for a given documentId.
 * This function is idempotent and safe for concurrent requests.
 */
export async function ensureDocumentPages(documentId: string): Promise<ConversionResult> {
  console.log(`[ensureDocumentPages] Starting for documentId: ${documentId}`);

  // Verify document exists
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      storagePath: true,
      mimeType: true,
      contentType: true,
      conversionStatus: true,
      conversionError: true,
      pageCount: true,
      convertedAt: true
    }
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Only process PDF documents
  if (document.contentType !== 'PDF') {
    return {
      status: 'READY',
      pageCount: 0,
      message: 'Non-PDF document, no conversion needed'
    };
  }

  // Check if already ready and has pages
  if (document.conversionStatus === ConversionStatus.READY) {
    const existingPageCount = await prisma.documentPage.count({
      where: { documentId }
    });

    if (existingPageCount > 0) {
      console.log(`[ensureDocumentPages] Already ready with ${existingPageCount} pages`);
      return {
        status: 'READY',
        pageCount: existingPageCount
      };
    }

    // Status says READY but no pages exist - repair this
    console.log(`[ensureDocumentPages] Status READY but no pages found, repairing...`);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        conversionStatus: ConversionStatus.PENDING,
        conversionError: null,
        pageCount: null
      }
    });
  }

  // Check if pages exist but status is not READY
  const existingPageCount = await prisma.documentPage.count({
    where: { documentId }
  });

  if (existingPageCount > 0 && document.conversionStatus !== ConversionStatus.READY) {
    console.log(`[ensureDocumentPages] Found ${existingPageCount} pages, updating status to READY`);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        conversionStatus: ConversionStatus.READY,
        pageCount: existingPageCount,
        convertedAt: new Date(),
        pagesUpdatedAt: new Date(),
        conversionError: null
      }
    });

    return {
      status: 'READY',
      pageCount: existingPageCount
    };
  }

  // Try to acquire lock for conversion
  const lockResult = await prisma.document.updateMany({
    where: {
      id: documentId,
      conversionStatus: {
        in: [ConversionStatus.PENDING, ConversionStatus.FAILED]
      }
    },
    data: {
      conversionStatus: ConversionStatus.PROCESSING,
      conversionError: null
    }
  });

  if (lockResult.count === 0) {
    // Another process is already converting or document is in unexpected state
    const currentDoc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { conversionStatus: true }
    });

    if (currentDoc?.conversionStatus === ConversionStatus.PROCESSING) {
      console.log(`[ensureDocumentPages] Another process is converting`);
      return {
        status: 'PROCESSING',
        message: 'Conversion in progress by another process'
      };
    }

    return {
      status: 'FAILED',
      message: 'Unable to acquire conversion lock'
    };
  }

  console.log(`[ensureDocumentPages] Acquired lock, starting conversion`);

  try {
    // Start the actual conversion
    const result = await performPdfConversion(documentId, document.storagePath);
    
    if (result.success) {
      // Update document status to READY
      await prisma.document.update({
        where: { id: documentId },
        data: {
          conversionStatus: ConversionStatus.READY,
          pageCount: result.pageCount,
          convertedAt: new Date(),
          pagesUpdatedAt: new Date(),
          conversionError: null
        }
      });

      console.log(`[ensureDocumentPages] Conversion completed successfully with ${result.pageCount} pages`);
      
      return {
        status: 'READY',
        pageCount: result.pageCount
      };
    } else {
      // Mark as failed
      await prisma.document.update({
        where: { id: documentId },
        data: {
          conversionStatus: ConversionStatus.FAILED,
          conversionError: result.error || 'Conversion failed'
        }
      });

      console.error(`[ensureDocumentPages] Conversion failed: ${result.error}`);
      
      return {
        status: 'FAILED',
        message: result.error || 'Conversion failed'
      };
    }
  } catch (error) {
    console.error(`[ensureDocumentPages] Conversion error:`, error);
    
    // Mark as failed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        conversionStatus: ConversionStatus.FAILED,
        conversionError: error instanceof Error ? error.message : 'Unknown conversion error'
      }
    });

    return {
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Unknown conversion error'
    };
  }
}

interface ConversionResult {
  success: boolean;
  pageCount?: number;
  error?: string;
}

/**
 * Performs the actual PDF to images conversion
 */
async function performPdfConversion(documentId: string, storagePath: string): Promise<ConversionResult> {
  try {
    console.log(`[performPdfConversion] Starting conversion for ${documentId}`);

    // Download PDF from Supabase Storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (downloadError || !pdfData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message || 'Unknown error'}`);
    }

    // Convert PDF to images using a lightweight approach
    // For production, you might want to use a more robust solution
    const pages = await convertPdfToImages(pdfData, documentId);

    if (pages.length === 0) {
      throw new Error('No pages generated from PDF');
    }

    console.log(`[performPdfConversion] Generated ${pages.length} pages`);

    // Upload pages to Supabase Storage and create database records
    const pageRecords = [];
    
    for (let i = 0; i < pages.length; i++) {
      const pageNumber = i + 1;
      const pageData = pages[i];
      
      // Deterministic storage path
      const pageStoragePath = `documents/${documentId}/pages/${pageNumber.toString().padStart(4, '0')}.webp`;
      
      // Upload to document-pages bucket
      const { error: uploadError } = await supabase.storage
        .from('document-pages')
        .upload(pageStoragePath, pageData, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) {
        console.error(`Failed to upload page ${pageNumber}:`, uploadError);
        continue; // Skip this page but continue with others
      }

      // Get public URL for the page
      const { data: publicUrlData } = supabase.storage
        .from('document-pages')
        .getPublicUrl(pageStoragePath);

      pageRecords.push({
        documentId,
        pageNumber,
        storageBucket: 'document-pages',
        storagePath: pageStoragePath,
        pageUrl: publicUrlData.publicUrl,
        width: null, // Could be extracted from image if needed
        height: null,
        fileSize: pageData.size || 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        format: 'webp'
      });
    }

    if (pageRecords.length === 0) {
      throw new Error('No pages were successfully uploaded');
    }

    // Insert all page records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing pages first
      await tx.documentPage.deleteMany({
        where: { documentId }
      });

      // Insert new pages
      await tx.documentPage.createMany({
        data: pageRecords
      });
    });

    console.log(`[performPdfConversion] Successfully created ${pageRecords.length} page records`);

    return {
      success: true,
      pageCount: pageRecords.length
    };

  } catch (error) {
    console.error(`[performPdfConversion] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown conversion error'
    };
  }
}

/**
 * Lightweight PDF to images conversion
 * This is a placeholder implementation - in production you might want to use:
 * - pdf2pic
 * - pdf-poppler
 * - A serverless function
 * - An external service
 */
async function convertPdfToImages(pdfData: Blob, documentId: string): Promise<Blob[]> {
  // For now, we'll create a simple fallback that generates placeholder images
  // This ensures the system works even without a full PDF conversion library
  
  console.log(`[convertPdfToImages] Creating placeholder pages for ${documentId}`);
  
  // Create a simple placeholder image (1 page for now)
  const canvas = document?.createElement?.('canvas');
  if (!canvas) {
    // Server-side fallback - return empty array to trigger FAILED status
    console.warn('[convertPdfToImages] No canvas available, conversion will fail gracefully');
    return [];
  }

  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return [];
  }

  // Draw a simple placeholder
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#cccccc';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PDF Conversion Required', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Please contact administrator', canvas.width / 2, canvas.height / 2 + 40);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? [blob] : []);
    }, 'image/webp', 0.8);
  });
}