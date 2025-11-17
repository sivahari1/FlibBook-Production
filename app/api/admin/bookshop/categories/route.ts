import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/bookshop/categories
 * Get all unique categories from Book Shop items
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    // Get all unique categories
    const items = await prisma.bookShopItem.findMany({
      select: {
        category: true
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc'
      }
    })

    const categories = items.map(item => item.category)

    logger.info('Book Shop categories retrieved', {
      count: categories.length
    })

    return NextResponse.json({ categories })
  } catch (error) {
    logger.error('Error fetching Book Shop categories', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
