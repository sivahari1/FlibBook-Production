import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sanitizeString, sanitizeEmail } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareKey: string }> }
) {
  try {
    const { shareKey: shareKeyRaw } = await params;
    const body = await request.json();
    const { viewerEmail: viewerEmailRaw } = body;
    
    // Sanitize inputs
    const shareKey = sanitizeString(shareKeyRaw);
    const viewerEmail = viewerEmailRaw ? sanitizeEmail(viewerEmailRaw) : null;

    // Extract IP address from request headers
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Extract user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find the share link to get the document ID
    const shareLink = await prisma.shareLink.findUnique({
      where: { shareKey },
      select: {
        id: true,
        documentId: true,
        isActive: true,
      },
    });

    if (!shareLink || !shareLink.isActive) {
      return NextResponse.json(
        { error: 'Share link not found or inactive' },
        { status: 404 }
      );
    }

    // Optional: Get geolocation data from IP address
    let country: string | undefined;
    let city: string | undefined;

    // Only attempt geolocation if we have a valid IP and it's not localhost
    if (ipAddress !== 'unknown' && 
        ipAddress !== '127.0.0.1' && 
        ipAddress !== '::1' &&
        !ipAddress.startsWith('192.168.') &&
        !ipAddress.startsWith('10.') &&
        process.env.IP_GEOLOCATION_API_KEY) {
      try {
        // Using ipapi.co as an example (free tier available)
        const geoResponse = await fetch(
          `https://ipapi.co/${ipAddress}/json/`,
          {
            headers: {
              'User-Agent': 'FlipBook-DRM/1.0',
            },
          }
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          country = geoData.country_name;
          city = geoData.city;
        }
      } catch (error) {
        // Silently fail geolocation - it's optional
        console.error('Geolocation lookup failed:', error);
      }
    }

    // Create ViewAnalytics record and increment viewCount in a transaction
    const [viewAnalytics] = await prisma.$transaction([
      prisma.viewAnalytics.create({
        data: {
          documentId: shareLink.documentId,
          shareKey,
          viewerEmail: viewerEmail || null,
          ipAddress,
          userAgent,
          country,
          city,
        },
      }),
      prisma.shareLink.update({
        where: { id: shareLink.id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      }),
    ]);

    logger.info('View analytics recorded', {
      documentId: shareLink.documentId,
      shareKey,
      viewerEmail,
      ipAddress,
      country,
      city
    });

    return NextResponse.json({
      success: true,
      analyticsId: viewAnalytics.id,
    });
  } catch (error) {
    logger.error('Error recording view analytics', error);
    return NextResponse.json(
      { error: 'Failed to record view analytics' },
      { status: 500 }
    );
  }
}
