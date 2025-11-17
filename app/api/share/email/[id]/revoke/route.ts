/**
 * DELETE /api/share/email/[id]/revoke
 * Revoke an email share by deleting it
 * 
 * This endpoint allows document owners to revoke email shares,
 * removing the document from the recipient's inbox.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeEmailShare } from '@/lib/documents'
import { logger } from '@/lib/logger'
import { requirePlatformUser } from '@/lib/role-check'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Revoke an email share
 * 
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shareId } = await params

    // Verify authentication and role (PLATFORM_USER or ADMIN only)
    const roleCheck = await requirePlatformUser()
    if (roleCheck) return roleCheck

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      logger.warn('Unauthorized email share revoke attempt', { shareId })
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

    // Revoke the share (includes ownership verification)
    const revokedShare = await revokeEmailShare(shareId, session.user.id)

    if (!revokedShare) {
      logger.warn('Email share revoke failed - not found or unauthorized', {
        shareId,
        userId: session.user.id
      })
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Share not found or you do not have permission to revoke it'
          }
        },
        { status: 403 }
      )
    }

    logger.info('Email share revoked successfully', {
      shareId,
      userId: session.user.id,
      documentId: revokedShare.documentId
    })

    return NextResponse.json(
      {
        success: true,
        shareId: revokedShare.id
      },
      { status: 200 }
    )

  } catch (error) {
    logger.error('Error revoking email share', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to revoke share'
        }
      },
      { status: 500 }
    )
  }
}
