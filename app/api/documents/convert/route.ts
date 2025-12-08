import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { convertPdfToImages, checkPagesExist, getExistingPageUrls } from '@/lib/services/pdf-converter';
import { hasCachedPages, getCachedPageUrls, cachePages, invalidateCache } from '@/lib/services/page-cache';
import { recordConversion } from '@/lib/performance/conversion-monitor';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// CRITICAL FIX: Ensure PDF.js workers are disabled in Node.js environment
// This prevents "No 'GlobalWorkerOptions.workerSrc' specified" errors
// The pdf-converter module already sets this, but we ensure it here too
if (typeof window === 'undefined') {
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    pdfjsLib.GlobalWorkerOptions.workerPort = null;
    logger.info('[Convert API] PDF.js worker disabled for Node.js environment');
  } catch (error) {
    // pdf-converter module will handle this
    logger.warn('[Convert API] Could not configure PDF.js workers (will be handled by pdf-converter)');
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/documents/convert
 * 
 * Converts a PDF document to page images for flipbook display
 * Implements caching to avoid redundant processing
 * 
 * Request body:
 * - documentId: string (required)
 * - forceRegenerate: boolean (optional, default: false)
 * 
 * Response:
 * - success: boolean
 * - pageCount: number
 * - pageUrls: string[]
 * - processingTime: number
 * - cached: boolean
 * - message?: string
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 17.1
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { documentId, forceRegenerate = false } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document exists and user has access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        userId: true,
        filename: true,
        storagePath: true,
        mimeType: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this document
    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Verify it's a PDF
    if (document.mimeType !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Only PDF documents can be converted' },
        { status: 400 }
      );
    }

    // Check if pages already exist in cache (unless force regenerate)
    if (!forceRegenerate) {
      const cached = await hasCachedPages(documentId);
      if (cached) {
        const pageUrls = await getCachedPageUrls(documentId);
        const processingTime = Date.now() - startTime;

        logger.info('Returning cached pages', {
          documentId,
          pageCount: pageUrls.length,
          processingTime,
        });

        // Record cache hit metric
        recordConversion({
          documentId,
          pageCount: pageUrls.length,
          totalTime: processingTime,
          avgTimePerPage: processingTime / pageUrls.length,
          cacheHit: true,
          timestamp: new Date(),
        });

        return NextResponse.json({
          success: true,
          message: 'Pages retrieved from cache',
          documentId: document.id,
          pageCount: pageUrls.length,
          pageUrls,
          processingTime,
          cached: true,
        });
      }
    } else {
      // Invalidate existing cache
      await invalidateCache(documentId);
    }

    // Download PDF from Supabase storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storagePath);

    if (downloadError || !pdfData) {
      return NextResponse.json(
        { success: false, message: 'Failed to download PDF' },
        { status: 500 }
      );
    }

    // Save PDF to temporary file
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-'));
    const pdfPath = path.join(tempDir, 'document.pdf');
    const buffer = Buffer.from(await pdfData.arrayBuffer());
    await fs.writeFile(pdfPath, buffer);

    try {
      // Convert PDF to images
      const result = await convertPdfToImages({
        documentId: document.id,
        userId: document.userId,
        pdfPath,
        quality: 85,
        dpi: 150,
        format: 'jpg',
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: result.error || 'Conversion failed',
            processingTime: result.processingTime,
          },
          { status: 500 }
        );
      }

      // Cache the converted pages
      await cachePages(documentId, result.pageUrls);

      const processingTime = Date.now() - startTime;

      logger.info('PDF conversion completed', {
        documentId,
        pageCount: result.pageCount,
        processingTime,
        avgTimePerPage: processingTime / result.pageCount,
      });

      // Record conversion metric
      recordConversion({
        documentId,
        pageCount: result.pageCount,
        totalTime: processingTime,
        avgTimePerPage: processingTime / result.pageCount,
        cacheHit: false,
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Document converted successfully',
        documentId: document.id,
        pageCount: result.pageCount,
        pageUrls: result.pageUrls,
        processingTime,
        cached: false,
      });
    } finally {
      // Cleanup temporary files
      await fs.rm(tempDir, { recursive: true, force: true });
    }

  } catch (error) {
    logger.error('Document conversion error', { error });
    
    const processingTime = Date.now() - startTime;
    
    // Provide clear, actionable error messages
    let errorMessage = 'Failed to convert document. Please try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Document conversion timed out. The file may be too large or complex. Please try a smaller document.';
      } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
        errorMessage = 'The PDF file appears to be corrupted or invalid. Please try re-saving the PDF and uploading again.';
      } else if (error.message.includes('page limit')) {
        errorMessage = 'Document has too many pages. Maximum supported is 500 pages.';
      } else if (error.message.includes('storage')) {
        errorMessage = 'Storage error occurred. Please check your storage quota and try again.';
      } else {
        errorMessage = `Conversion failed: ${error.message}`;
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        processingTime,
      },
      { status: 500 }
    );
  }
}
