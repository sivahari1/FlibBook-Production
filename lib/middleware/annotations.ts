/**
 * Annotation Permission Middleware
 * Handles permission checking for annotation operations
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface AnnotationPermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canViewPrivate: boolean;
}

/**
 * Check user permissions for annotation operations
 */
export async function checkAnnotationPermissions(
  userId?: string,
  documentId?: string,
  annotationId?: string
): Promise<AnnotationPermissions> {
  const permissions: AnnotationPermissions = {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canViewPrivate: false
  };

  // Get user session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // Unauthenticated users can only view public annotations
    permissions.canView = true;
    return permissions;
  }

  const user = session.user;

  // Basic permissions for authenticated users
  permissions.canView = true;
  permissions.canViewPrivate = true; // Can view own private annotations

  // Only PLATFORM_USER can create annotations
  if (user.role === 'PLATFORM_USER') {
    permissions.canCreate = true;
  }

  // Check document access if documentId provided
  if (documentId) {
    const hasDocumentAccess = await checkDocumentAccess(user.id, documentId);
    if (!hasDocumentAccess) {
      // Reset all permissions if no document access
      return {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        canViewPrivate: false
      };
    }
  }

  // Check annotation ownership if annotationId provided
  if (annotationId) {
    const annotation = await prisma.documentAnnotation.findUnique({
      where: { id: annotationId },
      select: { userId: true }
    });

    if (annotation && annotation.userId === user.id) {
      permissions.canUpdate = true;
      permissions.canDelete = true;
    }
  }

  return permissions;
}

/**
 * Check if user has access to a document
 */
export async function checkDocumentAccess(
  userId: string,
  documentId: string
): Promise<boolean> {
  try {
    // Check if document exists and user has access
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { userId: userId }, // Owner
          { 
            shares: {
              some: {
                OR: [
                  { recipientEmail: userId }, // Shared via email
                  { shareKey: { not: null } } // Public share link
                ]
              }
            }
          }
        ]
      }
    });

    return !!document;
  } catch (error) {
    console.error('Error checking document access:', error);
    return false;
  }
}

/**
 * Validate annotation visibility rules
 */
export function validateAnnotationVisibility(
  annotation: any,
  viewerUserId?: string
): boolean {
  // Public annotations are visible to everyone
  if (annotation.visibility === 'public') {
    return true;
  }

  // Private annotations are only visible to the owner
  if (annotation.visibility === 'private') {
    return annotation.userId === viewerUserId;
  }

  return false;
}

/**
 * Filter annotations based on visibility rules
 */
export function filterAnnotationsByVisibility(
  annotations: any[],
  viewerUserId?: string
): any[] {
  return annotations.filter(annotation => 
    validateAnnotationVisibility(annotation, viewerUserId)
  );
}

/**
 * Audit log for annotation operations
 */
export async function logAnnotationOperation(
  operation: 'create' | 'update' | 'delete' | 'view',
  annotationId: string,
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // TODO: Implement audit logging
    console.log('Annotation operation:', {
      operation,
      annotationId,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    });
  } catch (error) {
    console.error('Error logging annotation operation:', error);
  }
}

/**
 * Rate limiting for annotation operations
 */
export async function checkAnnotationRateLimit(
  userId: string,
  operation: 'create' | 'update' | 'delete'
): Promise<boolean> {
  try {
    // TODO: Implement rate limiting logic
    // For now, allow all operations
    return true;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return false;
  }
}
