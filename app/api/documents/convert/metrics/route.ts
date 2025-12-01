/**
 * GET /api/documents/convert/metrics
 * 
 * Returns PDF conversion performance metrics
 * 
 * Requirements: 17.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  generateReport,
  getRecentMetrics,
  isPerformanceTargetMet,
  getPerformanceSummary,
} from '@/lib/performance/conversion-monitor';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (admin only)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    // For now, allow all authenticated users to view metrics
    // In production, restrict to admin role

    const report = generateReport();
    const recentMetrics = getRecentMetrics(20);
    const targetMet = isPerformanceTargetMet();
    const summary = getPerformanceSummary();

    return NextResponse.json({
      success: true,
      report,
      recentMetrics,
      targetMet,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get metrics',
      },
      { status: 500 }
    );
  }
}
