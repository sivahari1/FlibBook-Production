/**
 * Media Streaming API Route
 * Provides secure, validated access to annotation media files
 * Implements: Requirements 12.5, 12.6, 14.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateMediaAccess, checkRateLimit } from '@/lib/middleware/media-access';
import { generateSecureMediaUrl, logMediaAccess } from '@/lib/security/media-security';

export async function GET(
  request: NextRequest,
  { params }: { params: { annotationId: string } }
) {
  try {
    const { annotationId } = params;

    // Validate media access
    const validation = await validateMediaAccess(request, annotationId);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error || 'Access denied' },
        { status: validation.error === 'Authentication required' ? 401 : 403 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(validation.userId!, 100, 60000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Get annotation media info
    const annotation = validation.annotation;

    // Handle external URLs
    if (annotation.externalUrl) {
      // Log access
      await logMediaAccess(validation.userId!, annotationId, 'view');

      return NextResponse.json({
        mediaUrl: annotation.externalUrl,
        isExternal: true,
        mediaType: annotation.mediaType,
        selectedText: annotation.selectedText
      });
    }

    // Generate secure signed URL for uploaded media
    if (annotation.mediaUrl) {
      // Extract file path from the stored URL
      // The mediaUrl might be a full signed URL, we need the path
      let filePath = annotation.mediaUrl;
      
      // If it's already a signed URL, extract the path
      if (filePath.includes('supabase')) {
        const url = new URL(filePath);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/sign\/document-media\/(.+)\?/);
        if (pathMatch) {
          filePath = pathMatch[1];
        }
      }

      // Generate new signed URL (valid for 1 hour)
      const secureUrl = await generateSecureMediaUrl(filePath, 3600);

      if (!secureUrl) {
        return NextResponse.json(
          { error: 'Failed to generate secure media URL' },
          { status: 500 }
        );
      }

      // Log access
      await logMediaAccess(validation.userId!, annotationId, 'play');

      return NextResponse.json({
        mediaUrl: secureUrl,
        isExternal: false,
        mediaType: annotation.mediaType,
        selectedText: annotation.selectedText,
        expiresIn: 3600 // 1 hour
      });
    }

    return NextResponse.json(
      { error: 'No media URL found for this annotation' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error streaming media:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

