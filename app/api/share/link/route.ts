/**
 * POST /api/share/link
 * Create a new link share for a document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLinkShareSchema } from '@/lib/validation/sharing'
import { generateShareKey, hashPassword, getBaseUrl, formatShareUrl } from '@/lib/sharing'
import { getDocumentById, createLinkShare } from '@/lib/documents'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createLinkShareSchema.safeParse(body)
    
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

    const { documentId, expiresAt, maxViews, password, restrictToEmail, canDownload } = validation.data

    const document = await getDocumentById(documentId, session.user.id)
    if (!document) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Document not found' } },
        { status: 403 }
      )
    }

    const shareKey = generateShareKey()
    let hashedPassword: string | undefined
    if (password) {
      hashedPassword = await hashPassword(password)
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

    const shareLink = await createLinkShare({
      shareKey,
      documentId,
      userId: session.user.id,
      expiresAt: expirationDate,
      password: hashedPassword,
      maxViews,
      restrictToEmail,
      canDownload: canDownload ?? false
    })

    const baseUrl = getBaseUrl(request.headers)
    const shareUrl = formatShareUrl(shareKey, baseUrl)

    logger.info('Link share created', { shareId: shareLink.id, documentId })

    return NextResponse.json(
      {
        shareKey,
        url: shareUrl,
        expiresAt: expirationDate?.toISOString(),
        maxViews,
        canDownload: canDownload ?? false
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error creating link share', { error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create share link' } },
      { status: 500 }
    )
  }
}
