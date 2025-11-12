import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDocumentAnalytics } from '@/lib/documents';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { documentId } = await params;

    // Fetch analytics using shared data access layer (includes ownership check)
    const analytics = await getDocumentAnalytics(documentId, session.user.id);

    if (analytics === null) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate total views
    const totalViews = analytics.length;

    // Calculate unique viewers (based on email)
    const uniqueViewers = new Set(
      analytics
        .filter(a => a.viewerEmail)
        .map(a => a.viewerEmail)
    ).size;

    // Aggregate views by date for timeline chart
    const viewsByDate: Record<string, number> = {};
    
    analytics.forEach(record => {
      const date = record.viewedAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    // Convert to array format for easier charting
    const timeline = Object.entries(viewsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalViews,
      uniqueViewers,
      timeline,
      views: analytics
    });

  } catch (error) {
    logger.error('Error fetching analytics', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
