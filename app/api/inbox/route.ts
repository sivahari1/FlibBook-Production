/**
 * GET /api/inbox
 * Retrieve all documents shared with the authenticated user
 * 
 * This endpoint returns documents shared via email (DocumentShare)
 * to the current user, including both registered user shares and
 * email-based shares.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEmailSharesForUser } from '@/lib/documents'
import { logger } from '@/lib/logger'
import { InboxItem } from '@/lib/types/sharing'
import type { EmailShareWithDocument } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Get inbox items for authenticated user
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 10.7
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      logger.warn('Unauthorized inbox access attempt')
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

    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = (page - 1) * limit

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pagination parameters'
          }
        },
        { status: 400 }
      )
    }

    // Fetch email shares for the user
    const emailShares = await getEmailSharesForUser(session.user.id, session.user.email)

    // Filter out expired shares and apply pagination
    const now = new Date()
    const activeShares = emailShares.filter((share: EmailShareWithDocument) => {
      if (!share.expiresAt) return true
      return share.expiresAt > now
    })

    // Apply pagination
    const paginatedShares = activeShares.slice(offset, offset + limit)

    // Transform to InboxItem format
    const inboxItems: InboxItem[] = paginatedShares.map((share: EmailShareWithDocument) => ({
      id: share.id,
      document: {
        id: share.document.id,
        title: share.document.title,
        filename: share.document.filename
      },
      sharedBy: {
        name: share.sharedBy.name,
        email: share.sharedBy.email
      },
      createdAt: share.createdAt,
      expiresAt: share.expiresAt || undefined,
      canDownload: share.canDownload,
      note: share.note || undefined,
      type: 'email'
    }))

    logger.info('Inbox retrieved successfully', {
      userId: session.user.id,
      itemCount: inboxItems.length,
      page,
      limit
    })

    // Return response with pagination metadata
    return NextResponse.json(
      {
        shares: inboxItems,
        pagination: {
          page,
          limit,
          total: activeShares.length,
          totalPages: Math.ceil(activeShares.length / limit),
          hasMore: offset + limit < activeShares.length
        }
      },
      { status: 200 }
    )

  } catch (error: unknown) {
    logger.error('Error retrieving inbox', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve inbox'
        }
      },
      { status: 500 }
    )
  }
}
