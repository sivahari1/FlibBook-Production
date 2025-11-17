import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateToken, invalidateUserTokens } from '@/lib/tokens';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// Verify user's email address using a verification token

/**
 * POST /api/auth/verify-email
 * Verify user's email address using a verification token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Verification token is required' 
        },
        { status: 400 }
      );
    }

    // Validate the token
    const validation = await validateToken(token, 'EMAIL_VERIFICATION');

    if (!validation.valid) {
      // Log failed verification attempt
      logger.logAuthAttempt('verify_email', false, {
        error: validation.error,
        tokenProvided: !!token,
      });

      // Determine appropriate error message and action
      let message = 'Invalid verification link';
      let action = 'resend';

      if (validation.error === 'Token expired') {
        message = 'Your verification link has expired';
      } else if (validation.error === 'Invalid token') {
        message = 'Invalid verification link';
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: validation.error === 'Token expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
            message,
            action,
          },
        },
        { status: 400 }
      );
    }

    // Get the user ID from validation
    const userId = validation.userId!;

    // Check if user exists and is not already verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        emailVerified: true,
        userRole: true,
      } as any, // Type assertion for newly added field
    });

    if (!user) {
      logger.error('User not found during email verification', { userId });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found',
            action: null,
          },
        },
        { status: 404 }
      );
    }

    // Determine redirect URL based on user role
    const redirectUrl = (user as any).userRole === 'MEMBER' ? '/login' : '/dashboard';

    // If already verified, return success (idempotent)
    if (user.emailVerified) {
      logger.logAuthAttempt('verify_email', true, {
        userId,
        email: user.email,
        alreadyVerified: true,
      });
      
      // Still invalidate the token
      await invalidateUserTokens(userId, 'EMAIL_VERIFICATION');

      return NextResponse.json(
        {
          success: true,
          message: 'Email already verified',
          redirectUrl,
        },
        { status: 200 }
      );
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      } as any, // Type assertion needed due to Prisma client generation issue
    });

    // Invalidate all email verification tokens for this user
    await invalidateUserTokens(userId, 'EMAIL_VERIFICATION');

    // Log successful verification
    logger.logAuthAttempt('verify_email', true, {
      userId,
      email: user.email,
      userRole: (user as any).userRole,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Email verified successfully! You can now log in to your account.',
        redirectUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Email verification error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during email verification',
          action: null,
        },
      },
      { status: 500 }
    );
  }
}
