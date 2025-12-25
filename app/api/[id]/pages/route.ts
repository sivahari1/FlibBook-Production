import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canViewDocument } from '@/lib/authz/canViewDocument';
import { prisma } from '@/lib/db';
import { resolveViewerId } from '@/lib/viewer/resolveViewerId';

export const runtime = "nodejs";

/**
 * GET /api/viewer/documents/[id]/pages
 * 
 * Canonical API for listing available pages for a document
 * Returns a minimal JSON response with page numbers and metadata
 * 
 * Supports both:
 * - Direct document IDs
 * - MyJstudyroom item IDs (automatically resolved to document IDs)
 * 
 * Security: Enforces role-based authorization
 * Performance: Returns lightweight metadata only, not actual image data
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing document ID
 * @returns JSON response with pages list or error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: inputId } = await params;
    
    console.log(`[Canonical API] Pages request for ID ${inputId} by user ${session.user.id}`);
    
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
      console.log(`[Canonical API] Access denied for document ${documentId}: ${authResult.reason}`);
      
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
    
    // Query document pages from database using the resolved document ID
    const documentPages = await prisma.documentPage.findMany({
      where: {
        documentId: documentId
      },
      select: {
        pageNumber: true,
        fileSize: true,
        format: true
      },
      orderBy: {
        pageNumber: 'asc'
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    // If no pages found, return 409 (Conflict) indicating pages not generated
    if (documentPages.length === 0) {
      console.log(`[Canonical API] No pages found for document ${documentId}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Pages not generated',
          message: `Document "${document.title}" exists but page images have not been generated yet. Please try again in a few moments.`,
          documentId,
          originalId: inputId,
          resolvedFrom: resolution.resolvedFrom,
          documentTitle: document.title,
          processingTime
        },
        { 
          status: 409,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Processing-Time': `${processingTime}ms`
          }
        }
      );
    }
    
    // Build pages response
    const pages = documentPages.map(page => ({
      pageNumber: page.pageNumber
    }));
    
    const totalPages = documentPages.length;
    
    console.log(`[Canonical API] Found ${totalPages} pages for document ${documentId}`);
    
    // Set appropriate cache headers for DRM compliance
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=0, no-store', // DRM-safe caching
      'X-Processing-Time': `${processingTime}ms`,
      'X-Total-Pages': totalPages.toString(),
      'X-Document-Id': documentId,
      'X-Original-Id': inputId,
      'X-Resolved-From': resolution.resolvedFrom
    });
    
    return NextResponse.json(
      {
        success: true,
        documentId,
        originalId: inputId,
        resolvedFrom: resolution.resolvedFrom,
        totalPages,
        pages,
        processingTime
      },
      { headers }
    );
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('[Canonical API] Error in pages endpoint:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve document pages',
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