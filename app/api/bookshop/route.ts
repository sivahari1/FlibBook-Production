import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = {
      isPublished: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch published book shop items with document details
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // If user is logged in, check which items they already have in My jstudyroom
    let userItems: Set<string> = new Set();
    if (session?.user?.id) {
      const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          bookShopItemId: true,
        },
      });
      userItems = new Set(myJstudyroomItems.map((item) => item.bookShopItemId));
    }

    // Add inMyJstudyroom flag to each item
    const itemsWithStatus = items.map((item: any) => ({
      ...item,
      inMyJstudyroom: userItems.has(item.id),
    }));

    return NextResponse.json(itemsWithStatus);
  } catch (error) {
    console.error('Error fetching book shop items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch book shop items' },
      { status: 500 }
    );
  }
}
