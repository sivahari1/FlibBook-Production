/**
 * Annotation Database Service
 * Handles all database operations for document annotations
 */
import { prisma } from '@/lib/db';
import type { 
  DocumentAnnotation, 
  CreateAnnotationData, 
  UpdateAnnotationData,
  AnnotationFilters 
} from '@/lib/types/annotations';

class AnnotationService {
  private db = prisma;
  /**
   * Create a new annotation
   */
  async createAnnotation(
    data: CreateAnnotationData & { userId: string }
  ): Promise<DocumentAnnotation> {
    const annotation = await this.db.documentAnnotation.create({
      data: {
        ...data,
        visibility: data.visibility || 'public',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return annotation as DocumentAnnotation;
  }

  /**
   * Get annotations with filtering and pagination
   * Optimized for < 1 second response time
   */
  async getAnnotations(options: {
    filters: AnnotationFilters;
    pagination?: { page: number; limit: number };
    sorting?: { field: string; order: 'asc' | 'desc' };
    userId?: string;
  }): Promise<{ annotations: DocumentAnnotation[]; total: number }> {
    const startTime = Date.now();
    const { filters, pagination, sorting, userId } = options;
    const where: Record<string, unknown> = {
      documentId: filters.documentId,
    };

    // Add optional filters
    if (filters.pageNumber !== undefined) {
      where.pageNumber = filters.pageNumber;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.mediaType) {
      where.mediaType = filters.mediaType;
    }

    // Handle visibility filter
    if (filters.visibility !== undefined) {
      where.visibility = filters.visibility;
    } else if (userId) {
      // If no visibility filter specified, show public annotations + user's private ones
      where.OR = [
        { visibility: 'public' },
        { userId: userId, visibility: 'private' },
      ];
    } else {
      // If no user context, only show public annotations
      where.visibility = 'public';
    }

    const orderBy = sorting ? {
      [sorting.field]: sorting.order
    } : { createdAt: 'desc' as const };

    // Optimize: Only fetch count when pagination is needed
    // For single page queries, skip the count query
    const needsCount = pagination && pagination.page > 1;

    const queries: Promise<DocumentAnnotation[] | number>[] = [
      this.db.documentAnnotation.findMany({
        where,
        orderBy,
        ...(pagination && {
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit
        }),
        // Optimize: Select only necessary fields
        select: {
          id: true,
          documentId: true,
          userId: true,
          pageNumber: true,
          selectedText: true,
          mediaType: true,
          mediaUrl: true,
          externalUrl: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    ];

    if (needsCount) {
      queries.push(this.db.documentAnnotation.count({ where }));
    }

    const results = await Promise.all(queries);
    const annotations = results[0] as DocumentAnnotation[];
    const total = needsCount ? results[1] : annotations.length;

    const duration = Date.now() - startTime;
    
    // Log slow queries for monitoring
    if (duration > 500) {
      console.warn(`Slow annotation query: ${duration}ms`, {
        documentId: filters.documentId,
        pageNumber: filters.pageNumber,
        annotationCount: annotations.length
      });
    }

    return { annotations, total };
  }

  /**
   * Get a single annotation by ID
   */
  async getAnnotationById(
    id: string,
    userId?: string,
    userRole?: string
  ): Promise<DocumentAnnotation | null> {
    const annotation = await this.db.documentAnnotation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!annotation) return null;

    // Check visibility permissions
    // ADMIN can view all annotations, others can only view public or their own private
    if (annotation.visibility === 'private' && annotation.userId !== userId && userRole !== 'ADMIN') {
      return null;
    }

    return annotation as DocumentAnnotation;
  }

  /**
   * Update an annotation
   */
  async updateAnnotation(
    id: string,
    data: Partial<CreateAnnotationData>,
    userId: string,
    userRole?: string
  ): Promise<DocumentAnnotation | null> {
    // First check if annotation exists
    const existing = await this.db.documentAnnotation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      throw new Error('Annotation not found');
    }

    // Check permissions: owner or ADMIN can update
    if (existing.userId !== userId && userRole !== 'ADMIN') {
      throw new Error('Access denied');
    }

    const annotation = await this.db.documentAnnotation.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return annotation as DocumentAnnotation;
  }

  /**
   * Delete an annotation
   */
  async deleteAnnotation(id: string, userId: string, userRole?: string): Promise<boolean> {
    // First check if annotation exists
    const existingAnnotation = await this.db.documentAnnotation.findUnique({
      where: { id }
    });

    if (!existingAnnotation) {
      throw new Error('Annotation not found');
    }

    // Check permissions: owner or ADMIN can delete
    if (existingAnnotation.userId !== userId && userRole !== 'ADMIN') {
      throw new Error('Access denied');
    }

    // Delete annotation
    await this.db.documentAnnotation.delete({
      where: { id }
    });

    // TODO: Also delete associated media files from storage
    // if (existingAnnotation.mediaUrl) {
    //   await this.deleteMediaFile(existingAnnotation.mediaUrl);
    // }

    return true;
  }

  /**
   * Get annotation statistics for a document
   */
  async getAnnotationStats(documentId: string, userId?: string) {
    const where: Record<string, unknown> = { documentId };

    if (userId) {
      where.OR = [
        { visibility: 'public' },
        { userId: userId, visibility: 'private' },
      ];
    } else {
      where.visibility = 'public';
    }

    const [total, byType, byPage] = await Promise.all([
      this.db.documentAnnotation.count({ where }),
      this.db.documentAnnotation.groupBy({
        by: ['mediaType'],
        where,
        _count: { mediaType: true },
      }),
      this.db.documentAnnotation.groupBy({
        by: ['pageNumber'],
        where,
        _count: { pageNumber: true },
        orderBy: { pageNumber: 'asc' },
      }),
    ]);

    return {
      total,
      byType: byType.reduce((acc: Record<string, number>, item: { mediaType: string; _count: { mediaType: number } }) => {
        acc[item.mediaType] = item._count.mediaType;
        return acc;
      }, {} as Record<string, number>),
      byPage: byPage.reduce((acc: Record<number, number>, item: { pageNumber: number; _count: { pageNumber: number } }) => {
        acc[item.pageNumber] = item._count.pageNumber;
        return acc;
      }, {} as Record<number, number>),
    };
  }

  /**
   * Check if user can create annotations for a document
   */
  async canUserAnnotate(userId: string, documentId: string): Promise<boolean> {
    // Check if document exists and user has access
    const document = await this.db.document.findUnique({
      where: { id: documentId },
      select: { userId: true },
    });

    if (!document) return false;

    // Check if user is the document owner or has PLATFORM_USER role
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userRole: true, additionalRoles: true },
    });

    if (!user) return false;

    // Allow if user is PLATFORM_USER or document owner
    return (
      user.userRole === 'PLATFORM_USER' ||
      user.additionalRoles.includes('PLATFORM_USER') ||
      document.userId === userId
    );
  }
}

// Export singleton instance
export const annotationService = new AnnotationService();
