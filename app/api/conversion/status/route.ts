import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';

/**
 * GET /api/conversion/status
 * Get overall conversion system status and health
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversionManager = getConversionJobManager();
    const metrics = await conversionManager.getMetrics();
    
    // Get system health indicators
    const systemHealth = calculateSystemHealth(metrics);
    
    // Get recent job statistics
    const recentStats = await getRecentJobStatistics(conversionManager);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: {
        status: systemHealth.status,
        message: systemHealth.message,
        healthy: systemHealth.healthy,
      },
      queue: {
        depth: metrics.queueDepth,
        activeJobs: metrics.activeJobs,
        capacity: 3, // Max concurrent jobs
        utilizationPercent: Math.round((metrics.activeJobs / 3) * 100),
      },
      performance: {
        averageProcessingTime: metrics.averageProcessingTime,
        averageProcessingTimeFormatted: formatDuration(metrics.averageProcessingTime),
        successRate: metrics.successRate,
        failureRate: metrics.failureRate,
      },
      recent: recentStats,
    });
  } catch (error) {
    console.error('Error getting conversion system status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall system health
 */
function calculateSystemHealth(metrics: any) {
  const { queueDepth, activeJobs, failureRate, successRate } = metrics;
  
  // Critical issues
  if (failureRate > 50) {
    return {
      status: 'critical',
      message: 'High failure rate detected - system needs attention',
      healthy: false,
    };
  }
  
  if (queueDepth > 100) {
    return {
      status: 'critical',
      message: 'Queue severely backlogged - immediate attention required',
      healthy: false,
    };
  }
  
  // Warning conditions
  if (failureRate > 20) {
    return {
      status: 'warning',
      message: 'Elevated failure rate - monitoring recommended',
      healthy: false,
    };
  }
  
  if (queueDepth > 50) {
    return {
      status: 'warning',
      message: 'Queue backlog building up',
      healthy: false,
    };
  }
  
  // Healthy conditions
  if (successRate > 95 && queueDepth < 10) {
    return {
      status: 'excellent',
      message: 'System operating optimally',
      healthy: true,
    };
  }
  
  return {
    status: 'good',
    message: 'System operating normally',
    healthy: true,
  };
}

/**
 * Get recent job statistics
 */
async function getRecentJobStatistics(conversionManager: any) {
  try {
    // This would require additional methods in ConversionJobManager
    // For now, return basic structure
    return {
      last24Hours: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageWaitTime: 0,
      },
      lastHour: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
      },
    };
  } catch (error) {
    console.error('Error getting recent statistics:', error);
    return null;
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}