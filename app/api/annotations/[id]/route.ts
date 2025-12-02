/**
 * Individual Annotation API Route
 * Handles getting, updating, and deleting specific annotations
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { annotationService } from '@/lib/services/annotations';
import { updateAnnotationSchema } from '@/lib/validation/annotations';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/annotations/[id] - Get single annotation
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Annotation ID is required' },
        { status: 400 }
      );
    }

    const annotation = await annotationService.getAnnotationById(
      id,
      session.user.id,
      session.user.role
    );

    if (!annotation) {
      return NextResponse.json(
        { error: 'Annotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(annotation);
  } catch (error) {
    console.error('Error fetching annotation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/annotations/[id] - Update annotation
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Annotation ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = updateAnnotationSchema.safeParse(body);
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

    // Update annotation
    const annotation = await annotationService.updateAnnotation(
      id,
      data,
      session.user.id,
      session.user.role
    );

    if (!annotation) {
      return NextResponse.json(
        { error: 'Annotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(annotation);
  } catch (error) {
    console.error('Error updating annotation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: 'Access denied. You can only update your own annotations.' },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Annotation not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/annotations/[id] - Delete annotation
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Annotation ID is required' },
        { status: 400 }
      );
    }

    // Delete annotation
    const success = await annotationService.deleteAnnotation(
      id,
      session.user.id,
      session.user.role
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Annotation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Annotation deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting annotation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: 'Access denied. You can only delete your own annotations.' },
          { status: 403 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Annotation not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
