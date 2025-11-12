import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '@/lib/tokens';
import { logger } from '@/lib/logger';

/**
 * Cron job endpoint to clean up expired verification tokens
 * 
 * This endpoint should be called periodically (e.g., daily) by a cron job.
 * For Vercel deployments, configure this in vercel.json:
 * 
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-tokens",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * 
 * Security: This endpoint should be protected with a secret token
 * to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is authorized (using Vercel Cron Secret or custom auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it matches
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron job attempt', {
          ip: request.headers.get('x-forwarded-for'),
        });
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    logger.info('Starting token cleanup job');

    // Run the cleanup
    const deletedCount = await cleanupExpiredTokens();

    logger.info('Token cleanup job completed', {
      deletedCount,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Token cleanup completed',
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Token cleanup job failed', { error });

    return NextResponse.json(
      {
        success: false,
        error: 'Token cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
