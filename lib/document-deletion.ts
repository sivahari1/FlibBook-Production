/**
 * Safe server-side document deletion operations
 * Handles complete deletion and bookshop-only removal
 */

import { prisma } from './db'
import { logger } from './logger'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface DeletionResult {
  success: boolean
  error?: string
  statusCode?: number
  deletedItems?: {
    myJstudyroomItems: number
    bookShopItems: number
    documentPages: number
    documents?: number
  }
  storageCleanup?: {
    documentPagesDeleted: number
    documentFileDeleted: boolean
  }
}

/**
 * Complete document deletion - removes everything consistently
 */
export async function deleteDocumentCompletely(documentId: string): Promise<DeletionResult> {
  try {
    // First, verify document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        storagePath: true,
        userId: true,
        fileSize: true,
        bookShopItems: {
          select: { id: true }
        },
        pages: {
          select: { id: true, storagePath: true }
        }
      }
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
        statusCode: 404
      }
    }

    const deletedItems = {
      myJstudyroomItems: 0,
      bookShopItems: 0,
      documentPages: 0,
      documents: 0
    }

    const storageCleanup = {
      documentPagesDeleted: 0,
      documentFileDeleted: false
    }

    // Step 1: Delete my_jstudyroom_items referencing book_shop_items of this document
    const myJstudyroomDeleteResult = await prisma.myJstudyroomItem.deleteMany({
      where: {
        bookShopItem: {
          documentId: documentId
        }
      }
    })
    deletedItems.myJstudyroomItems = myJstudyroomDeleteResult.count

    // Step 2: Delete book_shop_items for this document
    const bookShopDeleteResult = await prisma.bookShopItem.deleteMany({
      where: {
        documentId: documentId
      }
    })
    deletedItems.bookShopItems = bookShopDeleteResult.count

    // Step 3: Delete document_pages and their storage files
    const documentPages = document.pages
    for (const page of documentPages) {
      try {
        // Delete from Supabase Storage
        if (page.storagePath) {
          const { error } = await supabase.storage
            .from('document-pages')
            .remove([page.storagePath])
          
          if (!error) {
            storageCleanup.documentPagesDeleted++
          } else {
            logger.warn(`Failed to delete page storage: ${page.storagePath}`, error)
          }
        }
      } catch (error) {
        logger.warn(`Error deleting page storage: ${page.storagePath}`, error)
      }
    }

    // Delete document_pages records
    const documentPagesDeleteResult = await prisma.documentPage.deleteMany({
      where: {
        documentId: documentId
      }
    })
    deletedItems.documentPages = documentPagesDeleteResult.count

    // Step 4: Delete the Supabase Storage folder for document pages
    try {
      // List all files in the document folder
      const { data: files, error: listError } = await supabase.storage
        .from('document-pages')
        .list(documentId)

      if (!listError && files && files.length > 0) {
        // Delete all files in the folder
        const filePaths = files.map(file => `${documentId}/${file.name}`)
        const { error: deleteError } = await supabase.storage
          .from('document-pages')
          .remove(filePaths)

        if (deleteError) {
          logger.warn(`Failed to delete document pages folder: ${documentId}`, deleteError)
        }
      }
    } catch (error) {
      logger.warn(`Error cleaning up document pages folder: ${documentId}`, error)
    }

    // Step 5: Delete the main document file from storage
    try {
      if (document.storagePath) {
        const { error } = await supabase.storage
          .from('documents')
          .remove([document.storagePath])
        
        if (!error) {
          storageCleanup.documentFileDeleted = true
        } else {
          logger.warn(`Failed to delete document file: ${document.storagePath}`, error)
        }
      }
    } catch (error) {
      logger.warn(`Error deleting document file: ${document.storagePath}`, error)
    }

    // Step 6: Delete the document record (cascades to shareLinks, analytics, etc.)
    const documentDeleteResult = await prisma.document.delete({
      where: { id: documentId }
    })
    deletedItems.documents = 1

    // Step 7: Update user's storage usage
    if (document.fileSize > 0) {
      await prisma.user.update({
        where: { id: document.userId },
        data: {
          storageUsed: {
            decrement: document.fileSize
          }
        }
      })
    }

    logger.info(`Document ${documentId} deleted completely`, {
      deletedItems,
      storageCleanup
    })

    return {
      success: true,
      deletedItems,
      storageCleanup
    }

  } catch (error) {
    logger.error(`Error deleting document ${documentId}`, error)
    return {
      success: false,
      error: 'Failed to delete document completely',
      statusCode: 500
    }
  }
}

/**
 * Remove from bookshop only - keeps document but removes from catalog
 */
export async function removeFromBookshopOnly(documentId: string): Promise<DeletionResult> {
  try {
    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        bookShopItems: {
          select: { id: true }
        }
      }
    })

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
        statusCode: 404
      }
    }

    const deletedItems = {
      myJstudyroomItems: 0,
      bookShopItems: 0,
      documentPages: 0
    }

    // Step 1: Delete my_jstudyroom_items referencing book_shop_items of this document
    const myJstudyroomDeleteResult = await prisma.myJstudyroomItem.deleteMany({
      where: {
        bookShopItem: {
          documentId: documentId
        }
      }
    })
    deletedItems.myJstudyroomItems = myJstudyroomDeleteResult.count

    // Step 2: Delete book_shop_items for this document
    const bookShopDeleteResult = await prisma.bookShopItem.deleteMany({
      where: {
        documentId: documentId
      }
    })
    deletedItems.bookShopItems = bookShopDeleteResult.count

    logger.info(`Document ${documentId} removed from bookshop only`, {
      deletedItems
    })

    return {
      success: true,
      deletedItems
    }

  } catch (error) {
    logger.error(`Error removing document ${documentId} from bookshop`, error)
    return {
      success: false,
      error: 'Failed to remove document from bookshop',
      statusCode: 500
    }
  }
}

/**
 * Clean up orphaned my_jstudyroom_items where bookShopItemId no longer exists
 */
export async function cleanupOrphanedMyJstudyroomItems(): Promise<{
  success: boolean
  deletedCount: number
  error?: string
}> {
  try {
    // Find orphaned items
    const orphanedItems = await prisma.myJstudyroomItem.findMany({
      where: {
        bookShopItem: null
      },
      select: { id: true }
    })

    if (orphanedItems.length === 0) {
      return {
        success: true,
        deletedCount: 0
      }
    }

    // Delete orphaned items
    const deleteResult = await prisma.myJstudyroomItem.deleteMany({
      where: {
        id: {
          in: orphanedItems.map(item => item.id)
        }
      }
    })

    logger.info(`Cleaned up ${deleteResult.count} orphaned my_jstudyroom_items`)

    return {
      success: true,
      deletedCount: deleteResult.count
    }

  } catch (error) {
    logger.error('Error cleaning up orphaned my_jstudyroom_items', error)
    return {
      success: false,
      deletedCount: 0,
      error: 'Failed to cleanup orphaned items'
    }
  }
}