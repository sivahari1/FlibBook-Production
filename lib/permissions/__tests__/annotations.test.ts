/**
 * Annotation Permissions Tests
 * Tests for role-based permission checking
 * 
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import {
  hasPermission,
  canCreateAnnotation,
  canReadAnnotations,
  canUpdateAnnotation,
  canDeleteAnnotation,
  canViewPrivateAnnotation,
  getUserPermissions,
  validateAnnotationAccess,
  getPermissionErrorMessage,
  type UserRole,
  type AnnotationOperation,
} from '../annotations';

describe('Annotation Permissions', () => {
  describe('PLATFORM_USER permissions', () => {
    const role: UserRole = 'PLATFORM_USER';
    const userId = 'user-123';

    test('can create annotations', () => {
      expect(canCreateAnnotation(role)).toBe(true);
    });

    test('can read annotations', () => {
      expect(canReadAnnotations(role)).toBe(true);
    });

    test('can update own annotations', () => {
      expect(canUpdateAnnotation(role, userId, userId)).toBe(true);
    });

    test('cannot update other users annotations', () => {
      expect(canUpdateAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('can delete own annotations', () => {
      expect(canDeleteAnnotation(role, userId, userId)).toBe(true);
    });

    test('cannot delete other users annotations', () => {
      expect(canDeleteAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('can view own private annotations', () => {
      expect(canViewPrivateAnnotation(role, userId, userId)).toBe(true);
    });

    test('cannot view other users private annotations', () => {
      expect(canViewPrivateAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('has correct permission matrix', () => {
      const permissions = getUserPermissions(role);
      expect(permissions).toEqual({
        create: true,
        read: true,
        update: true,
        delete: true,
        view_private: true,
      });
    });
  });

  describe('MEMBER permissions', () => {
    const role: UserRole = 'MEMBER';
    const userId = 'member-123';

    test('cannot create annotations', () => {
      expect(canCreateAnnotation(role)).toBe(false);
    });

    test('can read public annotations', () => {
      expect(canReadAnnotations(role)).toBe(true);
    });

    test('cannot update any annotations', () => {
      expect(canUpdateAnnotation(role, userId, userId)).toBe(false);
      expect(canUpdateAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('cannot delete any annotations', () => {
      expect(canDeleteAnnotation(role, userId, userId)).toBe(false);
      expect(canDeleteAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('cannot view private annotations', () => {
      expect(canViewPrivateAnnotation(role, userId, userId)).toBe(false);
      expect(canViewPrivateAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('has correct permission matrix', () => {
      const permissions = getUserPermissions(role);
      expect(permissions).toEqual({
        create: false,
        read: true,
        update: false,
        delete: false,
        view_private: false,
      });
    });
  });

  describe('READER permissions', () => {
    const role: UserRole = 'READER';
    const userId = 'reader-123';

    test('cannot create annotations', () => {
      expect(canCreateAnnotation(role)).toBe(false);
    });

    test('can read public annotations', () => {
      expect(canReadAnnotations(role)).toBe(true);
    });

    test('cannot update any annotations', () => {
      expect(canUpdateAnnotation(role, userId, userId)).toBe(false);
      expect(canUpdateAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('cannot delete any annotations', () => {
      expect(canDeleteAnnotation(role, userId, userId)).toBe(false);
      expect(canDeleteAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('cannot view private annotations', () => {
      expect(canViewPrivateAnnotation(role, userId, userId)).toBe(false);
      expect(canViewPrivateAnnotation(role, 'other-user', userId)).toBe(false);
    });

    test('has correct permission matrix', () => {
      const permissions = getUserPermissions(role);
      expect(permissions).toEqual({
        create: false,
        read: true,
        update: false,
        delete: false,
        view_private: false,
      });
    });
  });

  describe('ADMIN permissions', () => {
    const role: UserRole = 'ADMIN';
    const userId = 'admin-123';

    test('can create annotations', () => {
      expect(canCreateAnnotation(role)).toBe(true);
    });

    test('can read annotations', () => {
      expect(canReadAnnotations(role)).toBe(true);
    });

    test('can update own annotations', () => {
      expect(canUpdateAnnotation(role, userId, userId)).toBe(true);
    });

    test('can update other users annotations', () => {
      expect(canUpdateAnnotation(role, 'other-user', userId)).toBe(true);
    });

    test('can delete own annotations', () => {
      expect(canDeleteAnnotation(role, userId, userId)).toBe(true);
    });

    test('can delete other users annotations', () => {
      expect(canDeleteAnnotation(role, 'other-user', userId)).toBe(true);
    });

    test('can view own private annotations', () => {
      expect(canViewPrivateAnnotation(role, userId, userId)).toBe(true);
    });

    test('can view other users private annotations', () => {
      expect(canViewPrivateAnnotation(role, 'other-user', userId)).toBe(true);
    });

    test('has correct permission matrix', () => {
      const permissions = getUserPermissions(role);
      expect(permissions).toEqual({
        create: true,
        read: true,
        update: true,
        delete: true,
        view_private: true,
      });
    });
  });

  describe('hasPermission', () => {
    test('returns correct permission for valid role and operation', () => {
      expect(hasPermission('PLATFORM_USER', 'create')).toBe(true);
      expect(hasPermission('MEMBER', 'create')).toBe(false);
      expect(hasPermission('READER', 'read')).toBe(true);
      expect(hasPermission('ADMIN', 'delete')).toBe(true);
    });

    test('returns false for invalid role', () => {
      expect(hasPermission('INVALID_ROLE' as UserRole, 'create')).toBe(false);
    });
  });

  describe('validateAnnotationAccess', () => {
    const userId = 'user-123';
    const otherUserId = 'other-user';

    test('public annotations are visible to everyone', () => {
      const annotation = {
        visibility: 'public' as const,
        userId: otherUserId,
      };

      expect(validateAnnotationAccess(annotation)).toBe(true);
      expect(validateAnnotationAccess(annotation, userId, 'MEMBER')).toBe(true);
      expect(validateAnnotationAccess(annotation, userId, 'READER')).toBe(true);
    });

    test('private annotations require authentication', () => {
      const annotation = {
        visibility: 'private' as const,
        userId: otherUserId,
      };

      expect(validateAnnotationAccess(annotation)).toBe(false);
      expect(validateAnnotationAccess(annotation, undefined, 'MEMBER')).toBe(false);
    });

    test('private annotations visible to owner', () => {
      const annotation = {
        visibility: 'private' as const,
        userId,
      };

      expect(validateAnnotationAccess(annotation, userId, 'PLATFORM_USER')).toBe(true);
    });

    test('private annotations not visible to non-owners (MEMBER)', () => {
      const annotation = {
        visibility: 'private' as const,
        userId: otherUserId,
      };

      expect(validateAnnotationAccess(annotation, userId, 'MEMBER')).toBe(false);
    });

    test('private annotations not visible to non-owners (READER)', () => {
      const annotation = {
        visibility: 'private' as const,
        userId: otherUserId,
      };

      expect(validateAnnotationAccess(annotation, userId, 'READER')).toBe(false);
    });

    test('private annotations visible to ADMIN', () => {
      const annotation = {
        visibility: 'private' as const,
        userId: otherUserId,
      };

      expect(validateAnnotationAccess(annotation, userId, 'ADMIN')).toBe(true);
    });
  });

  describe('getPermissionErrorMessage', () => {
    test('returns authentication error when no role provided', () => {
      expect(getPermissionErrorMessage('create')).toBe(
        'Authentication required to perform this action'
      );
    });

    test('returns specific error for create operation', () => {
      expect(getPermissionErrorMessage('create', 'MEMBER')).toBe(
        'Only PLATFORM_USER role can create annotations'
      );
    });

    test('returns specific error for update operation', () => {
      expect(getPermissionErrorMessage('update', 'MEMBER')).toBe(
        'You can only update your own annotations'
      );
    });

    test('returns specific error for delete operation', () => {
      expect(getPermissionErrorMessage('delete', 'READER')).toBe(
        'You can only delete your own annotations'
      );
    });

    test('returns specific error for view_private operation', () => {
      expect(getPermissionErrorMessage('view_private', 'MEMBER')).toBe(
        'You can only view your own private annotations'
      );
    });

    test('returns generic error for unknown operation', () => {
      expect(getPermissionErrorMessage('unknown' as AnnotationOperation, 'MEMBER')).toBe(
        'Insufficient permissions for this action'
      );
    });
  });

  describe('Edge cases', () => {
    test('handles undefined user role gracefully', () => {
      const permissions = getUserPermissions(undefined as any);
      expect(permissions).toEqual({
        create: false,
        read: false,
        update: false,
        delete: false,
        view_private: false,
      });
    });

    test('handles null user IDs in ownership checks', () => {
      expect(canUpdateAnnotation('PLATFORM_USER', '', '')).toBe(true);
      expect(canUpdateAnnotation('PLATFORM_USER', 'user-1', '')).toBe(false);
    });
  });
});
