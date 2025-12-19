import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDocumentById } from '@/lib/documents'
import { deleteFile } from '@/lib/storage'
import { logger } from '@/lib/logger'
import { requirePlatformUser } from '@/lib/role-check'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

/**
 * GET /api/documents/[id]
 * Get single document details with share links and analytics count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    // Fetch document using shared data access layer (includes ownership check)
    const document = await getDocumentById(documentId, session.user.id)

    // Check if document exists or user doesn't have access
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Convert BigInt to string for JSON serialization and transform shareLinks
    const documentResponse = {
      ...document,
      fileSize: document.fileSize.toString(),
      analyticsCount: document._count.analytics,
      shareLinks: document.shareLinks.map(link => ({
        ...link,
        hasPassword: !!link.password,
        password: undefined, // Don't expose password hash
      }))
    }

    // Remove _count from response
    delete (documentResponse as any)._count

    return NextResponse.json(documentResponse)
  } catch (error: unknown) {
    logger.error('Error fetching document', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document with storage cleanup
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication and role (PLATFORM_USER or ADMIN only)
    const roleCheck = await requirePlatformUser()
    if (roleCheck) return roleCheck

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    // Fetch document to verify ownership and get storage path
    const document = await prisma.document.findUnique({
      where: {
        id: documentId
      },
      select: {
        id: true,
        userId: true,
        storagePath: true,
        fileSize: true
      }
    })

    // Check if document exists
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      )
    }

    // Delete file from Supabase Storage
    const deleteResult = await deleteFile(document.storagePath)
    
    if (!deleteResult.success) {
      console.error('Failed to delete file from storage:', deleteResult.error)
      // Continue with database deletion even if storage deletion fails
      // This prevents orphaned database records
    }

    // Delete document from database (cascades to shareLinks and analytics)
    await prisma.document.delete({
      where: {
        id: documentId
      }
    })

    // Update user's storage usage
    await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        storageUsed: {
          decrement: document.fileSize
        }
      }
    })

    logger.info('Document deleted successfully', {
      userId: session.user.id,
      documentId
    })

    return NextResponse.json({
      message: 'Document deleted successfully'
    })
  } catch (error: unknown) {
    logger.error('Error deleting document', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
