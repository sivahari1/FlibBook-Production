import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewDocument } from '@/lib/authz/canViewDocument';
import { downloadFile, inferContentTypeFromPath } from '@/lib/storage';
import { prisma } from '@/lib/db';
import { resolveViewerId } from '@/lib/viewer/resolveViewerId';

export const runtime = "nodejs";

/**
 * GET /api/viewer/documents/[id]/pages/[pageNum]
 * 
 * Canonical API for streaming individual page images
 * Returns binary image data with proper Content-Type headers
 * 
 * Supports both:
 * - Direct document IDs
 * - MyJstudyroom item IDs (automatically resolved to document IDs)
 * 
 * Security: 
 * - Enforces role-based authorization
 * - Streams from private Supabase buckets using server credentials
 * - Never exposes direct storage URLs to client
 * 
 * Performance:
 * - Streams binary data directly without JSON wrapping
 * - Sets appropriate cache headers for DRM compliance
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing document ID and page number
 * @returns Binary image response or error JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNum: string }> }
) {
  const startTime = Date.now();
  
  try {
    // Get session for authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: 'Please log in to view this document'
        },
        { status: 401 }
      );
    }
    
    // Await params Promise (Next.js 15 requirement)
    const { id: inputId, pageNum } = await params;
    
    // Parse and validate page number
    const pageNumber = parseInt(pageNum, 10);
    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid page number',
          message: 'Page number must be a positive integer'
        },
        { status: 400 }
      );
    }
    
    console.log(`[Canonical API] Page ${pageNumber} request for ID ${inputId} by user ${session.user.id}`);
    
    // Use the resolver to handle both documentId and itemId
    const resolution = await resolveViewerId(inputId);
    
    if (!resolution.success) {
      console.log(`[Canonical API] ID resolution failed: ${resolution.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Document not found',
          message: 'The requested document does not exist'
        },
        { status: 404 }
      );
    }
    
    const documentId = resolution.documentId!;
    console.log(`[Canonical API] Resolved ${inputId} -> ${documentId} (from ${resolution.resolvedFrom})`);
    
    // Check authorization using the resolved document ID
    const authResult = await canViewDocument(session, documentId);
    
    if (!authResult.allowed) {
      console.log(`[Canonical API] Access denied for document ${documentId} page ${pageNumber}: ${authResult.reason}`);
      
      if (authResult.reason === 'Document not found') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Document not found',
            message: 'The requested document does not exist'
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access denied',
          message: authResult.reason
        },
        { status: 403 }
      );
    }
    
    const document = authResult.document!;
    
    // Verify it's a PDF document
    if (document.mimeType !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid document type',
          message: 'Only PDF documents have pages'
        },
        { status: 400 }
      );
    }
    
    // Find the specific page in database using the resolved document ID
    const documentPage = await prisma.documentPage.findFirst({
      where: {
        documentId: documentId,
        pageNumber: pageNumber
      },
      select: {
        pageNumber: true,
        pageUrl: true,
        fileSize: true,
        format: true
      }
    });
    
    if (!documentPage) {
      console.log(`[Canonical API] Page ${pageNumber} not found for document ${documentId}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Page not found',
          message: `Page ${pageNumber} does not exist for this document`
        },
        { status: 404 }
      );
    }
    
    // Extract storage path from pageUrl
    let storagePath = documentPage.pageUrl;
    
    // If it's a full URL, extract the path
    if (storagePath.startsWith('http')) {
      try {
        const url = new URL(storagePath);
        // Extract path from Supabase storage URL
        // Format: /storage/v1/object/public/bucket/path
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.indexOf('public') + 1;
        if (bucketIndex > 0 && bucketIndex < pathParts.length) {
          storagePath = pathParts.slice(bucketIndex + 1).join('/'); // Skip bucket name
        }
      } catch (urlError) {
        console.error(`[Canonical API] Error parsing storage URL: ${storagePath}`, urlError);
      }
    }
    
    // Determine bucket name (typically 'document-pages')
    const bucketName = process.env.SUPABASE_PAGES_BUCKET || 'document-pages';
    
    console.log(`[Canonical API] Downloading page ${pageNumber} from ${bucketName}/${storagePath}`);
    
    // Download image from Supabase Storage using server credentials
    const downloadResult = await downloadFile(storagePath, bucketName);
    
    if (downloadResult.error || !downloadResult.data) {
      console.error(`[Canonical API] Storage download failed for ${bucketName}/${storagePath}:`, downloadResult.error);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Page image not available',
          message: `Failed to retrieve page ${pageNumber} image from storage`
        },
        { status: 404 }
      );
    }
    
    const processingTime = Date.now() - startTime;
    
    // Convert blob to array buffer for response
    const arrayBuffer = await downloadResult.data.arrayBuffer();
    
    // Determine content type
    const contentType = inferContentTypeFromPath(storagePath) || 
                       (documentPage.format === 'png' ? 'image/png' : 'image/jpeg');
    
    console.log(`[Canonical API] Successfully served page ${pageNumber} for document ${documentId} (${arrayBuffer.byteLength} bytes, ${processingTime}ms)`);
    
    // Set DRM-safe headers for binary image response
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': arrayBuffer.byteLength.toString(),
      'Cache-Control': 'private, max-age=0, no-store', // DRM-safe: no caching
      'X-Processing-Time': `${processingTime}ms`,
      'X-Page-Number': pageNumber.toString(),
      'X-Document-Id': documentId,
      'X-Original-Id': inputId,
      'X-Resolved-From': resolution.resolvedFrom,
      // Prevent embedding in other sites
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff'
    });
    
    // Return binary image data
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Canonical API] Error in page endpoint:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve page image',
        processingTime
      },
      { 
        status: 500,
        headers: {
          'X-Processing-Time': `${processingTime}ms`
        }
      }
    );
  }
}