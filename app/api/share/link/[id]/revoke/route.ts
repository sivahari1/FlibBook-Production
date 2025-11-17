/**
 * PATCH /api/share/link/[id]/revoke
 * Revoke a link share by setting it to inactive
 * 
 * This endpoint allows document owners to revoke link shares,
 * preventing further access through the share link.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeLinkShare } from '@/lib/documents'
import { logger } from '@/lib/logger'
import { requirePlatformUser } from '@/lib/role-check'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * Revoke a link share
 * 
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export async function PATCH(
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
      logger.warn('Unauthorized link share revoke attempt', { shareId })
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
    const revokedShare = await revokeLinkShare(shareId, session.user.id)

    if (!revokedShare) {
      logger.warn('Link share revoke failed - not found or unauthorized', {
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

    logger.info('Link share revoked successfully', {
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
    logger.error('Error revoking link share', {
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
