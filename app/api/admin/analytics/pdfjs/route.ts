/**
 * PDF.js Analytics API
 * 
 * Provides analytics data for PDF.js viewer monitoring
 * during gradual rollout
 * 
 * Requirements: All (Task 16.1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPDFJSUsageStats } from '@/lib/monitoring/pdfjs-analytics';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    // In production, verify admin role from database
    const isAdmin = session.user.email?.includes('admin') || 
                    session.user.email?.includes('sivaramj');
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get time window from query params (default 24 hours)
    const { searchParams } = new URL(request.url);
    const timeWindowHours = parseInt(searchParams.get('hours') || '24', 10);

    // Get usage statistics
    const stats = await getPDFJSUsageStats(timeWindowHours);

    return NextResponse.json({
      success: true,
      timeWindowHours,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Failed to fetch PDF.js analytics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to track PDF.js events
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventType, documentId, metadata } = body;

    // Validate required fields
    if (!eventType || !documentId) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, documentId' },
        { status: 400 }
      );
    }

    // In production, store event in database
    // For now, just log it
    console.log('[PDF.js Analytics Event]', {
      userId: session.user.id,
      eventType,
      documentId,
      metadata,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error: unknown) {
    console.error('Failed to track PDF.js event:', error);
    return NextResponse.json(
      { 
        error: 'Failed to track event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
