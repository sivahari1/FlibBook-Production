import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';

/**
 * GET /api/conversion/queue
 * Get conversion queue status and metrics
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
    
    // Get queue metrics
    const metrics = await conversionManager.getMetrics();
    
    // Get next job in queue (for ETA estimation)
    const nextJob = await conversionManager.getNextQueuedJob();
    
    // Calculate estimated wait time for new jobs
    const estimatedWaitTime = calculateEstimatedWaitTime(metrics, nextJob);
    
    return NextResponse.json({
      success: true,
      queue: {
        depth: metrics.queueDepth,
        activeJobs: metrics.activeJobs,
        estimatedWaitTime,
        nextJobId: nextJob?.id || null,
      },
      metrics: {
        averageProcessingTime: metrics.averageProcessingTime,
        successRate: metrics.successRate,
        failureRate: metrics.failureRate,
      },
      status: {
        healthy: metrics.failureRate < 10 && metrics.queueDepth < 50,
        message: getQueueStatusMessage(metrics),
      }
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate estimated wait time for new conversion jobs
 */
function calculateEstimatedWaitTime(metrics: any, nextJob: any): number {
  const { queueDepth, averageProcessingTime, activeJobs } = metrics;
  
  // If no queue, processing starts immediately
  if (queueDepth === 0) {
    return 0;
  }
  
  // Base calculation: queue depth * average processing time
  // Adjust for currently active jobs (parallel processing)
  const parallelCapacity = Math.max(1, 3 - activeJobs); // Assume max 3 parallel jobs
  const effectiveQueueDepth = Math.ceil(queueDepth / parallelCapacity);
  
  // Use average processing time, with minimum of 30 seconds
  const avgTime = Math.max(averageProcessingTime || 60000, 30000);
  
  return effectiveQueueDepth * avgTime;
}

/**
 * Get human-readable queue status message
 */
function getQueueStatusMessage(metrics: any): string {
  const { queueDepth, activeJobs, failureRate } = metrics;
  
  if (failureRate > 20) {
    return 'Queue experiencing high failure rate - some delays expected';
  }
  
  if (queueDepth > 50) {
    return 'Queue is busy - longer wait times expected';
  }
  
  if (queueDepth > 10) {
    return 'Queue is moderately busy';
  }
  
  if (activeJobs > 0) {
    return 'Queue is processing jobs normally';
  }
  
  return 'Queue is ready for new jobs';
}