import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { documentCacheManager } from '@/lib/cache/document-cache-manager';
import { invalidateCache } from '@/lib/services/page-cache';

/**
 * POST /api/cache/invalidate
 * 
 * Invalidate cache for documents
 * 
 * Body:
 * - documentId?: string (specific document)
 * - pageNumber?: number (specific page)
 * - clearAll?: boolean (clear all caches)
 * 
 * Requirements: 4.4, 5.4
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { documentId, pageNumber, clearAll } = body;

    if (clearAll) {
      // Clear all caches
      await documentCacheManager.clearCache();
      
      return NextResponse.json({
        success: true,
        message: 'All caches cleared',
      });
    }

    if (documentId) {
      if (pageNumber !== undefined) {
        // Invalidate specific page
        await documentCacheManager.invalidatePage(documentId, pageNumber);
        
        return NextResponse.json({
          success: true,
          message: `Page ${pageNumber} cache invalidated for document ${documentId}`,
        });
      } else {
        // Invalidate entire document
        await Promise.all([
          documentCacheManager.invalidateDocument(documentId),
          invalidateCache(documentId), // Also invalidate database cache
        ]);
        
        return NextResponse.json({
          success: true,
          message: `Cache invalidated for document ${documentId}`,
        });
      }
    }

    return NextResponse.json(
      { success: false, message: 'No cache target specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Cache invalidation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Cache invalidation failed',
      },
      { status: 500 }
    );
  }
}