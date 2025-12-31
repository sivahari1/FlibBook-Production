import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/role-check'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { createBookShopItemSchema, bookShopQuerySchema } from '@/lib/validation/jstudyroom'
import { ZodError } from 'zod'
import { ContentType } from '@/lib/types/content'
import type { BookshopWhereClause } from '@/lib/types/api'

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
    } catch (error: unknown) {
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
    const where: Partial<BookshopWhereClause> & { OR?: Array<{ title?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }> } = {}
    
    if (category) {
      where.category = category
    }
    
    // Support content type filtering (Requirements: 11.3, 12.1)
    const contentType = searchParams.get('contentType')
    if (contentType && Object.values(ContentType).includes(contentType as ContentType)) {
      where.contentType = contentType
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

    // Get Book Shop items with multi-content type support (Requirements: 11.3, 12.1)
    const items = await prisma.bookShopItem.findMany({
      where,
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
            linkUrl: true,
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
      contentType,
      search,
      isPublished
    })

    // Convert BigInt to string for JSON serialization
    const itemsResponse = items.map(item => ({
      ...item,
      document: item.document ? {
        ...item.document,
        fileSize: item.document.fileSize.toString()
      } : null
    }))

    return NextResponse.json({
      items: itemsResponse,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: unknown) {
    logger.error('Error fetching Book Shop items', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Book Shop items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/bookshop
 * Create a new Book Shop item with multi-content type support
 * ENSURES proper defaults for visibility
 * Admin only
 * Requirements: 11.3, 11.4, 11.5
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
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        )
      }
      throw error
    }

    const { documentId, title, description, category, isFree, price, isPublished } = validatedData

    // Validate document exists and get its content type (Requirements: 11.3)
    const document = await prisma.document.findUnique({
      where: { id: documentId },
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
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Validate content type is supported (Requirements: 11.3)
    const validContentTypes = Object.values(ContentType)
    if (!validContentTypes.includes(document.contentType as ContentType)) {
      return NextResponse.json(
        { error: `Invalid content type: ${document.contentType}` },
        { status: 400 }
      )
    }

    // Validate price for paid items (Requirements: 11.4)
    if (isFree === false && (!price || price <= 0)) {
      return NextResponse.json(
        { error: 'Price is required for paid items and must be greater than 0' },
        { status: 400 }
      )
    }

    // ENSURE proper defaults for bookshop visibility
    const finalTitle = title || document.title // Fallback to document title
    const finalDescription = description || `${document.contentType} content` // Basic description
    const finalCategory = category || 'General' // Use "General" as default
    const finalIsFree = isFree !== false // Default to true (free) if not specified
    const finalIsPublished = isPublished !== false // Default to true (published) if not specified

    // Create Book Shop item with GUARANTEED proper fields (Requirements: 11.3, 11.4, 11.5)
    const bookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId,
        title: finalTitle,
        description: finalDescription || null,
        category: finalCategory,
        contentType: document.contentType, // From document.contentType
        metadata: document.metadata || {},
        previewUrl: document.thumbnailUrl || null, // May be null - handled in UI
        linkUrl: document.linkUrl || null,
        isFree: finalIsFree,
        price: finalIsFree ? null : price,
        isPublished: finalIsPublished // ALWAYS set to true for visibility
      },
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
        }
      }
    })

    logger.info('Book Shop item created with guaranteed visibility', {
      itemId: bookShopItem.id,
      documentId,
      title: finalTitle,
      category: finalCategory,
      contentType: document.contentType,
      isFree: bookShopItem.isFree,
      isPublished: bookShopItem.isPublished
    })

    // Convert BigInt to string for JSON serialization
    const response = {
      ...bookShopItem,
      document: bookShopItem.document ? {
        ...bookShopItem.document,
        fileSize: bookShopItem.document.fileSize.toString()
      } : null
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error: unknown) {
    logger.error('Error creating Book Shop item', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Book Shop item' },
      { status: 500 }
    )
  }
}
