/**
 * Annotation Permission Utilities
 * Centralized permission checking for annotation operations
 */

export type UserRole = 'PLATFORM_USER' | 'MEMBER' | 'READER' | 'ADMIN';
export type AnnotationOperation = 'create' | 'read' | 'update' | 'delete' | 'view_private';

export interface PermissionMatrix {
  [key: string]: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    view_private: boolean;
  };
}

/**
 * Permission matrix defining what each role can do
 */
export const ANNOTATION_PERMISSIONS: PermissionMatrix = {
  PLATFORM_USER: {
    create: true,
    read: true,
    update: true, // Own annotations only
    delete: true, // Own annotations only
    view_private: true, // Own private annotations only
  },
  MEMBER: {
    create: false,
    read: true, // Public annotations only
    update: false,
    delete: false,
    view_private: false,
  },
  READER: {
    create: false,
    read: true, // Public annotations only
    update: false,
    delete: false,
    view_private: false,
  },
  ADMIN: {
    create: true,
    read: true,
    update: true, // All annotations
    delete: true, // All annotations
    view_private: true, // All private annotations
  },
};

/**
 * Check if a user has permission for a specific operation
 */
export function hasPermission(
  userRole: UserRole,
  operation: AnnotationOperation
): boolean {
  const permissions = ANNOTATION_PERMISSIONS[userRole];
  if (!permissions) return false;
  return permissions[operation] || false;
}

/**
 * Check if user can create annotations
 */
export function canCreateAnnotation(userRole: UserRole): boolean {
  return hasPermission(userRole, 'create');
}

/**
 * Check if user can read annotations
 */
export function canReadAnnotations(userRole: UserRole): boolean {
  return hasPermission(userRole, 'read');
}

/**
 * Check if user can update an annotation
 * Note: This checks role permission, ownership must be checked separately
 */
export function canUpdateAnnotation(
  userRole: UserRole,
  annotationOwnerId: string,
  currentUserId: string
): boolean {
  if (!hasPermission(userRole, 'update')) return false;
  
  // ADMIN can update any annotation
  if (userRole === 'ADMIN') return true;
  
  // Others can only update their own annotations
  return annotationOwnerId === currentUserId;
}

/**
 * Check if user can delete an annotation
 * Note: This checks role permission, ownership must be checked separately
 */
export function canDeleteAnnotation(
  userRole: UserRole,
  annotationOwnerId: string,
  currentUserId: string
): boolean {
  if (!hasPermission(userRole, 'delete')) return false;
  
  // ADMIN can delete any annotation
  if (userRole === 'ADMIN') return true;
  
  // Others can only delete their own annotations
  return annotationOwnerId === currentUserId;
}

/**
 * Check if user can view private annotations
 */
export function canViewPrivateAnnotation(
  userRole: UserRole,
  annotationOwnerId: string,
  currentUserId: string
): boolean {
  if (!hasPermission(userRole, 'view_private')) return false;
  
  // ADMIN can view all private annotations
  if (userRole === 'ADMIN') return true;
  
  // Others can only view their own private annotations
  return annotationOwnerId === currentUserId;
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(userRole: UserRole) {
  return ANNOTATION_PERMISSIONS[userRole] || {
    create: false,
    read: false,
    update: false,
    delete: false,
    view_private: false,
  };
}

/**
 * Check if user has document access
 * This should be used in conjunction with role permissions
 */
export function checkDocumentPermission(
  documentOwnerId: string,
  currentUserId: string,
  isShared: boolean = false
): boolean {
  // Owner always has access
  if (documentOwnerId === currentUserId) return true;
  
  // Shared documents are accessible
  if (isShared) return true;
  
  return false;
}

/**
 * Validate annotation visibility based on user context
 */
export function validateAnnotationAccess(
  annotation: {
    visibility: 'public' | 'private';
    userId: string;
  },
  currentUserId?: string,
  userRole?: UserRole
): boolean {
  // Public annotations are visible to everyone
  if (annotation.visibility === 'public') return true;
  
  // Private annotations require authentication
  if (!currentUserId || !userRole) return false;
  
  // Check if user can view this private annotation
  return canViewPrivateAnnotation(userRole, annotation.userId, currentUserId);
}

/**
 * Get permission error message
 */
export function getPermissionErrorMessage(
  operation: AnnotationOperation,
  userRole?: UserRole
): string {
  if (!userRole) {
    return 'Authentication required to perform this action';
  }
  
  switch (operation) {
    case 'create':
      return 'Only PLATFORM_USER role can create annotations';
    case 'update':
      return 'You can only update your own annotations';
    case 'delete':
      return 'You can only delete your own annotations';
    case 'view_private':
      return 'You can only view your own private annotations';
    default:
      return 'Insufficient permissions for this action';
  }
}
