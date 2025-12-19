import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateVerificationToken, invalidateUserTokens } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { sanitizeEmail } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * POST /api/auth/resend-verification
 * Resend email verification link to user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: emailRaw } = body;

    // Sanitize email
    const email = sanitizeEmail(emailRaw);

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email address is required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Check rate limit (1 request per 60 seconds per email)
    const rateLimitResult = checkRateLimit(
      `resend-verification:${email}`,
      RATE_LIMITS.EMAIL_VERIFICATION_RESEND
    );

    if (!rateLimitResult.success) {
      // Rate limit violation already logged by checkRateLimit
      logger.logAuthAttempt('resend_verification', false, {
        email,
        reason: 'rate_limit_exceeded',
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${rateLimitResult.retryAfter} seconds before requesting another verification email`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Log suspicious activity - multiple attempts to verify non-existent emails could indicate enumeration attack
      logger.logSuspiciousActivity('resend_verification_nonexistent_email', 'low', {
        email,
      });

      // Return success to prevent email enumeration
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.',
        },
        { status: 200 }
      );
    }

    // Check if user is already verified
    if (user.emailVerified) {
      logger.logAuthAttempt('resend_verification', true, {
        userId: user.id,
        email: user.email,
        alreadyVerified: true,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Your email is already verified. You can log in to your account.',
        },
        { status: 200 }
      );
    }

    // Invalidate any existing verification tokens for this user
    await invalidateUserTokens(user.id, 'EMAIL_VERIFICATION');

    // Generate new verification token
    const tokenData = await generateVerificationToken(
      user.id,
      'EMAIL_VERIFICATION'
    );

    // Build verification URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/verify?token=${tokenData.token}`;

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, {
      userName: user.name || 'User',
      verificationUrl,
    });

    if (!emailSent) {
      logger.logAuthAttempt('resend_verification', false, {
        userId: user.id,
        email: user.email,
        reason: 'email_send_failed',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send verification email. Please try again later.',
        },
        { status: 500 }
      );
    }

    logger.logAuthAttempt('resend_verification', true, {
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Verification email sent! Please check your inbox.',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error('Resend verification error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while sending verification email',
      },
      { status: 500 }
    );
  }
}
