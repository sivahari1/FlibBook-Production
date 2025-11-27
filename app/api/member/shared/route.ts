/**
 * GET /api/member/shared
 * Retrieve all documents shared with the authenticated Member
 * 
 * This endpoint returns documents shared via email (DocumentShare)
 * to the current Member, filtering out expired shares.
 * 
 * Requirements: 4.1, 4.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEmailSharesForUser } from '@/lib/documents'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Get shared files for authenticated Member
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      logger.warn('Unauthorized shared files access attempt')
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

    // Verify user is a MEMBER or ADMIN (admins can test member features)
    if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
      logger.warn('Non-member attempted to access member shared files', {
        userId: session.user.id,
        role: session.user.userRole
      })
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'This endpoint is only accessible to Members'
          }
        },
        { status: 403 }
      )
    }

    // Fetch email shares for the Member
    const emailShares = await getEmailSharesForUser(session.user.id, session.user.email)

    // Filter out expired shares (Requirement 4.4)
    const now = new Date()
    const activeShares = emailShares.filter((share) => {
      if (!share.expiresAt) return true
      return share.expiresAt > now
    })

    // Transform to response format with share metadata
    const sharedFiles = activeShares.map((share) => ({
      id: share.id,
      document: {
        id: share.document.id,
        title: share.document.title,
        filename: share.document.filename
      },
      sharedBy: {
        name: share.sharedBy.name || 'Unknown',
        email: share.sharedBy.email
      },
      sharedAt: share.createdAt,
      expiresAt: share.expiresAt || null,
      canDownload: share.canDownload,
      note: share.note || null
    }))

    logger.info('Shared files retrieved successfully', {
      userId: session.user.id,
      fileCount: sharedFiles.length
    })

    return NextResponse.json(
      {
        shares: sharedFiles,
        count: sharedFiles.length
      },
      { status: 200 }
    )

  } catch (error) {
    logger.error('Error retrieving shared files', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve shared files'
        }
      },
      { status: 500 }
    )
  }
}
