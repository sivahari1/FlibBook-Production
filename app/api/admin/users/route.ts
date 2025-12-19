import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { UserWhereClause } from '@/lib/types/api'

/**
 * GET /api/admin/users
 * List all users with pagination and filtering
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const role = searchParams.get('role') // Filter by role
    const search = searchParams.get('search') // Search by email

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    // Build where clause
    const where: UserWhereClause = {}
    
    if (role && ['ADMIN', 'PLATFORM_USER', 'READER_USER'].includes(role)) {
      where.userRole = role
    }
    
    if (search) {
      where.email = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Get total count
    const total = await prisma.user.count({ where })

    // Get users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        pricePlan: true,
        notes: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    logger.info('Users list retrieved', {
      page,
      limit,
      total,
      role,
      search
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: unknown) {
    logger.error('Error fetching users', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
