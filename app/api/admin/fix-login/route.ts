import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * Emergency API endpoint to diagnose and fix admin login issues
 * This should be removed or secured after fixing the issue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword, secretKey } = body;

    // Simple security check - you should set this in your environment
    if (secretKey !== process.env.ADMIN_FIX_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and newPassword are required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userRole: true,
        emailVerified: true,
        isActive: true,
        subscription: true,
        passwordHash: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', email },
        { status: 404 }
      );
    }

    // Diagnose issues
    const issues = [];
    const fixes = {};

    if (user.userRole !== 'ADMIN') {
      issues.push(`UserRole is "${user.userRole}" but should be "ADMIN"`);
      fixes.userRole = 'ADMIN';
    }

    if (!user.emailVerified) {
      issues.push('Email is not verified');
      fixes.emailVerified = true;
    }

    if (!user.isActive) {
      issues.push('Account is not active');
      fixes.isActive = true;
    }

    if (!user.subscription) {
      issues.push('Subscription is not set');
      fixes.subscription = 'free';
    }

    // Always update password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    fixes.passwordHash = newPasswordHash;

    // Apply fixes
    const updatedUser = await prisma.user.update({
      where: { email },
      data: fixes,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userRole: true,
        emailVerified: true,
        isActive: true,
        subscription: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account fixed successfully',
      user: updatedUser,
      issuesFound: issues,
      fixesApplied: Object.keys(fixes),
    });

  } catch (error) {
    console.error('Error fixing admin login:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for diagnosis only (no fixes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const secretKey = searchParams.get('secretKey');

    // Simple security check
    if (secretKey !== process.env.ADMIN_FIX_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userRole: true,
        emailVerified: true,
        isActive: true,
        subscription: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', email },
        { status: 404 }
      );
    }

    // Diagnose issues
    const issues = [];

    if (user.userRole !== 'ADMIN') {
      issues.push(`UserRole is "${user.userRole}" but should be "ADMIN"`);
    }

    if (!user.emailVerified) {
      issues.push('Email is not verified');
    }

    if (!user.isActive) {
      issues.push('Account is not active');
    }

    if (!user.subscription) {
      issues.push('Subscription is not set');
    }

    return NextResponse.json({
      user,
      issues,
      hasIssues: issues.length > 0,
    });

  } catch (error) {
    console.error('Error diagnosing admin login:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
