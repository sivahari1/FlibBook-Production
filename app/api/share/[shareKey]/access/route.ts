/**
 * GET /api/share/[shareKey]/access
 * Validate share access without returning document data
 * 
 * This endpoint validates access controls for a share link including:
 * - User authentication
 * - Email restrictions
 * - Share active status
 * - Expiration date
 * - View limits
 * 
 * Requirements: 4.3, 4.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getShareLinkByKey } from '@/lib/documents'
import { canAccessLinkShare, getPasswordCookieName } from '@/lib/sharing'
import { sanitizeString } from '@/lib/sanitization'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Validate share access for authenticated user
 * Requirements: 4.3, 4.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareKey: string }> }
) {
  try {
    const { shareKey: shareKeyRaw } = await params
    
    // Sanitize input
    const shareKey = sanitizeString(shareKeyRaw)

    // Requirement 12.2: Verify user is logged in
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      logger.warn('Unauthorized share access validation attempt', { shareKey })
      return NextResponse.json(
        { 
          allowed: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to access this document'
          },
          requiresLogin: true
        },
        { status: 401 }
      )
    }

    // Find the share link
    const shareLinkData = await getShareLinkByKey(shareKey)

    if (!shareLinkData || !shareLinkData.document) {
      logger.warn('Share link not found for access validation', { shareKey })
      return NextResponse.json(
        { 
          allowed: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Share link not found'
          }
        },
        { status: 404 }
      )
    }

    const shareLink = shareLinkData as any

    // Check for password cookie
    const cookieStore = await cookies()
    const passwordCookieName = getPasswordCookieName(shareKey)
    const hasValidPasswordCookie = cookieStore.has(passwordCookieName)

    // Validate access using utility function
    const accessValidation = canAccessLinkShare(
      shareLink,
      session.user.email,
      hasValidPasswordCookie
    )

    // Requirement 12.4: Check if user's email matches the share recipient email
    if (shareLink.restrictToEmail) {
      const userEmail = session.user.email.toLowerCase()
      const restrictedEmail = shareLink.restrictToEmail.toLowerCase()

      if (userEmail !== restrictedEmail) {
        // Requirement 12.5: Display "Access Denied" for email mismatch
        logger.warn('Share access denied - email mismatch', {
          shareKey,
          userEmail: session.user.email,
          restrictedEmail: shareLink.restrictToEmail
        })

        return NextResponse.json(
          { 
            allowed: false,
            error: {
              code: 'EMAIL_MISMATCH',
              message: 'Access Denied - This document was shared with a different email address'
            },
            details: {
              userEmail: session.user.email,
              restrictedEmail: shareLink.restrictToEmail
            }
          },
          { status: 403 }
        )
      }
    }

    // Check other access validations
    if (!accessValidation.isValid || !accessValidation.canAccess) {
      logger.warn('Share access validation failed', {
        shareKey,
        userEmail: session.user.email,
        reason: accessValidation.error?.code
      })

      return NextResponse.json(
        { 
          allowed: false,
          error: accessValidation.error,
          requiresPassword: accessValidation.requiresPassword
        },
        { status: 403 }
      )
    }

    // Requirement 12.6: Allow access if email matches
    // Requirement 12.7: Allow access if no email restriction
    logger.info('Share access validation successful', {
      shareKey,
      userEmail: session.user.email,
      hasEmailRestriction: !!shareLink.restrictToEmail
    })

    return NextResponse.json(
      {
        allowed: true,
        shareInfo: {
          documentTitle: shareLink.document.title,
          expiresAt: shareLink.expiresAt,
          canDownload: shareLink.canDownload,
          hasEmailRestriction: !!shareLink.restrictToEmail
        }
      },
      { status: 200 }
    )

  } catch (error) {
    logger.error('Share access validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        allowed: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate share access'
        }
      },
      { status: 500 }
    )
  }
}
