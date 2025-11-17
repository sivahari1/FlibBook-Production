import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/admin/bookshop/[id]
 * Update a Book Shop item
 * Admin only
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

    // Check if Book Shop item exists
    const existingItem = await prisma.bookShopItem.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Book Shop item not found' },
        { status: 404 }
      )
    }

    // If documentId is being changed, validate it exists
    if (documentId && documentId !== existingItem.documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
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

    // Build update data
    const updateData: any = {}
    
    if (documentId !== undefined) updateData.documentId = documentId
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

    // Update Book Shop item
    const bookShopItem = await prisma.bookShopItem.update({
      where: { id },
      data: updateData,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            fileSize: true
          }
        }
      }
    })

    logger.info('Book Shop item updated', {
      itemId: id,
      updates: Object.keys(updateData)
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
 * Delete a Book Shop item
 * Admin only
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

    // Delete the Book Shop item (cascade will handle related records)
    await prisma.bookShopItem.delete({
      where: { id }
    })

    logger.info('Book Shop item deleted', {
      itemId: id,
      title: existingItem.title,
      hadMyJstudyroomItems: existingItem._count.myJstudyroomItems > 0,
      hadPayments: existingItem._count.payments > 0
    })

    return NextResponse.json({
      message: 'Book Shop item deleted successfully',
      deletedItem: {
        id: existingItem.id,
        title: existingItem.title
      }
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
