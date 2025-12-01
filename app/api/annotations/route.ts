/**
 * Annotations API Route
 * Handles listing and creating annotations
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { annotationService } from '@/lib/services/annotations';
import { createAnnotationSchema } from '@/lib/validation/annotations';
import { z } from 'zod';

// GET /api/annotations - List annotations with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const documentId = searchParams.get('documentId');
    const pageNumber = searchParams.get('pageNumber');
    const mediaType = searchParams.get('mediaType');
    const visibility = searchParams.get('visibility');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validate required parameters
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Build filters
    const filters: any = {
      documentId,
      ...(pageNumber && { pageNumber: parseInt(pageNumber) }),
      ...(mediaType && { mediaType }),
      ...(visibility && { visibility }),
      ...(userId && { userId })
    };

    // Get annotations with pagination
    const startTime = Date.now();
    const result = await annotationService.getAnnotations({
      filters,
      pagination: {
        page,
        limit
      },
      sorting: {
        field: sortBy,
        order: sortOrder as 'asc' | 'desc'
      },
      userId: session.user.id
    });

    const duration = Date.now() - startTime;

    // Create response with caching headers for performance
    const response = NextResponse.json({
      annotations: result.annotations,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      },
      _meta: {
        loadTime: duration
      }
    });

    // Add cache headers for better performance
    // Cache for 60 seconds, allow stale while revalidating
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    
    // Add ETag for conditional requests
    const etag = `W/"${documentId}-${pageNumber || 'all'}-${result.annotations.length}"`;
    response.headers.set('ETag', etag);

    // Log performance metrics
    if (duration > 1000) {
      console.error(`Annotation loading exceeded 1s: ${duration}ms`, {
        documentId,
        pageNumber,
        annotationCount: result.annotations.length
      });
    }

    return response;
  } catch (error) {
    console.error('Error fetching annotations:', error);
    
    // Provide more specific error message
    const errorMessage = error instanceof Error 
      ? `Failed to load annotations: ${error.message}`
      : 'Failed to load annotations. Please try again.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/annotations - Create new annotation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has PLATFORM_USER or ADMIN role
    if (session.user.role !== 'PLATFORM_USER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only PLATFORM_USER and ADMIN can create annotations.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = createAnnotationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create annotation
    const annotation = await annotationService.createAnnotation({
      ...data,
      userId: session.user.id
    });

    return NextResponse.json(annotation, { status: 201 });
  } catch (error) {
    console.error('Error creating annotation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid annotation data. Please check your input.',
          details: error.errors
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific business logic errors with clear messages
      if (error.message.includes('Document not found')) {
        return NextResponse.json(
          { error: 'Document not found. It may have been deleted or you don\'t have access to it.' },
          { status: 404 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: 'You don\'t have permission to add annotations to this document.' },
          { status: 403 }
        );
      }
      if (error.message.includes('limit exceeded')) {
        return NextResponse.json(
          { error: 'Maximum number of annotations reached for this page.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create annotation. Please try again.' },
      { status: 500 }
    );
  }
}
