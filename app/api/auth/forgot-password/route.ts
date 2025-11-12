import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateVerificationToken } from '@/lib/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { validateEmail } from '@/lib/validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/forgot-password
 * Request a password reset link
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          message: emailValidation.error || 'Invalid email address' 
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check rate limit (3 requests per hour per email)
    const rateLimitResult = checkRateLimit(
      `password-reset:${normalizedEmail}`,
      RATE_LIMITS.PASSWORD_RESET_REQUEST
    );

    if (!rateLimitResult.success) {
      // Rate limit violation already logged by checkRateLimit
      logger.logAuthAttempt('forgot_password', false, {
        email: normalizedEmail,
        reason: 'rate_limit_exceeded',
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration (Requirement 3.4)
    // Even if the email doesn't exist, we return the same response
    if (!user) {
      // Log suspicious activity - multiple attempts to reset passwords for non-existent emails could indicate enumeration attack
      logger.logSuspiciousActivity('password_reset_nonexistent_email', 'low', {
        email: normalizedEmail,
      });

      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link shortly.',
      });
    }

    // Generate password reset token (1 hour expiration)
    const tokenData = await generateVerificationToken(
      user.id,
      'PASSWORD_RESET'
    );

    // Construct reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${tokenData.token}`;

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, {
      userName: user.name || user.email,
      resetUrl,
    });

    if (!emailSent) {
      logger.logAuthAttempt('forgot_password', false, {
        userId: user.id,
        email: user.email,
        reason: 'email_send_failed',
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send password reset email. Please try again later.',
        },
        { status: 500 }
      );
    }

    logger.logAuthAttempt('forgot_password', true, {
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link shortly.',
    });
  } catch (error) {
    logger.error('Password reset request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.',
      },
      { status: 500 }
    );
  }
}
