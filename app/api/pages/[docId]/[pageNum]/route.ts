import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/pages/[docId]/[pageNum]
 * 
 * Returns the page image URL for a specific page of a document
 * 
 * Path parameters:
 * - docId: string (document ID)
 * - pageNum: number (page number, 1-indexed)
 * 
 * Response:
 * - success: boolean
 * - pageUrl: string
 * - pageNumber: number
 * - dimensions?: { width: number, height: number }
 * - message?: string
 * 
 * Requirements: 2.3, 2.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string; pageNum: string }> }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { docId, pageNum } = await params;
    const pageNumber = parseInt(pageNum, 10);

    // Validate page number
    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json(
        { success: false, message: 'Invalid page number' },
        { status: 400 }
      );
    }

    // Verify document exists and user has access
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        userId: true,
        filename: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this document
    // TODO: Also check for shared access
    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // TODO: Retrieve page image URL from storage
    // For now, return a placeholder
    const pageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/document-pages/${session.user.id}/${docId}/page-${pageNumber}.jpg`;

    // Set caching headers (7 days)
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=604800, immutable');
    headers.set('ETag', `"${docId}-${pageNumber}"`);

    return NextResponse.json(
      {
        success: true,
        pageUrl,
        pageNumber,
        documentId: docId,
      },
      { headers }
    );

  } catch (error: unknown) {
    console.error('Page retrieval error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve page',
      },
      { status: 500 }
    );
  }
}
