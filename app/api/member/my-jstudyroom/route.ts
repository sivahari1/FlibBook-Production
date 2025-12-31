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

    const orphanedIds = orphanedItems
      .filter(item => !item.bookShopItem || !item.bookShopItem.document || !item.bookShopItem.isPublished)
      .map(item => item.id)

    if (orphanedIds.length > 0) {
      await prisma.myJstudyroomItem.deleteMany({
        where: {
          id: { in: orphanedIds },
        },
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
