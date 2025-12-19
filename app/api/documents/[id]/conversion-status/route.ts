import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';
import db from '@/lib/db';

/**
 * Enhance progress information with queue position and better ETA
 */
async function enhanceProgressWithQueueInfo(progress: any, conversionManager: any) {
  try {
    // Get queue metrics for better ETA calculation
    const metrics = await conversionManager.getMetrics();
    
    // If job is queued, calculate queue position
    let queuePosition = null;
    if (progress.status === 'queued') {
      // This would require additional method in ConversionJobManager
      // For now, estimate based on queue depth
      queuePosition = Math.max(1, metrics.queueDepth);
    }
    
    // Enhanced ETA calculation
    let enhancedETA = progress.estimatedTimeRemaining;
    if (progress.status === 'queued' && metrics.averageProcessingTime) {
      // Calculate wait time based on queue position and average processing time
      const avgProcessingTime = metrics.averageProcessingTime;
      const parallelCapacity = Math.max(1, 3 - metrics.activeJobs);
      const estimatedWaitTime = Math.ceil((queuePosition || 1) / parallelCapacity) * avgProcessingTime;
      enhancedETA = estimatedWaitTime;
    }
    
    return {
      ...progress,
      queuePosition,
      estimatedTimeRemaining: enhancedETA,
      estimatedTimeRemainingFormatted: enhancedETA ? formatDuration(enhancedETA) : null,
      queueMetrics: {
        queueDepth: metrics.queueDepth,
        activeJobs: metrics.activeJobs,
        averageProcessingTime: metrics.averageProcessingTime,
        successRate: metrics.successRate,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error enhancing progress info:', error);
    return progress;
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return 'Less than 1 second';
  }
  
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    if (remainingSeconds > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documentId = params.id;

    // Verify user has access to this document
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { userId: session.user.id },
          {
            bookShopItems: {
              some: {
                myJstudyroomItems: {
                  some: {
                    userId: session.user.id
                  }
                }
              }
            }
          }
        ]
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    const conversionManager = getConversionJobManager();
    const progress = await conversionManager.getProgress(documentId);

    if (!progress) {
      return NextResponse.json({
        documentId,
        status: 'not_started',
        stage: 'not_started',
        progress: 0,
        message: 'No conversion job found',
        totalPages: null,
        processedPages: 0,
        retryCount: 0,
        estimatedTimeRemaining: null,
        queuePosition: null,
      });
    }

    // Enhance progress with additional information
    const enhancedProgress = await enhanceProgressWithQueueInfo(
      progress, 
      conversionManager
    );

    return NextResponse.json(enhancedProgress);
  } catch (error) {
    console.error('Error getting conversion status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documentId = params.id;
    const body = await request.json();
    const { action, priority } = body;

    // Verify user has access to this document
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { userId: session.user.id },
          {
            bookShopItems: {
              some: {
                myJstudyroomItems: {
                  some: {
                    userId: session.user.id
                  }
                }
              }
            }
          }
        ]
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    const conversionManager = getConversionJobManager();

    switch (action) {
      case 'start':
        const job = await conversionManager.createJob(documentId, { priority });
        const progress = await conversionManager.getProgress(documentId);
        return NextResponse.json({
          success: true,
          message: 'Conversion job created',
          job: progress,
        });

      case 'retry':
        const retriedJob = await conversionManager.retryJob(documentId);
        const retryProgress = await conversionManager.getProgress(documentId);
        return NextResponse.json({
          success: true,
          message: 'Conversion job retried',
          job: retryProgress,
        });

      case 'cancel':
        const activeJob = await conversionManager.getActiveJob(documentId);
        if (activeJob) {
          await conversionManager.cancelJob(activeJob.id);
        }
        return NextResponse.json({
          success: true,
          message: 'Conversion job cancelled',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, retry, or cancel' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing conversion job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}