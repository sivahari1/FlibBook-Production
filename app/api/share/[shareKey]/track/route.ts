/**
 * POST /api/share/[shareKey]/track
 * Track view analytics for shared documents
 * 
 * This endpoint records viewing sessions including IP address,
 * user agent, and optional geolocation data for analytics.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getShareLinkByKey } from '@/lib/documents'
import { getClientIP, getUserAgent } from '@/lib/sharing'
import { trackViewSchema } from '@/lib/validation/sharing'
import { sanitizeString } from '@/lib/sanitization'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Track document view analytics
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareKey: string }> }
) {
  try {
    const { shareKey: shareKeyRaw } = await params

    // Sanitize input
    const shareKey = sanitizeString(shareKeyRaw)

    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      logger.warn('Unauthorized analytics tracking attempt', { shareKey })
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = trackViewSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('Invalid analytics tracking request', {
        shareKey,
        errors: validation.error.issues
      })
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validation.error.issues.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        },
        { status: 400 }
      )
    }

    const { duration } = validation.data

    // Find the share link
    const shareLink = await getShareLinkByKey(shareKey)

    if (!shareLink) {
      logger.warn('Analytics tracking attempted for non-existent share', {
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

    // Extract request metadata
    const ipAddress = getClientIP(request.headers) || 'unknown'
    const userAgent = getUserAgent(request.headers) || 'unknown'

    // Create analytics record
    const analytics = await prisma.viewAnalytics.create({
      data: {
        documentId: shareLink.documentId,
        shareKey,
        viewerEmail: session.user.email,
        ipAddress,
        userAgent,
        viewedAt: new Date(),
        // Geolocation fields are optional and can be populated by a background job
        country: null,
        city: null
      }
    })

    logger.info('View analytics tracked', {
      shareKey,
      documentId: shareLink.documentId,
      viewerEmail: session.user.email,
      analyticsId: analytics.id,
      duration
    })

    // Return success with analytics ID
    return NextResponse.json(
      {
        success: true,
        analyticsId: analytics.id
      },
      { status: 201 }
    )

  } catch (error) {
    // Log error but don't fail the request
    // Analytics tracking should not block document viewing
    logger.error('Error tracking analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    // Return success even on error to not block user experience
    return NextResponse.json(
      {
        success: true,
        analyticsId: 'error'
      },
      { status: 201 }
    )
  }
}
