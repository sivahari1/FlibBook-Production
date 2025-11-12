import { NextRequest, NextResponse } from 'next/server';
import { getShareLinkByKey } from '@/lib/documents';
import { getSignedUrl } from '@/lib/storage';
import { verifyPassword } from '@/lib/auth';
import { sanitizeString } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * GET /api/share/[shareKey]
 * Validate share link and return document metadata with signed URL
 * 
 * Query parameters:
 * - password: Optional password for password-protected links
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5, 5.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareKey: string }> }
) {
  try {
    const { shareKey: shareKeyRaw } = await params;
    const { searchParams } = new URL(request.url);
    const passwordRaw = searchParams.get('password');
    
    // Sanitize inputs
    const shareKey = sanitizeString(shareKeyRaw);
    const password = passwordRaw ? sanitizeString(passwordRaw) : null;

    // Find the share link using shared data access layer
    const shareLink = await getShareLinkByKey(shareKey);

    // Check if share link exists
    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Requirement 4.5: Check if link is active
    if (!shareLink.isActive) {
      return NextResponse.json(
        { error: 'This share link has been deactivated' },
        { status: 403 }
      );
    }

    // Requirement 4.2: Check expiration date
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This share link has expired' },
        { status: 403 }
      );
    }

    // Requirement 4.4: Check max views
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      return NextResponse.json(
        { error: 'This share link has reached its maximum view limit' },
        { status: 403 }
      );
    }

    // Requirement 4.3: Verify password if required
    if (shareLink.password) {
      if (!password) {
        return NextResponse.json(
          { 
            error: 'Password required',
            requiresPassword: true 
          },
          { status: 401 }
        );
      }

      const isPasswordValid = await verifyPassword(password, shareLink.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // Requirement 5.5: Generate signed URL with 1-hour expiration
    const { url: signedUrl, error: urlError } = await getSignedUrl(
      shareLink.document.storagePath,
      3600 // 1 hour in seconds
    );

    if (urlError || !signedUrl) {
      console.error('Failed to generate signed URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate document access URL' },
        { status: 500 }
      );
    }

    // Return document metadata and signed URL
    return NextResponse.json({
      document: {
        id: shareLink.document.id,
        title: shareLink.document.title,
        filename: shareLink.document.filename,
        fileSize: shareLink.document.fileSize,
        mimeType: shareLink.document.mimeType,
        createdAt: shareLink.document.createdAt
      },
      shareLink: {
        id: shareLink.id,
        shareKey: shareLink.shareKey,
        expiresAt: shareLink.expiresAt,
        maxViews: shareLink.maxViews,
        viewCount: shareLink.viewCount,
        requiresPassword: !!shareLink.password
      },
      signedUrl
    });

  } catch (error) {
    logger.error('Share link validation error', error);
    return NextResponse.json(
      { error: 'Failed to validate share link' },
      { status: 500 }
    );
  }
}
