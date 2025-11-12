import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { sanitizeString, sanitizeInteger } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Verify document exists and user owns it
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this document' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { expiresAt, password: passwordRaw, maxViews: maxViewsRaw } = body;
    
    // Sanitize inputs
    const password = sanitizeString(passwordRaw);
    const maxViews = sanitizeInteger(maxViewsRaw);

    // Generate cryptographically secure shareKey (32 bytes, base64url)
    const shareKey = randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Hash password if provided
    let passwordHash: string | undefined;
    if (password && typeof password === 'string' && password.length > 0) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    // Validate and parse expiresAt if provided
    let expiresAtDate: Date | undefined;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiration date' },
          { status: 400 }
        );
      }
      // Check if expiration date is in the past
      if (expiresAtDate <= new Date()) {
        return NextResponse.json(
          { error: 'Expiration date must be in the future' },
          { status: 400 }
        );
      }
    }

    // Validate maxViews if provided
    let maxViewsValue: number | undefined;
    if (maxViews !== null) {
      if (maxViews < 1) {
        return NextResponse.json(
          { error: 'Max views must be a positive number' },
          { status: 400 }
        );
      }
      maxViewsValue = maxViews;
    }

    // Create ShareLink in database
    const shareLink = await prisma.shareLink.create({
      data: {
        shareKey,
        documentId,
        userId: session.user.id,
        expiresAt: expiresAtDate,
        password: passwordHash,
        maxViews: maxViewsValue,
        isActive: true,
        viewCount: 0,
      },
    });

    // Generate share URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/view/${shareKey}`;

    logger.info('Share link created', {
      userId: session.user.id,
      documentId,
      shareKey,
      hasPassword: !!passwordHash,
      hasExpiration: !!expiresAtDate,
      hasMaxViews: !!maxViewsValue
    });

    return NextResponse.json({
      id: shareLink.id,
      shareKey: shareLink.shareKey,
      shareUrl,
      expiresAt: shareLink.expiresAt,
      maxViews: shareLink.maxViews,
      isActive: shareLink.isActive,
      viewCount: shareLink.viewCount,
      createdAt: shareLink.createdAt,
    });
  } catch (error) {
    logger.error('Error creating share link', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
