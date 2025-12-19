import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendAccessRequestNotification } from '@/lib/email';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/sanitization';
import { checkRateLimit as checkRateLimitUtil, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Check if IP has exceeded rate limit (using centralized rate limit)
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const result = checkRateLimitUtil(`access-request:${ip}`, RATE_LIMITS.ACCESS_REQUEST);
  return {
    allowed: result.success,
    retryAfter: result.retryAfter
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default (shouldn't happen in production)
  return 'unknown';
}

/**
 * POST /api/access-request
 * Submit an access request
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = getClientIp(request);

    // Check rate limit
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitCheck.retryAfter?.toString() || '3600',
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!body.purpose || typeof body.purpose !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Purpose is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate purpose length
    if (body.purpose.trim().length < 10) {
      return NextResponse.json(
        { success: false, message: 'Purpose must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.numDocuments !== undefined && (typeof body.numDocuments !== 'number' || body.numDocuments < 0)) {
      return NextResponse.json(
        { success: false, message: 'Invalid number of documents' },
        { status: 400 }
      );
    }

    if (body.numUsers !== undefined && (typeof body.numUsers !== 'number' || body.numUsers < 0)) {
      return NextResponse.json(
        { success: false, message: 'Invalid number of users' },
        { status: 400 }
      );
    }

    if (body.requestedRole !== undefined && !['PLATFORM_USER', 'READER_USER'].includes(body.requestedRole)) {
      return NextResponse.json(
        { success: false, message: 'Invalid requested role' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedData = {
      email: sanitizeString(body.email.trim().toLowerCase()),
      name: body.name ? sanitizeString(body.name.trim()) : undefined,
      purpose: sanitizeString(body.purpose.trim()),
      numDocuments: body.numDocuments,
      numUsers: body.numUsers,
      requestedRole: body.requestedRole,
      extraMessage: body.extraMessage ? sanitizeString(body.extraMessage.trim()) : undefined,
    };

    // Create access request in database
    const accessRequest = await prisma.accessRequest.create({
      data: {
        email: sanitizedData.email,
        name: sanitizedData.name,
        purpose: sanitizedData.purpose,
        numDocuments: sanitizedData.numDocuments,
        numUsers: sanitizedData.numUsers,
        requestedRole: sanitizedData.requestedRole,
        extraMessage: sanitizedData.extraMessage,
        status: 'PENDING',
      },
    });

    logger.info('Access request created', {
      requestId: accessRequest.id,
      email: sanitizedData.email,
      ip: clientIp,
    });

    // Send email notification to admin (don't block on email failure)
    const adminDashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/access-requests`;
    
    sendAccessRequestNotification({
      requestId: accessRequest.id,
      email: sanitizedData.email,
      name: sanitizedData.name,
      purpose: sanitizedData.purpose,
      numDocuments: sanitizedData.numDocuments,
      numUsers: sanitizedData.numUsers,
      requestedRole: sanitizedData.requestedRole,
      extraMessage: sanitizedData.extraMessage,
      adminDashboardUrl,
    }).catch((error) => {
      logger.error('Failed to send access request notification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: accessRequest.id,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Access request submitted successfully',
      requestId: accessRequest.id,
    });
  } catch (error: unknown) {
    logger.error('Error creating access request', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your request. Please try again.',
      },
      { status: 500 }
    );
  }
}
