import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ContentType } from '@/lib/types/content'

interface TopPerformingItem {
  id: string;
  title: string;
  contentType: string;
  isFree: boolean;
  price: number | null;
  purchases: number;
  revenue: number;
}

/**
 * GET /api/admin/bookshop/analytics
 * Get BookShop analytics with content type breakdown
 * Admin only
 * Requirements: 12.5
 */
export async function GET() {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    // Get all BookShop items with their content types
    const allItems = await prisma.bookShopItem.findMany({
      select: {
        id: true,
        contentType: true,
        isFree: true,
        price: true,
        isPublished: true,
        _count: {
          select: {
            myJstudyroomItems: true,
            payments: true
          }
        }
      }
    })

    // Initialize analytics structure
    const analytics = {
      total: {
        items: allItems.length,
        published: 0,
        draft: 0,
        free: 0,
        paid: 0,
        totalPurchases: 0,
        totalRevenue: 0
      },
      byContentType: {} as Record<string, {
        items: number,
        published: number,
        draft: number,
        free: number,
        paid: number,
        purchases: number,
        revenue: number
      }>
    }

    // Initialize content type stats
    Object.values(ContentType).forEach(type => {
      analytics.byContentType[type] = {
        items: 0,
        published: 0,
        draft: 0,
        free: 0,
        paid: 0,
        purchases: 0,
        revenue: 0
      }
    })

    // Calculate statistics
    allItems.forEach(item => {
      const contentType = item.contentType
      const purchases = item._count.myJstudyroomItems + item._count.payments
      const revenue = item.isFree ? 0 : (item.price || 0) * item._count.payments

      // Update total stats
      if (item.isPublished) {
        analytics.total.published++
      } else {
        analytics.total.draft++
      }

      if (item.isFree) {
        analytics.total.free++
      } else {
        analytics.total.paid++
      }

      analytics.total.totalPurchases += purchases
      analytics.total.totalRevenue += revenue

      // Update content type stats
      if (!analytics.byContentType[contentType]) {
        analytics.byContentType[contentType] = {
          items: 0,
          published: 0,
          draft: 0,
          free: 0,
          paid: 0,
          purchases: 0,
          revenue: 0
        }
      }

      analytics.byContentType[contentType].items++
      
      if (item.isPublished) {
        analytics.byContentType[contentType].published++
      } else {
        analytics.byContentType[contentType].draft++
      }

      if (item.isFree) {
        analytics.byContentType[contentType].free++
      } else {
        analytics.byContentType[contentType].paid++
      }

      analytics.byContentType[contentType].purchases += purchases
      analytics.byContentType[contentType].revenue += revenue
    })

    // Get top performing items by content type
    const topItemsByType: Record<string, TopPerformingItem[]> = {}
    
    for (const type of Object.values(ContentType)) {
      const topItems = await prisma.bookShopItem.findMany({
        where: {
          contentType: type
        },
        select: {
          id: true,
          title: true,
          contentType: true,
          isFree: true,
          price: true,
          _count: {
            select: {
              myJstudyroomItems: true,
              payments: true
            }
          }
        },
        orderBy: [
          {
            myJstudyroomItems: {
              _count: 'desc'
            }
          },
          {
            payments: {
              _count: 'desc'
            }
          }
        ],
        take: 5
      })

      topItemsByType[type] = topItems.map(item => ({
        id: item.id,
        title: item.title,
        contentType: item.contentType,
        isFree: item.isFree,
        price: item.price,
        purchases: item._count.myJstudyroomItems + item._count.payments,
        revenue: item.isFree ? 0 : (item.price || 0) * item._count.payments
      }))
    }

    logger.info('BookShop analytics retrieved with content type breakdown', {
      totalItems: analytics.total.items,
      totalPurchases: analytics.total.totalPurchases,
      totalRevenue: analytics.total.totalRevenue,
      contentTypes: Object.keys(analytics.byContentType)
    })

    return NextResponse.json({
      analytics,
      topItemsByType,
      generatedAt: new Date().toISOString()
    })
  } catch (error: unknown) {
    logger.error('Error fetching BookShop analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to fetch BookShop analytics' },
      { status: 500 }
    )
  }
}
