import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { memberRegistrationSchema } from '@/lib/validation/jstudyroom';
import { ZodError } from 'zod';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Public registration is ENABLED for MEMBER role only
  // Platform Users must request access through the admin approval process
  try {
    const body = await request.json();
    
    // Validate and sanitize inputs using Zod schema
    let validatedData;
    try {
      validatedData = memberRegistrationSchema.parse(body);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        );
      }
      throw error;
    }

    const { name, email, password } = validatedData;

    // Apply rate limiting per email
    const rateLimitResult = checkRateLimit(
      `registration:${email}`,
      RATE_LIMITS.REGISTRATION
    );

    if (!rateLimitResult.success) {
      logger.warn('Registration rate limit exceeded', { email });
      return NextResponse.json(
        { 
          error: 'Too many registration attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600'
          }
        }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (12 rounds)
    const hashedPassword = await hash(password, 12);

    // Create user with MEMBER role (unverified by default)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        userRole: 'MEMBER', // Explicitly set to MEMBER for self-registration
        subscription: 'free',
        storageUsed: 0,
        emailVerified: false, // Explicitly set to false
        freeDocumentCount: 0, // Initialize document counts
        paidDocumentCount: 0,
      },
    });

    logger.info('User registered successfully (unverified)', {
      userId: user.id,
      email: user.email
    });

    // Generate verification token
    try {
      const tokenData = await generateVerificationToken(user.id, 'EMAIL_VERIFICATION');
      
      // Build verification URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verificationUrl = `${appUrl}/verify?token=${tokenData.token}`;

      // Send verification email
      const emailSent = await sendVerificationEmail(user.email, {
        userName: user.name || 'User',
        verificationUrl,
      });

      if (!emailSent) {
        logger.warn('Verification email failed to send', {
          userId: user.id,
          email: user.email
        });
        // Don't fail registration if email fails - user can resend later
      }
    } catch (error: unknown) {
      logger.error('Failed to generate token or send verification email', {
        userId: user.id,
        error
      });
      // Don't fail registration if token/email fails - user can resend later
    }

    // Return success message with instructions
    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        email: user.email,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          subscription: user.subscription,
          emailVerified: user.emailVerified,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    logger.error('Registration error', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
