/**
 * POST /api/share/email/[id]/view
 * Create a temporary viewing session for an email share
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Find the email share
    const emailShare = await prisma.documentShare.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            storagePath: true,
            userId: true,
          }
        },
        sharedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    if (!emailShare) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      )
    }

    // Check if the current user is authorized to view this share
    const userEmail = session.user.email.toLowerCase()
    const isAuthorized = 
      emailShare.sharedWithUserId === session.user.id ||
      (emailShare.sharedWithEmail && emailShare.sharedWithEmail.toLowerCase() === userEmail)

    if (!isAuthorized) {
      logger.warn('Unauthorized email share access attempt', {
        shareId: id,
        userEmail,
        sharedWithEmail: emailShare.sharedWithEmail,
        sharedWithUserId: emailShare.sharedWithUserId
      })
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check expiration
    if (emailShare.expiresAt && emailShare.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Share has expired' },
        { status: 410 }
      )
    }

    // Create or find existing share link for this document
    let shareLink = await prisma.shareLink.findFirst({
      where: {
        documentId: emailShare.documentId,
        userId: emailShare.sharedByUserId,
        isActive: true,
        restrictToEmail: userEmail,
      }
    })

    if (!shareLink) {
      // Create a temporary share link for this user
      const shareKey = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      
      shareLink = await prisma.shareLink.create({
        data: {
          shareKey,
          documentId: emailShare.documentId,
          userId: emailShare.sharedByUserId,
          restrictToEmail: userEmail,
          expiresAt: emailShare.expiresAt,
          isActive: true,
          canDownload: emailShare.canDownload,
          maxViews: null, // No view limit for email shares
          viewCount: 0,
        }
      })

      logger.info('Created temporary share link for email share', {
        shareId: id,
        shareLinkId: shareLink.id,
        shareKey: shareLink.shareKey,
        userEmail
      })
    }

    // Log the access
    logger.info('Email share accessed', {
      shareId: id,
      documentId: emailShare.documentId,
      userEmail,
      shareKey: shareLink.shareKey
    })

    // Return the view URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const viewUrl = `/view/${shareLink.shareKey}`

    return NextResponse.json({
      success: true,
      viewUrl,
      document: {
        id: emailShare.document.id,
        title: emailShare.document.title,
        filename: emailShare.document.filename,
      }
    })
  } catch (error) {
    logger.error('Email share view error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      shareId: (await params).id
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
