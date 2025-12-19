/**
 * POST /api/share/[shareKey]/verify-password
 * Verify password for password-protected share links
 * 
 * This endpoint validates the password and sets a secure cookie
 * that allows access to the share for 1 hour.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getShareLinkByKey } from '@/lib/documents'
import { verifyPassword, getPasswordCookieName, getPasswordCookieExpiry } from '@/lib/sharing'
import { verifyPasswordSchema } from '@/lib/validation/sharing'
import { sanitizeString } from '@/lib/sanitization'
import { logger } from '@/lib/logger'
import { cookies } from 'next/headers'
import type { ValidationErrorDetail } from '@/lib/types/api'
import type { ZodIssue } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Verify password for share link
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.9
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareKey: string }> }
) {
  try {
    const { shareKey: shareKeyRaw } = await params

    // Sanitize input
    const shareKey = sanitizeString(shareKeyRaw)

    // Parse and validate request body
    const body = await request.json()
    const validation = verifyPasswordSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('Invalid password verification request', {
        shareKey,
        errors: validation.error.issues
      })
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validation.error.issues.map((err: ZodIssue): ValidationErrorDetail => ({
              code: err.code,
              field: err.path.join('.'),
              message: err.message
            }))
          }
        },
        { status: 400 }
      )
    }

    const { password } = validation.data

    // Find the share link
    const shareLink = await getShareLinkByKey(shareKey)

    if (!shareLink) {
      logger.warn('Password verification attempted for non-existent share', {
        shareKey
      })
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Share link not found'
          }
        },
        { status: 404 }
      )
    }

    // Check if share requires password
    if (!shareLink.password) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'This share does not require a password'
          }
        },
        { status: 400 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, shareLink.password)

    if (!isValid) {
      logger.warn('Invalid password attempt', {
        shareKey,
        documentId: shareLink.documentId
      })
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Incorrect password'
          }
        },
        { status: 401 }
      )
    }

    // Set secure cookie for 1 hour
    const cookieStore = await cookies()
    const cookieName = getPasswordCookieName(shareKey)
    const expiry = getPasswordCookieExpiry()

    cookieStore.set(cookieName, 'verified', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiry,
      path: '/'
    })

    logger.info('Password verified successfully', {
      shareKey,
      documentId: shareLink.documentId
    })

    return NextResponse.json(
      {
        success: true
      },
      { status: 200 }
    )

  } catch (error: unknown) {
    logger.error('Error verifying password', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify password'
        }
      },
      { status: 500 }
    )
  }
}
