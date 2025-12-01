/**
 * useAnnotationPermissions Hook
 * React hook for checking annotation permissions in UI components
 */
'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import {
  canCreateAnnotation,
  canUpdateAnnotation,
  canDeleteAnnotation,
  canViewPrivateAnnotation,
  getUserPermissions,
  type UserRole,
} from '@/lib/permissions/annotations';

export interface AnnotationPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: (annotationOwnerId: string) => boolean;
  canDelete: (annotationOwnerId: string) => boolean;
  canViewPrivate: (annotationOwnerId: string) => boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  userId: string | null;
}

/**
 * Hook to check annotation permissions for the current user
 */
export function useAnnotationPermissions(): AnnotationPermissions {
  const { data: session, status } = useSession();
  
  const permissions = useMemo(() => {
    const isAuthenticated = status === 'authenticated' && !!session?.user;
    const userRole = (session?.user?.role as UserRole) || null;
    const userId = session?.user?.id || null;
    
    if (!isAuthenticated || !userRole || !userId) {
      return {
        canCreate: false,
        canRead: true, // Can read public annotations
        canUpdate: () => false,
        canDelete: () => false,
        canViewPrivate: () => false,
        isAuthenticated: false,
        userRole: null,
        userId: null,
      };
    }
    
    const rolePermissions = getUserPermissions(userRole);
    
    return {
      canCreate: canCreateAnnotation(userRole),
      canRead: rolePermissions.read,
      canUpdate: (annotationOwnerId: string) =>
        canUpdateAnnotation(userRole, annotationOwnerId, userId),
      canDelete: (annotationOwnerId: string) =>
        canDeleteAnnotation(userRole, annotationOwnerId, userId),
      canViewPrivate: (annotationOwnerId: string) =>
        canViewPrivateAnnotation(userRole, annotationOwnerId, userId),
      isAuthenticated: true,
      userRole,
      userId,
    };
  }, [session, status]);
  
  return permissions;
}

/**
 * Hook to check if current user can perform action on specific annotation
 */
export function useAnnotationAccess(annotation?: {
  id: string;
  userId: string;
  visibility: 'public' | 'private';
}) {
  const permissions = useAnnotationPermissions();
  
  const access = useMemo(() => {
    if (!annotation) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        isOwner: false,
      };
    }
    
    const isOwner = permissions.userId === annotation.userId;
    const canView =
      annotation.visibility === 'public' ||
      (annotation.visibility === 'private' &&
        permissions.canViewPrivate(annotation.userId));
    
    return {
      canView,
      canEdit: isOwner && permissions.canUpdate(annotation.userId),
      canDelete: isOwner && permissions.canDelete(annotation.userId),
      isOwner,
    };
  }, [annotation, permissions]);
  
  return access;
}

/**
 * Hook to check if toolbar should be shown
 */
export function useShowAnnotationToolbar(): boolean {
  const permissions = useAnnotationPermissions();
  return permissions.canCreate;
}
