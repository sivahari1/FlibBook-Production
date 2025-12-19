/**
 * Batch Conversion Management API
 * 
 * Provides endpoints for managing batch document conversion operations
 * including queuing batch conversions, checking progress, and managing batches.
 * 
 * Requirements: 2.1, 4.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getConversionManager, 
  type BatchConversionRequest 
} from '@/lib/services/centralized-conversion-manager';
import { type ConversionPriority } from '@/lib/types/conversion';
import { z } from 'zod';

/**
 * Request validation schemas
 */
const BatchConversionSchema = z.object({
  documentIds: z.array(z.string().uuid('Invalid document ID format')).min(1, 'At least one document ID is required').max(50, 'Maximum 50 documents per batch'),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  maxConcurrent: z.number().min(1).max(10).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/conversion/batch
 * Queue multiple documents for batch conversion
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = BatchConversionSchema.parse(body);

    // Map priority string to type
    const priorityMap = {
      'high': 'high' as ConversionPriority,
      'normal': 'normal' as ConversionPriority,
      'low': 'low' as ConversionPriority,
    };

    // Create batch conversion request
    const batchRequest: BatchConversionRequest = {
      documentIds: validatedData.documentIds,
      memberId: session.user.id,
      priority: priorityMap[validatedData.priority],
      maxConcurrent: validatedData.maxConcurrent,
      metadata: validatedData.metadata,
    };

    // Queue batch conversion
    const conversionManager = getConversionManager();
    const result = await conversionManager.queueBatchConversion(batchRequest);

    return NextResponse.json({
      success: true,
      data: {
        batchId: result.batchId,
        totalDocuments: result.totalDocuments,
        successful: result.successful.length,
        failed: result.failed.length,
        completed: result.completed,
        processingTime: result.totalProcessingTime,
        message: `Batch conversion ${result.completed ? 'completed' : 'started'} for ${result.totalDocuments} documents`,
      },
    });

  } catch (error) {
    console.error('[BatchConversion] Queue batch conversion error:', error);

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
        error: 'Failed to queue batch conversion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conversion/batch
 * Get batch conversion progress or result
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId parameter is required' },
        { status: 400 }
      );
    }

    const conversionManager = getConversionManager();

    // Get batch progress
    const progress = conversionManager.getBatchProgress(batchId);
    const result = conversionManager.getBatchResult(batchId);

    if (!progress || !result) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId: result.batchId,
        progress: {
          totalDocuments: progress.totalDocuments,
          completed: progress.completed,
          failed: progress.failed,
          processing: progress.processing,
          progress: progress.progress,
          estimatedTimeRemaining: progress.estimatedTimeRemaining,
        },
        result: {
          successful: result.successful.length,
          failed: result.failed.length,
          completed: result.completed,
          totalProcessingTime: result.totalProcessingTime,
          failedDocuments: result.failed,
        },
      },
    });

  } catch (error) {
    console.error('[BatchConversion] Get batch status error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to get batch status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversion/batch
 * Cancel a batch conversion
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'batchId parameter is required' },
        { status: 400 }
      );
    }

    const conversionManager = getConversionManager();
    const cancelled = await conversionManager.cancelBatchConversion(batchId);

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        cancelled,
      },
      message: cancelled 
        ? 'Batch conversion cancelled successfully'
        : 'No active batch conversion found to cancel',
    });

  } catch (error) {
    console.error('[BatchConversion] Cancel batch conversion error:', error);

    return NextResponse.json(
      { 
        error: 'Failed to cancel batch conversion',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}