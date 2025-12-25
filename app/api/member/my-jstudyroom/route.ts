import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { addDocumentToMyJstudyroom } from '@/lib/my-jstudyroom';
import { addToMyJstudyroomSchema } from '@/lib/validation/jstudyroom';
import { ZodError } from 'zod';

/**
 * GET /api/member/my-jstudyroom
 * List all documents in Member's My jstudyroom
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify MEMBER or ADMIN role (admins can test member features)
    if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Member access only' },
        { status: 403 }
      );
    }

    // Fetch My jstudyroom items with related data
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
      orderBy: {
        addedAt: 'desc',
      },
    });

    // Get user's document counts
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        freeDocumentCount: true,
        paidDocumentCount: true,
      },
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        bookShopItemId: item.bookShopItemId,
        title: item.bookShopItem.title,
        category: item.bookShopItem.category,
        isFree: item.isFree,
        addedAt: item.addedAt,
        documentId: item.bookShopItem.document.id,
        documentTitle: item.bookShopItem.document.title,
        contentType: item.bookShopItem.document.contentType,
        metadata: item.bookShopItem.document.metadata,
      })),
      counts: {
        free: user?.freeDocumentCount || 0,
        paid: user?.paidDocumentCount || 0,
        total: (user?.freeDocumentCount || 0) + (user?.paidDocumentCount || 0),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching My jstudyroom items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch My jstudyroom items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/member/my-jstudyroom
 * Add a document to My jstudyroom
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify MEMBER or ADMIN role (admins can test member features)
    if (session.user.userRole !== 'MEMBER' && session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Member access only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    let validatedData;
    try {
      validatedData = addToMyJstudyroomSchema.parse(body);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        );
      }
      throw error;
    }

    const { bookShopItemId } = validatedData;

    // Verify the Book Shop item exists and is published
    const bookShopItem = await prisma.bookShopItem.findUnique({
      where: { id: bookShopItemId },
      select: {
        id: true,
        isFree: true,
        isPublished: true,
      },
    });

    if (!bookShopItem) {
      return NextResponse.json(
        { error: 'Book Shop item not found' },
        { status: 404 }
      );
    }

    if (!bookShopItem.isPublished) {
      return NextResponse.json(
        { error: 'This item is not currently available' },
        { status: 400 }
      );
    }

    // Check if item is already in user's collection
    const existingItem = await prisma.myJstudyroomItem.findFirst({
      where: {
        userId: session.user.id,
        bookShopItemId: bookShopItemId,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'This item is already in your Study Room' },
        { status: 409 }
      );
    }

    // Add document to My jstudyroom
    const result = await addDocumentToMyJstudyroom(
      session.user.id,
      bookShopItemId,
      bookShopItem.isFree
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Get updated collection status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        freeDocumentCount: true,
        paidDocumentCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      itemId: result.itemId,
      message: 'Document added to My jstudyroom',
      counts: {
        free: user?.freeDocumentCount || 0,
        paid: user?.paidDocumentCount || 0,
        total: (user?.freeDocumentCount || 0) + (user?.paidDocumentCount || 0),
      },
    });
  } catch (error: unknown) {
    console.error('Error adding document to My jstudyroom:', error);
    return NextResponse.json(
      { error: 'Failed to add document to My jstudyroom' },
      { status: 500 }
    );
  }
}
