import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getSignedUrl } from '@/lib/storage';

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
      // Return error if page doesn't exist - no more placeholder generation
      return NextResponse.json(
        { error: `Page ${pageNumber} not found. Document may need to be converted.` },
        { status: 404 }
      );
    }

    // Check if pageUrl is a storage path or already a full URL
    let imageUrl = page.pageUrl;
    
    // If it's a storage path (not starting with http), generate signed URL
    if (!imageUrl.startsWith('http')) {
      const signedUrlResult = await getSignedUrl(
        imageUrl,
        3600, // 1 hour expiry
        'document-pages'
      );
      
      if (signedUrlResult.error || !signedUrlResult.url) {
        return NextResponse.json(
          { error: 'Failed to generate page access URL' },
          { status: 500 }
        );
      }
      
      imageUrl = signedUrlResult.url;
    }

    // Redirect to the actual page image
    return NextResponse.redirect(imageUrl);

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