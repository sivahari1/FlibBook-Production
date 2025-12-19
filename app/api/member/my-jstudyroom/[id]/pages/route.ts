import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Check if user has access to this document through My JStudyRoom
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      where: {
        userId: session.user.id,
        bookShopItem: {
          documentId: documentId
        }
      },
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: {
                  orderBy: {
                    pageNumber: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!myJstudyroomItem?.bookShopItem?.document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    const document = myJstudyroomItem.bookShopItem.document;

    // Check if document has pages
    if (!document.pages || document.pages.length === 0) {
      console.warn(`Document "${document.title}" (${documentId}) has no pages - may need conversion`);
      return NextResponse.json({
        pages: [],
        totalPages: 0,
        documentTitle: document.title,
        status: 'no_pages',
        message: 'This document has not been processed yet. Please contact support.'
      });
    }

    // Return pages with member-specific API endpoints that handle authentication
    const pages = document.pages.map((page) => ({
      id: page.id,
      pageNumber: page.pageNumber,
      pageUrl: `/api/member/my-jstudyroom/${documentId}/pages/${page.pageNumber}`,
      imageUrl: `/api/member/my-jstudyroom/${documentId}/pages/${page.pageNumber}`, // For backward compatibility
    }));

    return NextResponse.json({
      pages: pages,
      totalPages: document.pages.length,
      documentTitle: document.title,
      status: 'success'
    });

  } catch (error) {
    console.error('Error in member pages endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}