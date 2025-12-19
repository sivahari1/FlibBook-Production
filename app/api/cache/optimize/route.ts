import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { documentCacheManager } from '@/lib/cache/document-cache-manager';
import { cacheOptimizationService } from '@/lib/cache/cache-optimization-service';

/**
 * POST /api/cache/optimize
 * 
 * Optimize cache strategy and warm popular documents
 * 
 * Body:
 * - action: 'optimize' | 'warm' | 'stats' | 'recommendations'
 * - documentId?: string (for document-specific optimization)
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
    const { action, documentId } = body;

    switch (action) {
      case 'optimize':
        if (documentId) {
          // Optimize cache for specific document
          const config = await cacheOptimizationService.optimizeCacheStrategy(
            documentId,
            session.user.id
          );
          
          return NextResponse.json({
            success: true,
            message: 'Cache strategy optimized for document',
            config,
          });
        } else {
          // General cache optimization
          await documentCacheManager.optimizeCache();
          
          return NextResponse.json({
            success: true,
            message: 'Cache optimization completed',
          });
        }

      case 'warm':
        // Warm cache for popular documents
        await cacheOptimizationService.warmPopularDocuments();
        
        return NextResponse.json({
          success: true,
          message: 'Cache warming completed',
        });

      case 'stats':
        // Get cache statistics
        const cacheStats = documentCacheManager.getCacheStats();
        const performanceMetrics = cacheOptimizationService.getPerformanceMetrics();
        const efficiency = documentCacheManager.getCacheEfficiency();
        
        return NextResponse.json({
          success: true,
          stats: {
            cache: cacheStats,
            performance: performanceMetrics,
            efficiency,
          },
        });

      case 'recommendations':
        // Get cache recommendations
        const recommendations = await cacheOptimizationService.getCacheRecommendations();
        
        return NextResponse.json({
          success: true,
          recommendations,
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cache optimization error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Cache optimization failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cache/optimize
 * 
 * Get cache statistics and recommendations
 */
export async function GET() {
  try {
    const cacheStats = documentCacheManager.getCacheStats();
    const performanceMetrics = cacheOptimizationService.getPerformanceMetrics();
    const efficiency = documentCacheManager.getCacheEfficiency();
    const recommendations = await cacheOptimizationService.getCacheRecommendations();
    
    return NextResponse.json({
      success: true,
      stats: {
        cache: cacheStats,
        performance: performanceMetrics,
        efficiency,
      },
      recommendations,
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get cache stats',
      },
      { status: 500 }
    );
  }
}