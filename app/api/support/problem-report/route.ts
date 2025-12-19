/**
 * Problem Report API Endpoint
 * 
 * Handles submission of problem reports from users experiencing
 * document viewing issues.
 * 
 * Task 5.3: Add manual retry mechanisms - "Report Problem" API
 * Requirements: 2.4, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

interface ProblemReportData {
  category: string;
  description: string;
  stepsToReproduce: string;
  urgency: 'low' | 'medium' | 'high';
  contactMethod: 'email' | 'phone' | 'none';
  contactInfo?: string;
  documentId: string;
  documentTitle?: string;
  errorType: string;
  errorMessage?: string;
  errorContext?: any;
  timestamp: string;
  userAgent: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const reportData: ProblemReportData = await request.json();

    // Validate required fields
    if (!reportData.category || !reportData.description || !reportData.documentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create problem report record
    const problemReport = await db.problemReport.create({
      data: {
        userId: session.user.id,
        documentId: reportData.documentId,
        category: reportData.category,
        description: reportData.description,
        stepsToReproduce: reportData.stepsToReproduce || null,
        urgency: reportData.urgency,
        contactMethod: reportData.contactMethod,
        contactInfo: reportData.contactInfo || null,
        errorType: reportData.errorType,
        errorMessage: reportData.errorMessage || null,
        errorContext: reportData.errorContext || null,
        userAgent: reportData.userAgent,
        url: reportData.url,
        status: 'open',
        reportedAt: new Date(reportData.timestamp),
      },
    });

    // Log the problem report
    logger.info('Problem report submitted', {
      reportId: problemReport.id,
      userId: session.user.id,
      documentId: reportData.documentId,
      category: reportData.category,
      urgency: reportData.urgency,
      errorType: reportData.errorType
    });

    // Send notification to support team (in a real app, this would be an email/Slack notification)
    await notifySupportTeam(problemReport, session.user, reportData);

    return NextResponse.json({
      success: true,
      reportId: problemReport.id,
      message: 'Problem report submitted successfully'
    });

  } catch (error) {
    logger.error('Error submitting problem report', { error });
    
    return NextResponse.json(
      { error: 'Failed to submit problem report' },
      { status: 500 }
    );
  }
}

/**
 * Notify support team about new problem report
 */
async function notifySupportTeam(
  report: any,
  user: any,
  reportData: ProblemReportData
) {
  try {
    // In a real application, this would send an email or Slack notification
    // For now, we'll just log it
    logger.info('Support notification', {
      type: 'problem_report',
      reportId: report.id,
      urgency: reportData.urgency,
      category: reportData.category,
      userEmail: user.email,
      documentId: reportData.documentId,
      errorType: reportData.errorType,
      description: reportData.description.substring(0, 100) + '...'
    });

    // TODO: Implement actual notification system
    // - Send email to support team
    // - Create Slack notification
    // - Update support dashboard
    
  } catch (error) {
    logger.error('Failed to notify support team', { error, reportId: report.id });
  }
}

export async function GET(request: NextRequest) {
  // This endpoint could be used to retrieve problem reports for admin dashboard
  return NextResponse.json(
    { error: 'Method not implemented' },
    { status: 501 }
  );
}