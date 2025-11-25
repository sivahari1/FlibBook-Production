import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ContentType } from '@/lib/types/content'

/**
 * PATCH /api/admin/bookshop/[id]
 * Update a Book Shop item with multi-content type support
 * Admin only
 * Requirements: 12.2, 12.4
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    const { id } = params
    const body = await request.json()
    const { documentId, title, description, category, isFree, price, isPublished } = body

    // Check if Book Shop item exists (Requirements: 12.4)
    const existingItem = await prisma.bookShopItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            myJstudyroomItems: true,
            payments: true
          }
        }
      }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Book Shop item not found' },
        { status: 404 }
      )
    }

    // If documentId is being changed, validate it exists and get content type
    let newDocument = null
    if (documentId && documentId !== existingItem.documentId) {
      newDocument = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          contentType: true,
          metadata: true,
          thumbnailUrl: true,
          linkUrl: true
        }
      })

      if (!newDocument) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      // Validate content type is supported
      const validContentTypes = Object.values(ContentType)
      if (!validContentTypes.includes(newDocument.contentType as ContentType)) {
        return NextResponse.json(
          { error: `Invalid content type: ${newDocument.contentType}` },
          { status: 400 }
        )
      }
    }

    // Validate price for paid items
    if (isFree === false && price !== undefined && price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0 for paid items' },
        { status: 400 }
      )
    }

    // Build update data (Requirements: 12.2)
    const updateData: any = {}
    
    if (documentId !== undefined) {
      updateData.documentId = documentId
      // Update content type and metadata if document changed
      if (newDocument) {
        updateData.contentType = newDocument.contentType
        updateData.metadata = newDocument.metadata || {}
        updateData.previewUrl = newDocument.thumbnailUrl || null
        updateData.linkUrl = newDocument.linkUrl || null
      }
    }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (isPublished !== undefined) updateData.isPublished = isPublished
    
    // Handle isFree and price together
    if (isFree !== undefined) {
      updateData.isFree = isFree
      if (isFree === true) {
        updateData.price = null
      } else if (price !== undefined) {
        updateData.price = price
      }
    } else if (price !== undefined && existingItem.isFree === false) {
      updateData.price = price
    }

    // Update Book Shop item (Requirements: 12.4 - preserves existing purchases)
    const bookShopItem = await prisma.bookShopItem.update({
      where: { id },
      data: updateData,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            fileSize: true,
            contentType: true,
            metadata: true,
            thumbnailUrl: true,
            linkUrl: true
          }
        },
        _count: {
          select: {
            myJstudyroomItems: true,
            payments: true
          }
        }
      }
    })

    logger.info('Book Shop item updated with multi-content type', {
      itemId: id,
      updates: Object.keys(updateData),
      contentType: bookShopItem.contentType,
      hasExistingPurchases: existingItem._count.myJstudyroomItems > 0 || existingItem._count.payments > 0
    })

    return NextResponse.json(bookShopItem)
  } catch (error) {
    logger.error('Error updating Book Shop item', {
      itemId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to update Book Shop item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/bookshop/[id]
 * Delete a Book Shop item (soft delete - hides from catalog but preserves purchases)
 * Admin only
 * Requirements: 12.3, 12.4
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    const { id } = params

    // Check if Book Shop item exists
    const existingItem = await prisma.bookShopItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            myJstudyroomItems: true,
            payments: true
          }
        }
      }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Book Shop item not found' },
        { status: 404 }
      )
    }

    const hasPurchases = existingItem._count.myJstudyroomItems > 0 || existingItem._count.payments > 0

    // If item has purchases, soft delete by unpublishing (Requirements: 12.3, 12.4)
    // This removes it from member view but preserves purchase records
    if (hasPurchases) {
      const updatedItem = await prisma.bookShopItem.update({
        where: { id },
        data: {
          isPublished: false
        }
      })

      logger.info('Book Shop item soft deleted (unpublished) to preserve purchases', {
        itemId: id,
        title: existingItem.title,
        contentType: existingItem.contentType,
        myJstudyroomItems: existingItem._count.myJstudyroomItems,
        payments: existingItem._count.payments
      })

      return NextResponse.json({
        message: 'Book Shop item removed from catalog (purchases preserved)',
        deletedItem: {
          id: updatedItem.id,
          title: updatedItem.title,
          isPublished: updatedItem.isPublished
        },
        preservedPurchases: true,
        purchaseCount: existingItem._count.myJstudyroomItems + existingItem._count.payments
      })
    }

    // If no purchases, hard delete (Requirements: 12.3)
    await prisma.bookShopItem.delete({
      where: { id }
    })

    logger.info('Book Shop item hard deleted (no purchases)', {
      itemId: id,
      title: existingItem.title,
      contentType: existingItem.contentType
    })

    return NextResponse.json({
      message: 'Book Shop item deleted successfully',
      deletedItem: {
        id: existingItem.id,
        title: existingItem.title
      },
      preservedPurchases: false
    })
  } catch (error) {
    logger.error('Error deleting Book Shop item', {
      itemId: params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to delete Book Shop item' },
      { status: 500 }
    )
  }
}
