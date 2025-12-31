import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { BookshopWhereClause } from '@/lib/types/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: any = {
      isPublished: true,
      document: { isNot: null }, // IMPORTANT: exclude broken items
    }

    if (category) where.category = category

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const items = await prisma.bookShopItem.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            contentType: true,
            metadata: true,
            thumbnailUrl: true,
            linkUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // One query to compute "inMyJstudyroom" for all items
    let mySet = new Set<string>()
    if (session?.user?.id && items.length > 0) {
      const myRows = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: session.user.id,
          bookShopItemId: { in: items.map(i => i.id) },
        },
        select: { bookShopItemId: true },
      })
      mySet = new Set(myRows.map(r => r.bookShopItemId))
    }

    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      isFree: item.isFree,
      price: item.price,
      contentType: item.contentType,
      previewUrl: item.previewUrl || item.document?.thumbnailUrl || null,
      linkUrl: item.linkUrl || item.document?.linkUrl || null,
      metadata: item.metadata,
      documentId: item.documentId,
      document: item.document,
      createdAt: item.createdAt,
      inMyJstudyroom: session?.user?.id ? mySet.has(item.id) : false,
    }))

    const response = NextResponse.json({ items: transformedItems, total: transformedItems.length })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error: unknown) {
    logger.error('Error fetching bookshop items', error)
    return NextResponse.json({ error: 'Failed to fetch bookshop items' }, { status: 500 })
  }
}
