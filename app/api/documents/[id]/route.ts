import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import { logger } from '@/lib/logger'

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

    // Fetch document with related data
    const document = await prisma.document.findUnique({
      where: {
        id: documentId
      },
      include: {
        shareLinks: {
          select: {
            id: true,
            shareKey: true,
            expiresAt: true,
            isActive: true,
            password: true,
            maxViews: true,
            viewCount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            analytics: true
          }
        }
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
  } catch (error) {
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
    // Verify authentication
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
  } catch (error) {
    logger.error('Error deleting document', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
