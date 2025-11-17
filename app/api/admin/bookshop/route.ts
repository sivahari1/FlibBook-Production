import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createBookShopItemSchema, bookShopQuerySchema } from '@/lib/validation/jstudyroom'
import { ZodError } from 'zod'

/**
 * GET /api/admin/bookshop
 * List all Book Shop items with pagination and filtering
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    let queryParams;
    try {
      queryParams = bookShopQuerySchema.parse({
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
        category: searchParams.get('category') || undefined,
        search: searchParams.get('search') || undefined,
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        )
      }
      throw error
    }

    const { page = 1, limit = 50, category, search } = queryParams
    const isPublished = searchParams.get('isPublished')

    // Build where clause
    const where: any = {}
    
    if (category) {
      where.category = category
    }
    
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    if (isPublished !== null && isPublished !== undefined) {
      where.isPublished = isPublished === 'true'
    }

    // Get total count
    const total = await prisma.bookShopItem.count({ where })

    // Get Book Shop items
    const items = await prisma.bookShopItem.findMany({
      where,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            filename: true,
            fileSize: true,
            userId: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            myJstudyroomItems: true,
            payments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    logger.info('Book Shop items list retrieved', {
      page,
      limit,
      total,
      category,
      search,
      isPublished
    })

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    logger.error('Error fetching Book Shop items', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to fetch Book Shop items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/bookshop
 * Create a new Book Shop item
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin role
    const authError = await requireAdmin()
    if (authError) return authError

    const body = await request.json()
    
    // Validate input using Zod schema
    let validatedData;
    try {
      validatedData = createBookShopItemSchema.parse(body)
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        )
      }
      throw error
    }

    const { documentId, title, description, category, isFree, price, isPublished } = validatedData

    // Validate document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Validate price for paid items
    if (isFree === false && (!price || price <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for paid items and must be greater than 0' },
        { status: 400 }
      )
    }

    // Create Book Shop item
    const bookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId,
        title,
        description: description || null,
        category,
        isFree: isFree !== false, // Default to true if not specified
        price: isFree === false ? price : null,
        isPublished: isPublished !== false // Default to true if not specified
      },
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

    logger.info('Book Shop item created', {
      itemId: bookShopItem.id,
      documentId,
      title,
      category,
      isFree: bookShopItem.isFree
    })

    return NextResponse.json(bookShopItem, { status: 201 })
  } catch (error) {
    logger.error('Error creating Book Shop item', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Failed to create Book Shop item' },
      { status: 500 }
    )
  }
}
