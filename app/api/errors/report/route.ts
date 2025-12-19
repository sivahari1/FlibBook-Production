/**
 * Error Reporting API Endpoint
 * 
 * Receives and logs error reports from clients
 * Requirements: 18.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

interface ErrorReport {
  id: string;
  timestamp: string;
  name: string;
  message: string;
  severity: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const report: ErrorReport = await request.json();

    // Validate report
    if (!report.name || !report.message) {
      return NextResponse.json(
        { error: 'Invalid error report' },
        { status: 400 }
      );
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[Error Report]', {
        ...report,
        userId: session?.user?.id || report.userId,
      });
    }

    // Store in database
    try {
      await prisma.errorLog.create({
        data: {
          errorId: report.id,
          name: report.name,
          message: report.message,
          severity: report.severity,
          context: (report.context || {}) as Prisma.JsonObject,
          userId: session?.user?.id || report.userId,
          sessionId: report.sessionId,
          userAgent: report.userAgent,
          url: report.url,
          stack: report.stack,
          timestamp: new Date(report.timestamp),
        },
      });
    } catch (dbError) {
      // If database logging fails, at least log to console
      console.error('Failed to store error in database:', dbError);
      console.error('Original error report:', report);
    }

    // Check for critical errors and send alerts
    if (report.severity === 'critical') {
      await sendCriticalErrorAlert(report, session?.user?.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error in error reporting endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

/**
 * Send alert for critical errors
 */
async function sendCriticalErrorAlert(report: ErrorReport, userId?: string) {
  // In production, this would send alerts via email, Slack, etc.
  console.error('[CRITICAL ERROR ALERT]', {
    ...report,
    userId,
    alertTime: new Date().toISOString(),
  });

  // TODO: Implement actual alerting mechanism
  // - Send email to admins
  // - Post to Slack channel
  // - Create incident in monitoring system
}

/**
 * GET endpoint to retrieve error statistics (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const severity = searchParams.get('severity');

    // Calculate time range
    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeRange] || 24 * 60 * 60 * 1000;

    const since = new Date(now.getTime() - timeRangeMs);

    // Build query
    const where: Prisma.ErrorLogWhereInput = {
      timestamp: {
        gte: since,
      },
      ...(severity && { severity }),
    };

    // Get error statistics
    const [totalErrors, errorsByType, errorsBySeverity, recentErrors] = await Promise.all([
      // Total count
      prisma.errorLog.count({ where }),

      // Group by error type
      prisma.errorLog.groupBy({
        by: ['name'],
        where,
        _count: true,
        orderBy: {
          _count: {
            name: 'desc',
          },
        },
        take: 10,
      }),

      // Group by severity
      prisma.errorLog.groupBy({
        by: ['severity'],
        where,
        _count: true,
      }),

      // Recent errors
      prisma.errorLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: 20,
        select: {
          errorId: true,
          name: true,
          message: true,
          severity: true,
          timestamp: true,
          userId: true,
          url: true,
        },
      }),
    ]);

    return NextResponse.json({
      timeRange,
      totalErrors,
      errorsByType: errorsByType.map((e) => ({
        name: e.name,
        count: e._count,
      })),
      errorsBySeverity: errorsBySeverity.map((e) => ({
        severity: e.severity,
        count: e._count,
      })),
      recentErrors,
    });
  } catch (error: unknown) {
    console.error('Error fetching error statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error statistics' },
      { status: 500 }
    );
  }
}
