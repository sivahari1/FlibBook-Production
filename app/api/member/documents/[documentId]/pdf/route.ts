import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canViewDocument } from '@/lib/authz/canViewDocument'
import { prisma } from '@/lib/db'
import { generateSignedUrl } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * GET /api/member/documents/[documentId]/pdf
 * Generate signed URL for PDF access - Member-safe with authorization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // Verify session via NextAuth
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documentId } = await params

    // Find the Document row and its storagePath
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        storagePath: true,
        contentType: true,
        mimeType: true,
        userId: true
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Call canViewDocument authorization
    const canView = await canViewDocument(session, documentId)
    if (!canView) {
      return NextResponse.json(
        { error: 'Access denied - you do not have permission to view this document' },
        { status: 403 }
      )
    }

    // Ensure it's a PDF
    if (document.contentType !== 'PDF' || document.mimeType !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Document is not a PDF' },
        { status: 400 }
      )
    }

    // Generate signed URL from Supabase Storage
    const signedUrlResult = await generateSignedUrl(
      'documents', // bucket
      document.storagePath, // path
      3600 // 60 minutes expiry
    )

    if (!signedUrlResult.ok) {
      logger.error('Failed to generate signed URL', {
        documentId,
        userId: session.user.id,
        error: signedUrlResult.error
      })
      
      return NextResponse.json(
        { error: 'Failed to generate PDF access URL' },
        { status: 500 }
      )
    }

    logger.info('PDF signed URL generated successfully', {
      documentId,
      userId: session.user.id
    })

    return NextResponse.json({
      ok: true,
      url: signedUrlResult.signedUrl
    })

  } catch (error: unknown) {
    logger.error('Error generating PDF signed URL', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF access URL' },
      { status: 500 }
    )
  }
}