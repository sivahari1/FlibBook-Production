import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateToken, invalidateUserTokens } from '@/lib/tokens';
import { validatePasswordStrength } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/reset-password
 * Reset user password with a valid reset token
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Reset token is required.',
        },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'New password is required.',
        },
        { status: 400 }
      );
    }

    // Validate password strength (Requirement 4.2)
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidation.error || 'Password does not meet security requirements.',
        },
        { status: 400 }
      );
    }

    // Rate limiting for password reset submissions (5 per hour per token)
    const { checkRateLimit, RATE_LIMITS } = await import('@/lib/rate-limit');
    const rateLimitResult = checkRateLimit(
      `password-reset-submit:${token}`,
      RATE_LIMITS.PASSWORD_RESET_SUBMIT
    );

    if (!rateLimitResult.success) {
      logger.logRateLimitViolation('password-reset-submit', token, {
        retryAfter: rateLimitResult.retryAfter,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Too many password reset attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { status: 429 }
      );
    }

    // Validate reset token (Requirement 4.1)
    const tokenValidation = await validateToken(token, 'PASSWORD_RESET');

    if (!tokenValidation.valid) {
      // Log failed password reset attempt
      logger.logAuthAttempt('reset_password', false, {
        error: tokenValidation.error,
        tokenProvided: !!token,
      });

      // Provide specific error messages for different scenarios
      let errorMessage = 'Invalid or expired reset link.';
      if (tokenValidation.error === 'Token expired') {
        errorMessage = 'Your password reset link has expired. Please request a new one.';
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: tokenValidation.error,
        },
        { status: 400 }
      );
    }

    const userId = tokenValidation.userId!;

    // Hash the new password (Requirement 4.3)
    const passwordHash = await hashPassword(password);

    // Update user password in database (Requirement 14.3, 14.5)
    // IMPORTANT: Only update passwordHash, maintain emailVerified status
    // Do NOT set emailVerified to false or null - preserve existing verification status
    await prisma.user.update({
      where: { id: userId },
      data: { 
        passwordHash,
        // Explicitly NOT modifying emailVerified - it maintains its current value
      },
    });

    // Invalidate the used reset token (Requirement 4.4)
    await invalidateUserTokens(userId, 'PASSWORD_RESET');

    // Note: NextAuth JWT sessions are stateless, so we can't invalidate them server-side
    // The user will need to log in again with their new password
    // When they log in, a new JWT will be issued automatically
    
    // Log successful password reset
    logger.logAuthAttempt('reset_password', true, {
      userId,
    });

    // Log security event for password change
    logger.logSecurityEvent('password_reset_completed', 'medium', {
      userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. Please log in with your new password.',
    });
  } catch (error: unknown) {
    logger.error('Password reset error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while resetting your password. Please try again later.',
      },
      { status: 500 }
    );
  }
}
