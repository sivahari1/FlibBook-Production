/**
 * Manual Document Conversion Trigger API
 * 
 * Provides endpoint for manually triggering document conversion with priority queue management
 * and user permission validation. This allows users to manually initiate conversion when
 * automatic conversion fails or when they want to prioritize a specific document.
 * 
 * Requirements: 2.4, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConversionJobManager } from '@/lib/services/conversion-job-manager';
import { getConversionManager } from '@/lib/services/centralized-conversion-manager';
import { type ConversionPriority } from '@/lib/types/conversion';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * Request validation schema
 */
const ManualConversionSchema = z.object({
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  force: z.boolean().default(false), // Force reconversion even if pages exist
  reason: z.string().optional(), // Optional reason for manual trigger
});

/**
 * POST /api/documents/[id]/convert
 * Manually trigger document conversion with priority queue management
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const documentId = params.id;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData = ManualConversionSchema.parse(body);

    // Verify document exists and user has access
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        storagePath: true,
        createdAt: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Check if document is suitable for conversion
    if (!document.contentType?.includes('pdf')) {
      return NextResponse.json(
        { 
          error: 'Document type not supported for conversion',
          message: 'Only PDF documents can be converted to pages',
          documentType: document.contentType,
        },
        { status: 400 }
      );
    }

    // Check if conversion is already in progress
    const conversionManager = getConversionJobManager();
    const existingJob = await conversionManager.getJobByDocumentId(documentId);
    
    if (existingJob && existingJob.status === 'processing') {
      return NextResponse.json(
        {
          error: 'Conversion already in progress',
          message: 'This document is currently being converted',
          jobId: existingJob.id,
          progress: existingJob.progress,
          estimatedCompletion: existingJob.estimatedCompletion,
        },
        { status: 409 }
      );
    }

    // Check if pages already exist (unless force is true)
    if (!validatedData.force) {
      const existingPages = await db.documentPage.count({
        where: { documentId },
      });

      if (existingPages > 0) {
        return NextResponse.json(
          {
            error: 'Document already converted',
            message: 'This document already has converted pages. Use force=true to reconvert.',
            existingPages,
            suggestion: 'Add "force": true to the request body to reconvert',
          },
          { status: 409 }
        );
      }
    }

    // Map priority string to type
    const priorityMap = {
      'high': 'high' as ConversionPriority,
      'normal': 'normal' as ConversionPriority,
      'low': 'low' as ConversionPriority,
    };

    // Queue the conversion job
    const centralizedManager = getConversionManager();
    const conversionResult = await centralizedManager.queueConversion({
      documentId,
      memberId: session.user.id,
      priority: priorityMap[validatedData.priority],
      metadata: {
        manualTrigger: true,
        reason: validatedData.reason,
        force: validatedData.force,
        triggeredAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
      },
    });

    // Get queue position and estimated wait time
    const queueMetrics = await conversionManager.getMetrics();
    const queuePosition = await getQueuePosition(documentId, conversionManager);
    const estimatedWaitTime = calculateEstimatedWaitTime(queueMetrics, queuePosition);

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        documentTitle: document.title,
        conversionId: conversionResult.jobId,
        priority: validatedData.priority,
        force: validatedData.force,
        queue: {
          position: queuePosition,
          estimatedWaitTime,
          estimatedWaitTimeFormatted: formatDuration(estimatedWaitTime),
        },
        status: {
          stage: 'queued',
          progress: 0,
          message: 'Conversion queued successfully',
        },
      },
      message: `Document conversion ${validatedData.force ? 'reconversion' : 'conversion'} queued with ${validatedData.priority} priority`,
    });

  } catch (error) {
    console.error('[ManualConversion] Manual conversion trigger error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors?.map(e => ({
            field: e.path?.join('.') || 'unknown',
            message: e.message,
          })) || [],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to trigger manual conversion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/[id]/convert
 * Get manual conversion status and options
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const documentId = params.id;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document exists and user has access
    const document = await db.document.findFirst({
      where: {
        id: documentId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        contentType: true,
        createdAt: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Check conversion eligibility
    const isConvertible = document.contentType?.includes('pdf') || false;
    
    // Check existing pages
    const existingPages = await db.documentPage.count({
      where: { documentId },
    });

    // Check current conversion status
    const conversionManager = getConversionJobManager();
    const currentJob = await conversionManager.getJobByDocumentId(documentId);
    
    // Get queue metrics for wait time estimation
    const queueMetrics = await conversionManager.getMetrics();

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        documentTitle: document.title,
        contentType: document.contentType,
        convertible: isConvertible,
        existingPages,
        hasPages: existingPages > 0,
        currentConversion: currentJob ? {
          jobId: currentJob.id,
          status: currentJob.status,
          progress: currentJob.progress,
          estimatedCompletion: currentJob.estimatedCompletion,
          startedAt: currentJob.startedAt,
        } : null,
        queue: {
          depth: queueMetrics.queueDepth,
          activeJobs: queueMetrics.activeJobs,
          averageProcessingTime: queueMetrics.averageProcessingTime,
          estimatedWaitTime: calculateEstimatedWaitTime(queueMetrics, 0),
        },
        options: {
          availablePriorities: ['high', 'normal', 'low'],
          canForceReconvert: existingPages > 0,
          recommendedPriority: existingPages > 0 ? 'normal' : 'high',
        },
      },
    });

  } catch (error) {
    console.error('[ManualConversion] Get conversion options error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to get conversion options',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get queue position for a document
 */
async function getQueuePosition(documentId: string, conversionManager: any): Promise<number> {
  try {
    // This would require additional methods in ConversionJobManager
    // For now, return estimated position based on queue depth
    const metrics = await conversionManager.getMetrics();
    return metrics.queueDepth + 1;
  } catch (error) {
    console.error('Error getting queue position:', error);
    return 1;
  }
}

/**
 * Calculate estimated wait time based on queue metrics and position
 */
function calculateEstimatedWaitTime(metrics: any, position: number): number {
  const { averageProcessingTime, activeJobs } = metrics;
  
  // If no queue, processing starts immediately
  if (position <= 1) {
    return 0;
  }
  
  // Base calculation: position * average processing time
  // Adjust for currently active jobs (parallel processing)
  const parallelCapacity = Math.max(1, 3 - activeJobs); // Assume max 3 parallel jobs
  const effectivePosition = Math.ceil(position / parallelCapacity);
  
  // Use average processing time, with minimum of 30 seconds
  const avgTime = Math.max(averageProcessingTime || 60000, 30000);
  
  return effectivePosition * avgTime;
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
    return remainingSeconds > 0 
      ? `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
      : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 
    ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
    : `${hours} hour${hours !== 1 ? 's' : ''}`;
}