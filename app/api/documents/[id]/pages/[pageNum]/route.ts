import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: {
    id: string;
    pageNum: string;
  };
}

/**
 * GET /api/documents/[id]/pages/[pageNum]
 * Get a specific page image for a document
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId, pageNum } = params;
    const pageNumber = parseInt(pageNum);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    // Check if user has access to this document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: true,
        bookShopItems: {
          include: {
            myJstudyroomItems: {
              where: {
                userId: session.user.id
              }
            }
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isOwner = document.userId === session.user.id;
    const isAdmin = session.user.userRole === 'ADMIN';
    const hasStudyRoomAccess = document.bookShopItems.some(item => 
      item.myJstudyroomItems.length > 0
    );

    if (!isOwner && !isAdmin && !hasStudyRoomAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the specific page
    const page = await prisma.documentPage.findFirst({
      where: {
        documentId: documentId,
        pageNumber: pageNumber
      }
    });

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Enhanced placeholder with better styling and user info
    const userInfo = isOwner ? 'Document Owner' : 
                    isAdmin ? 'Admin Access' : 
                    'Study Room Access';
    
    const placeholderSvg = `
      <svg width="595" height="842" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#00000020"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bg)"/>
        
        <!-- Paper -->
        <rect x="40" y="40" width="515" height="762" fill="white" stroke="#dee2e6" stroke-width="1" filter="url(#shadow)" rx="4"/>
        
        <!-- Header -->
        <rect x="60" y="60" width="475" height="80" fill="#0066cc" rx="4"/>
        <text x="297.5" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="white" font-weight="bold">
          📄 ${document.title}
        </text>
        <text x="297.5" y="115" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#e3f2fd">
          ${userInfo} • Page ${pageNumber}
        </text>
        
        <!-- Content Area -->
        <rect x="80" y="180" width="435" height="2" fill="#e9ecef"/>
        <rect x="80" y="200" width="380" height="2" fill="#f1f3f4"/>
        <rect x="80" y="220" width="420" height="2" fill="#f1f3f4"/>
        <rect x="80" y="240" width="350" height="2" fill="#f1f3f4"/>
        <rect x="80" y="260" width="400" height="2" fill="#f1f3f4"/>
        
        <rect x="80" y="300" width="435" height="2" fill="#e9ecef"/>
        <rect x="80" y="320" width="360" height="2" fill="#f1f3f4"/>
        <rect x="80" y="340" width="410" height="2" fill="#f1f3f4"/>
        <rect x="80" y="360" width="330" height="2" fill="#f1f3f4"/>
        
        <!-- Status -->
        <circle cx="297.5" cy="450" r="30" fill="#28a745" opacity="0.1"/>
        <text x="297.5" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="24">✓</text>
        <text x="297.5" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#28a745" font-weight="bold">
          Document Ready
        </text>
        <text x="297.5" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
          PDF content available for viewing
        </text>
        
        <!-- Footer -->
        <text x="297.5" y="780" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#adb5bd">
          ${document.filename} • ${Math.round(document.fileSize / 1024)} KB
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
    console.error('Error serving document page:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/documents/[id]/pages/[pageNum]
 * Handle CORS preflight requests
 */
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