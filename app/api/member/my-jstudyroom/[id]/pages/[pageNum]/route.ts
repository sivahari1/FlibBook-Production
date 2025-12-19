import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNum: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId, pageNum } = await params;
    const pageNumber = parseInt(pageNum);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

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
                  where: {
                    pageNumber: pageNumber
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
    const page = document.pages[0];

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Generate a better placeholder SVG for member access
    const placeholderSvg = `
      <svg width="595" height="842" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="watermark" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <text x="100" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#e9ecef" opacity="0.3">
              jStudyRoom
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <rect x="50" y="50" width="495" height="742" fill="white" stroke="#dee2e6" stroke-width="2"/>
        <rect x="50" y="50" width="495" height="742" fill="url(#watermark)"/>
        <text x="297.5" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#495057" font-weight="bold">
          ${myJstudyroomItem.bookShopItem.title}
        </text>
        <text x="297.5" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#6c757d">
          Page ${pageNumber}
        </text>
        <text x="297.5" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#adb5bd">
          ${document.title}
        </text>
        <text x="297.5" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#ced4da">
          Member Access - jStudyRoom
        </text>
        <text x="297.5" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#dee2e6">
          ${session.user.email}
        </text>
      </svg>
    `;

    return new NextResponse(placeholderSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error serving member document page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}