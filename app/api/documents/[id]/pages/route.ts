import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCachedPageUrls, hasCachedPages } from '@/lib/services/page-cache';
import { BrowserCacheHeaders } from '@/lib/performance/cache-manager';
import { getDocumentPageUrl } from '@/lib/supabase-storage';

/**
 * GET /api/documents/[id]/pages
 * 
 * Returns all page URLs for a document with metadata
 * Optimized for < 2 second page load times with aggressive caching
 * 
 * Path parameters:
 * - id: string (document ID)
 * 
 * Response:
 * - success: boolean
 * - documentId: string
 * - totalPages: number
 * - pages: Array<{
 *     pageNumber: number,
 *     pageUrl: string,
 *     dimensions?: { width: number, height: number }
 *   }>
 * - message?: string
 * 
 * Requirements: 2.3, 2.4, 2.5, 17.3, 17.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params Promise before accessing properties (Next.js 15 requirement)
    const { id: documentId } = await params;

    // Check ETag for conditional requests (304 Not Modified)
    const ifNoneMatch = request.headers.get('if-none-match');
    const etag = `"${documentId}-pages-v2"`;
    
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    // Parallel queries for better performance
    const [document, hasCached] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          userId: true,
          filename: true,
          mimeType: true,
        },
      }),
      hasCachedPages(documentId),
    ]);

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this document
    // TODO: Also check for shared access and purchased content
    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Verify it's a PDF
    if (document.mimeType !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'Only PDF documents have pages' },
        { status: 400 }
      );
    }

    // Get cached page URLs
    let pageUrls: string[] = [];
    
    if (hasCached) {
      pageUrls = await getCachedPageUrls(documentId);
      console.log(`[Pages API] Retrieved ${pageUrls.length} cached page URLs for document ${documentId}`);
    }

    // If no cached pages, return empty array (client should trigger conversion)
    const totalPages = pageUrls.length;
    
    const pages = pageUrls.map((url, index) => ({
      pageNumber: index + 1,
      pageUrl: url,
      dimensions: {
        width: 1200,
        height: 1600,
      },
    }));
    
    // Log sample URLs for debugging
    if (pages.length > 0) {
      console.log('[Pages API] Sample page URLs:', pages.slice(0, 2).map(p => ({
        pageNumber: p.pageNumber,
        url: p.pageUrl.substring(0, 100) + '...',
      })));
    } else {
      console.log('[Pages API] No pages found - client should trigger conversion');
    }

    const processingTime = Date.now() - startTime;

    // Set aggressive caching headers for optimal performance
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=604800, immutable, stale-while-revalidate=86400');
    headers.set('ETag', etag);
    headers.set('X-Processing-Time', `${processingTime}ms`);
    
    // Add CDN cache headers
    headers.set('CDN-Cache-Control', 'public, max-age=2592000'); // 30 days for CDN
    
    // Add resource timing headers
    headers.set('Timing-Allow-Origin', '*');
    
    // Add Link header for preconnect
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      headers.set('Link', `<${process.env.NEXT_PUBLIC_SUPABASE_URL}>; rel=preconnect`);
    }

    return NextResponse.json(
      {
        success: true,
        documentId,
        totalPages,
        pages,
        cached: hasCached,
        processingTime,
      },
      { headers }
    );

  } catch (error) {
    console.error('Bulk pages retrieval error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve pages',
        processingTime,
      },
      { status: 500 }
    );
  }
}
