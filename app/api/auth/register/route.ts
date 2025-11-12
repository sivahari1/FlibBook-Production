import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sanitizeString, sanitizeEmail } from '@/lib/sanitization';
import { logger } from '@/lib/logger';
import { generateVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name: nameRaw, email: emailRaw, password: passwordRaw } = body;
    
    // Sanitize inputs
    const name = sanitizeString(nameRaw);
    const email = sanitizeEmail(emailRaw);
    const password = passwordRaw; // Don't sanitize password, just validate length

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
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

    // Create user (unverified by default)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        subscription: 'free',
        storageUsed: 0,
        emailVerified: false, // Explicitly set to false
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
    } catch (error) {
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
  } catch (error) {
    logger.error('Registration error', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
