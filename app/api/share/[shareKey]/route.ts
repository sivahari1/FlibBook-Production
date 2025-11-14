import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getShareLinkByKey, incrementShareViewCount } from '@/lib/documents';
import { getSignedUrl } from '@/lib/storage';
import { canAccessLinkShare, getPasswordCookieName } from '@/lib/sharing';
import { sanitizeString } from '@/lib/sanitization';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';

type ShareLinkWithDocument = NonNullable<Awaited<ReturnType<typeof getShareLinkByKey>>>;

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * GET /api/share/[shareKey]
 * Validate share link and return document metadata with signed URL
 * 
 * This endpoint validates all access controls including:
 * - Session authentication
 * - Share active status
 * - Expiration date
 * - View limits
 * - Email restrictions
 * - Password protection
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8, 4.9, 4.10, 10.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareKey: string }> }
) {
  try {
    const { shareKey: shareKeyRaw } = await params;
    
    // Sanitize input
    const shareKey = sanitizeString(shareKeyRaw);

    // Requirement 4.1: Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      logger.warn('Unauthorized share access attempt', { shareKey });
      return NextResponse.json(
        { 
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to access shared documents'
          }
        },
        { status: 401 }
      );
    }

    // Find the share link
    const shareLinkData = await getShareLinkByKey(shareKey);

    if (!shareLinkData || !shareLinkData.document) {
      logger.warn('Share link not found', { shareKey });
      return NextResponse.json(
        { 
          error: {
            code: 'NOT_FOUND',
            message: 'Share link not found'
          }
        },
        { status: 404 }
      );
    }

    const shareLink = shareLinkData as any;

    // Check for password cookie
    const cookieStore = await cookies();
    const passwordCookieName = getPasswordCookieName(shareKey);
    const hasValidPasswordCookie = cookieStore.has(passwordCookieName);

    // Validate access using utility function
    const accessValidation = canAccessLinkShare(
      shareLink,
      session.user.email,
      hasValidPasswordCookie
    );

    if (!accessValidation.isValid || !accessValidation.canAccess) {
      logger.warn('Share access denied', {
        shareKey,
        userEmail: session.user.email,
        restrictedEmail: shareLink.restrictToEmail,
        reason: accessValidation.error?.code
      });

      // Provide specific error message for email mismatch
      if (accessValidation.error?.code === 'EMAIL_MISMATCH' && shareLink.restrictToEmail) {
        return NextResponse.json(
          { 
            error: {
              code: 'EMAIL_MISMATCH',
              message: `Access denied: This share is restricted to ${shareLink.restrictToEmail}. You are logged in as ${session.user.email}.`
            },
            requiresPassword: false
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { 
          error: accessValidation.error,
          requiresPassword: accessValidation.requiresPassword
        },
        { status: 403 }
      );
    }

    // Requirement 4.8: Atomically increment view count
    await incrementShareViewCount(shareLink.id);

    // Requirement 4.9: Generate signed URL with 5-minute TTL
    const { url: signedUrl, error: urlError } = await getSignedUrl(
      shareLink.document.storagePath,
      300 // 5 minutes in seconds
    );

    if (urlError || !signedUrl) {
      logger.error('Failed to generate signed URL', {
        shareKey,
        error: urlError
      });
      return NextResponse.json(
        { 
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate document access URL'
          }
        },
        { status: 500 }
      );
    }

    logger.info('Share access granted', {
      shareKey,
      userEmail: session.user.email,
      documentId: shareLink.document.id,
      viewCount: shareLink.viewCount + 1
    });

    // Requirement 4.10: Return document metadata and signed URL
    return NextResponse.json({
      document: {
        id: shareLink.document.id,
        title: shareLink.document.title,
        filename: shareLink.document.filename
      },
      signedUrl,
      canDownload: shareLink.canDownload,
      requiresPassword: false // Already validated
    });

  } catch (error) {
    logger.error('Share link validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate share link'
        }
      },
      { status: 500 }
    );
  }
}
