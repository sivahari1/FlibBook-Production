/**
 * Performance Monitoring API Endpoint
 * 
 * Provides access to performance metrics and real-time monitoring data
 * for JStudyRoom document viewing system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor, getRealTimeMetrics, getPerformanceStats } from '@/lib/monitoring/performance-monitor';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'realtime';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    switch (type) {
      case 'realtime':
        const realTimeMetrics = await getRealTimeMetrics();
        return NextResponse.json({
          success: true,
          data: realTimeMetrics,
          timestamp: new Date().toISOString()
        });

      case 'stats':
        if (!startDate || !endDate) {
          return NextResponse.json({
            success: false,
            error: 'startDate and endDate are required for stats'
          }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return NextResponse.json({
            success: false,
            error: 'Invalid date format'
          }, { status: 400 });
        }

        const stats = await getPerformanceStats(start, end);
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'export':
        if (!startDate || !endDate) {
          return NextResponse.json({
            success: false,
            error: 'startDate and endDate are required for export'
          }, { status: 400 });
        }

        const exportStart = new Date(startDate);
        const exportEnd = new Date(endDate);
        
        if (isNaN(exportStart.getTime()) || isNaN(exportEnd.getTime())) {
          return NextResponse.json({
            success: false,
            error: 'Invalid date format'
          }, { status: 400 });
        }

        const exportData = await performanceMonitor.exportMetrics(exportStart, exportEnd);
        return NextResponse.json({
          success: true,
          data: exportData,
          count: exportData.length
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type parameter. Use: realtime, stats, or export'
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('Performance monitoring API error', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'recordDocumentLoad':
        await performanceMonitor.recordDocumentLoad({
          documentId: params.documentId,
          userId: params.userId,
          startTime: new Date(params.startTime),
          endTime: new Date(params.endTime),
          success: params.success,
          errorType: params.errorType,
          errorMessage: params.errorMessage,
          metadata: params.metadata
        });
        break;

      case 'recordConversion':
        await performanceMonitor.recordConversion({
          documentId: params.documentId,
          userId: params.userId,
          startTime: new Date(params.startTime),
          endTime: new Date(params.endTime),
          success: params.success,
          errorType: params.errorType,
          errorMessage: params.errorMessage,
          metadata: params.metadata
        });
        break;

      case 'recordError':
        await performanceMonitor.recordError({
          type: params.type,
          message: params.message,
          documentId: params.documentId,
          userId: params.userId,
          metadata: params.metadata
        });
        break;

      case 'recordUserInteraction':
        await performanceMonitor.recordUserInteraction({
          action: params.interactionAction,
          documentId: params.documentId,
          userId: params.userId,
          metadata: params.metadata
        });
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Metric recorded successfully'
    });
  } catch (error) {
    logger.error('Performance monitoring POST error', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get('olderThan');

    if (!olderThan) {
      return NextResponse.json({
        success: false,
        error: 'olderThan parameter is required'
      }, { status: 400 });
    }

    const cutoffDate = new Date(olderThan);
    if (isNaN(cutoffDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format'
      }, { status: 400 });
    }

    const removedCount = await performanceMonitor.cleanupOldMetrics(cutoffDate);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${removedCount} old metrics`
    });
  } catch (error) {
    logger.error('Performance monitoring DELETE error', { error });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}