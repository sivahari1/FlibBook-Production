import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { conversionAnalytics } from '@/lib/services/conversion-analytics';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin users to access analytics
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const metricType = searchParams.get('type');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate parameters are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    let result;

    switch (metricType) {
      case 'success-rate':
        result = {
          conversionSuccessRate: await conversionAnalytics.getConversionSuccessRate(start, end),
          loadSuccessRate: await conversionAnalytics.getLoadSuccessRate(start, end),
        };
        break;

      case 'performance':
        result = {
          averageConversionTime: await conversionAnalytics.getAverageConversionTime(start, end),
          loadPerformance: await conversionAnalytics.getLoadPerformanceMetrics(start, end),
        };
        break;

      case 'errors':
        result = {
          errorRatesByType: await conversionAnalytics.getErrorRatesByType(start, end),
        };
        break;

      case 'satisfaction':
        result = {
          userSatisfaction: await conversionAnalytics.getUserSatisfactionMetrics(start, end),
        };
        break;

      case 'overview':
      default:
        // Return comprehensive overview
        result = {
          conversionSuccessRate: await conversionAnalytics.getConversionSuccessRate(start, end),
          loadSuccessRate: await conversionAnalytics.getLoadSuccessRate(start, end),
          averageConversionTime: await conversionAnalytics.getAverageConversionTime(start, end),
          loadPerformance: await conversionAnalytics.getLoadPerformanceMetrics(start, end),
          errorRatesByType: await conversionAnalytics.getErrorRatesByType(start, end),
          userSatisfaction: await conversionAnalytics.getUserSatisfactionMetrics(start, end),
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: result,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'type and data are required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'conversion':
        result = await conversionAnalytics.trackConversion({
          ...data,
          userId: session.user.id,
        });
        break;

      case 'document-load':
        result = await conversionAnalytics.trackDocumentLoad({
          ...data,
          userId: session.user.id,
        });
        break;

      case 'user-experience':
        result = await conversionAnalytics.trackUserExperience({
          ...data,
          userId: session.user.id,
        });
        break;

      case 'system-metric':
        // Only allow admin users to record system metrics
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        result = await conversionAnalytics.recordSystemMetric(data);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysToKeep = parseInt(searchParams.get('daysToKeep') || '90');

    if (isNaN(daysToKeep) || daysToKeep < 1) {
      return NextResponse.json(
        { error: 'Invalid daysToKeep parameter' },
        { status: 400 }
      );
    }

    const result = await conversionAnalytics.cleanupOldData(daysToKeep);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cleaned up analytics data older than ${daysToKeep} days`,
    });

  } catch (error) {
    console.error('Analytics cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}