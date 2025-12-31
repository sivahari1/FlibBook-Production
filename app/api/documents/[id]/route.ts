import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDocumentById } from '@/lib/documents'
import { deleteFileFromBucket } from '@/lib/storage'
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
 * Delete a document with proper cascade cleanup to prevent stale MyStudyRoom items
 * CRITICAL FIX: Atomic deletion of my_jstudyroom_items → book_shop_items → documents → storage
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
        fileSize: true,
        bookShopItems: {
          select: {
            id: true,
            myJstudyroomItems: {
              select: {
                id: true,
                userId: true
              }
            }
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

    // Verify ownership (admins can delete any document)
    if (document.userId !== session.user.id && session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this document' },
        { status: 403 }
      )
    }

    // ATOMIC DELETION: Delete in proper order to prevent stale references
    // 1. Delete my_jstudyroom_items referencing book_shop_items of that document
    // 2. Delete book_shop_items for that document  
    // 3. Delete document_pages for that document
    // 4. Delete documents row
    // 5. Delete Supabase Storage folder

    await prisma.$transaction(async (tx) => {
      // Step 1: Delete MyJstudyroom items that reference this document's bookshop items
      const myJstudyroomItemIds = document.bookShopItems.flatMap(item => 
        item.myJstudyroomItems.map(mjItem => mjItem.id)
      );

      if (myJstudyroomItemIds.length > 0) {
        await tx.myJstudyroomItem.deleteMany({
          where: {
            id: {
              in: myJstudyroomItemIds
            }
          }
        });

        logger.info('Deleted MyJstudyroom items', {
          documentId,
          deletedItemIds: myJstudyroomItemIds
        });
      }

      // Step 2: Delete BookShop items for this document
      if (document.bookShopItems.length > 0) {
        await tx.bookShopItem.deleteMany({
          where: {
            documentId: documentId
          }
        });

        logger.info('Deleted BookShop items', {
          documentId,
          deletedCount: document.bookShopItems.length
        });
      }

      // Step 3: Delete document pages (if any exist from old system)
      await tx.documentPage.deleteMany({
        where: {
          documentId: documentId
        }
      });

      // Step 4: Delete related records (these should cascade but ensure cleanup)
      await tx.documentShare.deleteMany({
        where: { documentId }
      });

      await tx.shareLink.deleteMany({
        where: { documentId }
      });

      await tx.viewAnalytics.deleteMany({
        where: { documentId }
      });

      await tx.documentAnnotation.deleteMany({
        where: { documentId }
      });

      // Step 5: Delete the document itself
      await tx.document.delete({
        where: {
          id: documentId
        }
      });
    });

    // Step 6: Delete file from Supabase Storage (outside transaction)
    const deleteResult = await deleteFileFromBucket("documents", document.storagePath);

    
    if (!deleteResult.success) {
      logger.error('Failed to delete file from storage (document already deleted from DB)', {
        documentId,
        storagePath: document.storagePath,
        error: deleteResult.error
      });
      // Don't fail the request - document is already deleted from DB
    }

    // Step 7: Update user's storage usage
    await prisma.user.update({
      where: {
        id: document.userId
      },
      data: {
        storageUsed: {
          decrement: document.fileSize
        }
      }
    })

    logger.info('Document deleted successfully with full cascade cleanup', {
      userId: session.user.id,
      documentId,
      myJstudyroomItemsDeleted: document.bookShopItems.flatMap(item => item.myJstudyroomItems).length,
      bookShopItemsDeleted: document.bookShopItems.length
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
