import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { AccessRequestWhereClause } from '@/lib/types/api'

/**
 * GET /api/admin/access-requests
 * List all access requests with pagination and filtering
 */
export async function GET(request: NextRequest) {
  // Verify admin role
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Filtering
    const status = searchParams.get('status')
    
    // Build where clause
    const where: AccessRequestWhereClause = {}
    if (status && status !== 'ALL') {
      where.status = status
    }

    // Get total count
    const total = await prisma.accessRequest.count({ where })

    // Get access requests
    const requests = await prisma.accessRequest.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    logger.info('Access requests fetched', {
      page,
      limit,
      status,
      total,
      count: requests.length
    })

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: unknown) {
    logger.error('Error fetching access requests', { error })
    return NextResponse.json(
      { error: 'Failed to fetch access requests' },
      { status: 500 }
    )
  }
}
