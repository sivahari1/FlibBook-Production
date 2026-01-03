import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addDocumentToMyJstudyroom } from '@/lib/my-jstudyroom'
import { addToMyJstudyroomSchema } from '@/lib/validation/jstudyroom'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Member access only' }, { status: 403 })
    }

    // Optional but strongly recommended: cleanup stale rows for this user
    // First, find orphaned items
    const orphanedItems = await prisma.myJstudyroomItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        bookShopItem: {
          include: {
            document: true,
          },
        },
      },
    })

    const orphanedItemsToDelete = orphanedItems
      .filter(item => !item.bookShopItem || !item.bookShopItem.document || !item.bookShopItem.isPublished)

    if (orphanedItemsToDelete.length > 0) {
      // Count orphaned items by type to update user counts correctly
      const orphanedFreeCount = orphanedItemsToDelete.filter(item => item.isFree).length
      const orphanedPaidCount = orphanedItemsToDelete.filter(item => !item.isFree).length
      const orphanedIds = orphanedItemsToDelete.map(item => item.id)

      // Delete orphaned items AND update user counts in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete orphaned items
        await tx.myJstudyroomItem.deleteMany({
          where: {
            id: { in: orphanedIds },
          },
        })

        // Update user's document counts to reflect the cleanup
        if (orphanedFreeCount > 0 || orphanedPaidCount > 0) {
          // Get current counts to ensure we don't go negative
          const currentUser = await tx.user.findUnique({
            where: { id: session.user.id },
            select: { freeDocumentCount: true, paidDocumentCount: true },
          })

          if (currentUser) {
            const newFreeCount = Math.max(0, currentUser.freeDocumentCount - orphanedFreeCount)
            const newPaidCount = Math.max(0, currentUser.paidDocumentCount - orphanedPaidCount)

            await tx.user.update({
              where: { id: session.user.id },
              data: {
                freeDocumentCount: newFreeCount,
                paidDocumentCount: newPaidCount,
              },
            })
          }
        }
      })
    }

    const items = await prisma.myJstudyroomItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        bookShopItem: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
                filename: true,
                contentType: true,
                metadata: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })

    // Filter out items with missing bookShopItem or document
    const validItems = items.filter(item => 
      item.bookShopItem && 
      item.bookShopItem.isPublished && 
      item.bookShopItem.document
    )

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeDocumentCount: true, paidDocumentCount: true },
    })

    return NextResponse.json({
      items: validItems.map(item => ({
        id: item.id,
        bookShopItemId: item.bookShopItemId,
        title: item.bookShopItem!.title,
        category: item.bookShopItem!.category,
        isFree: item.isFree,
        addedAt: item.addedAt,
        documentId: item.bookShopItem!.document!.id,
        documentTitle: item.bookShopItem!.document!.title,
        contentType: item.bookShopItem!.document!.contentType,
        metadata: item.bookShopItem!.document!.metadata,
      })),
      counts: {
        free: user?.freeDocumentCount || 0,
        paid: user?.paidDocumentCount || 0,
        total: (user?.freeDocumentCount || 0) + (user?.paidDocumentCount || 0),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch My jstudyroom items' }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Member access only' }, { status: 403 })
    }

    const body = await request.json()

    let validated: { bookShopItemId: string }
    try {
      validated = addToMyJstudyroomSchema.parse(body)
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message || 'Invalid input' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { bookShopItemId } = validated

    // Ensure item exists + published + has document
    const bookShopItem = await prisma.bookShopItem.findUnique({
      where: { id: bookShopItemId },
      select: {
        id: true,
        isFree: true,
        isPublished: true,
        documentId: true,
        document: { select: { id: true } },
      },
    })

    if (!bookShopItem || !bookShopItem.isPublished || !bookShopItem.document) {
      return NextResponse.json({ error: 'This item is not currently available' }, { status: 404 })
    }

    // Prevent duplicates
    const existing = await prisma.myJstudyroomItem.findFirst({
      where: { userId: session.user.id, bookShopItemId },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'This item is already in your Study Room' }, { status: 409 })
    }

    // Use your existing helper (this should also enforce limits if you implemented that there)
    const result = await addDocumentToMyJstudyroom(session.user.id, bookShopItemId, bookShopItem.isFree)

    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to add document' }, { status: 400 })
    }

    // Return updated counts (optional but matches your UI expectations)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeDocumentCount: true, paidDocumentCount: true },
    })

    return NextResponse.json({
      success: true,
      itemId: result.itemId,
      message: 'Document added to My jstudyroom',
      counts: {
        free: user?.freeDocumentCount || 0,
        paid: user?.paidDocumentCount || 0,
        total: (user?.freeDocumentCount || 0) + (user?.paidDocumentCount || 0),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to add document to My jstudyroom' }, { status: 500 })
  }
}
