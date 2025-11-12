import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

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

    // Verify document ownership
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { userId: true }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this document' },
        { status: 403 }
      );
    }

    // Fetch all ViewAnalytics records for the document
    const analytics = await prisma.viewAnalytics.findMany({
      where: { documentId },
      orderBy: { viewedAt: 'desc' },
      select: {
        id: true,
        viewerEmail: true,
        ipAddress: true,
        userAgent: true,
        country: true,
        city: true,
        viewedAt: true,
        shareKey: true
      }
    });

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
