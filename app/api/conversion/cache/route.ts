/**
 * Conversion Cache Management API
 * 
 * Provides endpoints for managing conversion result cache,
 * including cache statistics, warming, and invalidation.
 * 
 * Requirements: 4.4, 5.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConversionManager } from '@/lib/services/centralized-conversion-manager';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/conversion/cache
 * Get cache statistics and status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users to view cache stats
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const conversionManager = getConversionManager();
    const stats = await conversionManager.getCacheStats();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[CacheAPI] Failed to get cache stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversion/cache
 * Perform cache operations (warm, cleanup, clear)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow authenticated users to perform cache operations
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, documentIds } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const conversionManager = getConversionManager();
    let result;

    switch (action) {
      case 'warm':
        // Warm cache for specified documents or popular documents
        result = await conversionManager.warmCache(documentIds);
        return NextResponse.json({
          success: true,
          data: {
            action: 'warm',
            warmedDocuments: result,
            message: `Warmed cache for ${result} documents`,
          },
        });

      case 'cleanup':
        // Clean up expired cache entries
        result = await conversionManager.cleanupExpiredCache();
        return NextResponse.json({
          success: true,
          data: {
            action: 'cleanup',
            cleanedEntries: result,
            message: `Cleaned up ${result} expired cache entries`,
          },
        });

      case 'clear':
        // Clear all cache entries (admin only)
        if (session.user.role !== 'admin') {
          return NextResponse.json(
            { error: 'Admin access required for cache clearing' },
            { status: 403 }
          );
        }
        
        // Note: This would require implementing a clear method in the conversion manager
        return NextResponse.json({
          success: true,
          data: {
            action: 'clear',
            message: 'Cache clearing is not implemented yet',
          },
        });

      case 'invalidate':
        // Invalidate cache for specific documents
        if (!documentIds || !Array.isArray(documentIds)) {
          return NextResponse.json(
            { error: 'Document IDs array is required for invalidation' },
            { status: 400 }
          );
        }

        result = await conversionManager.invalidateCacheMultiple(documentIds);
        return NextResponse.json({
          success: true,
          data: {
            action: 'invalidate',
            invalidatedEntries: result,
            documentIds,
            message: `Invalidated cache for ${result} documents`,
          },
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[CacheAPI] Cache operation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cache operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversion/cache
 * Invalidate cache for specific documents
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const documentIds = searchParams.get('documentIds');

    if (!documentId && !documentIds) {
      return NextResponse.json(
        { error: 'Document ID or document IDs parameter is required' },
        { status: 400 }
      );
    }

    const conversionManager = getConversionManager();
    let result;

    if (documentId) {
      // Invalidate single document
      result = await conversionManager.invalidateCache(documentId);
      return NextResponse.json({
        success: true,
        data: {
          documentId,
          invalidated: result,
          message: result ? 'Cache invalidated successfully' : 'No cache entry found',
        },
      });
    } else if (documentIds) {
      // Invalidate multiple documents
      const ids = documentIds.split(',').map(id => id.trim()).filter(Boolean);
      result = await conversionManager.invalidateCacheMultiple(ids);
      return NextResponse.json({
        success: true,
        data: {
          documentIds: ids,
          invalidatedEntries: result,
          message: `Invalidated cache for ${result} documents`,
        },
      });
    }

  } catch (error) {
    console.error('[CacheAPI] Cache invalidation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cache invalidation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}