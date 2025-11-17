/**
 * POST /api/share/email
 * Create a new email share for a document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createEmailShareSchema } from '@/lib/validation/sharing'
import { sanitizeNote, formatShareUrl, getBaseUrl } from '@/lib/sharing'
import { getDocumentById, createEmailShare, findUserByEmail } from '@/lib/documents'
import { sendShareEmail } from '@/lib/email-share'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { requirePlatformUser } from '@/lib/role-check'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and role (PLATFORM_USER or ADMIN only)
    const roleCheck = await requirePlatformUser()
    if (roleCheck) return roleCheck

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createEmailShareSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: validation.error.issues
          }
        },
        { status: 400 }
      )
    }

    const { documentId, email, expiresAt, canDownload, note } = validation.data

    if (email === session.user.email) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Cannot share with yourself' } },
        { status: 400 }
      )
    }

    const document = await getDocumentById(documentId, session.user.id)
    if (!document) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Document not found' } },
        { status: 403 }
      )
    }

    let expirationDate: Date | undefined
    if (expiresAt) {
      expirationDate = new Date(expiresAt)
      if (expirationDate <= new Date()) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Expiration date must be in the future' } },
          { status: 400 }
        )
      }
    }

    const recipientUser = await findUserByEmail(email)
    const sanitizedNote = note ? sanitizeNote(note) : undefined

    const existingShare = await prisma.documentShare.findFirst({
      where: {
        documentId,
        sharedByUserId: session.user.id,
        OR: [
          { sharedWithUserId: recipientUser?.id },
          { sharedWithEmail: email }
        ]
      }
    })

    if (existingShare) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Already shared with this email' } },
        { status: 400 }
      )
    }

    const emailShare = await createEmailShare({
      documentId,
      sharedByUserId: session.user.id,
      sharedWithUserId: recipientUser?.id,
      sharedWithEmail: recipientUser ? undefined : email,
      expiresAt: expirationDate,
      canDownload: canDownload ?? false,
      note: sanitizedNote
    })

    logger.info('Email share created', { shareId: emailShare.id, documentId, email })

    // Send notification email (don't block on failure)
    const baseUrl = getBaseUrl(request.headers)
    const shareUrl = `${baseUrl}/inbox` // User will see the share in their inbox
    
    sendShareEmail({
      recipientEmail: email,
      recipientName: recipientUser?.name || undefined,
      senderName: session.user.name || session.user.email || 'A user',
      documentTitle: document.title,
      shareUrl,
      expiresAt: expirationDate,
      note: sanitizedNote,
      canDownload: canDownload ?? false
    }).catch(err => {
      // Log but don't fail the request if email fails
      logger.warn('Failed to send share notification email', { 
        error: err.message,
        shareId: emailShare.id 
      });
    });

    return NextResponse.json(
      { success: true, shareId: emailShare.id },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating email share', { error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create email share' } },
      { status: 500 }
    )
  }
}
