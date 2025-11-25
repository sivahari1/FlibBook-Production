/**
 * Tests for Role-Based Access Control (RBAC) for Admin Privileges
 * Validates admin unlimited upload and sharing capabilities
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.4
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE_PERMISSIONS,
  checkUploadPermission,
  checkSharePermission,
  canManageBookShop,
  canUploadToBookShop,
  canSetBookShopPricing,
  getUploadQuotaRemaining,
  getShareQuotaRemaining,
  hasUnlimitedUploads,
  hasUnlimitedShares,
  getAllowedContentTypes,
  getMaxFileSize,
  type UserRole,
  type RolePermissions,
  type PermissionCheckResult
} from '../admin-privileges';
import { ContentType } from '../../types/content';

describe('RBAC Admin Privileges', () => {
  describe('ROLE_PERMISSIONS Configuration', () => {
    it('should define permissions for all user roles', () => {
      expect(ROLE_PERMISSIONS.ADMIN).toBeDefined();
      expect(ROLE_PERMISSIONS.PLATFORM_USER).toBeDefined();
      expect(ROLE_PERMISSIONS.MEMBER).toBeDefined();
    });

    it('should grant admin unlimited uploads', () => {
      // Requirement 1.1: Admin uploads bypass quota checks
      expect(ROLE_PERMISSIONS.ADMIN.upload.maxDocuments).toBe('unlimited');
    });

    it('should grant admin unlimited shares', () => {
      // Requirement 2.1: Admin shares bypass quota checks
      expect(ROLE_PERMISSIONS.ADMIN.sharing.maxShares).toBe('unlimited');
    });

    it('should allow admin all content types', () => {
      const adminTypes = ROLE_PERMISSIONS.ADMIN.upload.allowedContentTypes;
      expect(adminTypes).toContain(ContentType.PDF);
      expect(adminTypes).toContain(ContentType.IMAGE);
      expect(adminTypes).toContain(ContentType.VIDEO);
      expect(adminTypes).toContain(ContentType.LINK);
      expect(adminTypes).toHaveLength(4);
    });

    it('should limit platform user uploads', () => {
      expect(ROLE_PERMISSIONS.PLATFORM_USER.upload.maxDocuments).toBe(10);
    });

    it('should limit platform user shares', () => {
      expect(ROLE_PERMISSIONS.PLATFORM_USER.sharing.maxShares).toBe(5);
    });

    it('should restrict platform user to PDF only', () => {
      const platformTypes = ROLE_PERMISSIONS.PLATFORM_USER.upload.allowedContentTypes;
      expect(platformTypes).toContain(ContentType.PDF);
      expect(platformTypes).toHaveLength(1);
    });

    it('should restrict member from uploading', () => {
      expect(ROLE_PERMISSIONS.MEMBER.upload.maxDocuments).toBe(0);
      expect(ROLE_PERMISSIONS.MEMBER.upload.allowedContentTypes).toHaveLength(0);
    });

    it('should restrict member from sharing', () => {
      expect(ROLE_PERMISSIONS.MEMBER.sharing.maxShares).toBe(0);
      expect(ROLE_PERMISSIONS.MEMBER.sharing.allowEmailSharing).toBe(false);
      expect(ROLE_PERMISSIONS.MEMBER.sharing.allowLinkSharing).toBe(false);
    });

    it('should grant admin BookShop permissions', () => {
      expect(ROLE_PERMISSIONS.ADMIN.bookshop.canManage).toBe(true);
      expect(ROLE_PERMISSIONS.ADMIN.bookshop.canUpload).toBe(true);
      expect(ROLE_PERMISSIONS.ADMIN.bookshop.canSetPricing).toBe(true);
    });

    it('should deny platform user BookShop permissions', () => {
      expect(ROLE_PERMISSIONS.PLATFORM_USER.bookshop.canManage).toBe(false);
      expect(ROLE_PERMISSIONS.PLATFORM_USER.bookshop.canUpload).toBe(false);
      expect(ROLE_PERMISSIONS.PLATFORM_USER.bookshop.canSetPricing).toBe(false);
    });
  });

  describe('checkUploadPermission', () => {
    describe('Admin Upload Permissions', () => {
      it('should allow admin to upload with any document count', () => {
        // Requirement 1.1: Admin uploads bypass quota checks
        const result = checkUploadPermission('ADMIN', 1000, ContentType.PDF);
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow admin to upload PDF', () => {
        const result = checkUploadPermission('ADMIN', 0, ContentType.PDF);
        expect(result.allowed).toBe(true);
      });

      it('should allow admin to upload IMAGE', () => {
        const result = checkUploadPermission('ADMIN', 0, ContentType.IMAGE);
        expect(result.allowed).toBe(true);
      });

      it('should allow admin to upload VIDEO', () => {
        const result = checkUploadPermission('ADMIN', 0, ContentType.VIDEO);
        expect(result.allowed).toBe(true);
      });

      it('should allow admin to upload LINK', () => {
        const result = checkUploadPermission('ADMIN', 0, ContentType.LINK);
        expect(result.allowed).toBe(true);
      });

      it('should allow admin to upload large files', () => {
        const largeFileSize = 500 * 1024 * 1024; // 500MB
        const result = checkUploadPermission('ADMIN', 0, ContentType.VIDEO, largeFileSize);
        expect(result.allowed).toBe(true);
      });

      it('should allow admin to upload 1GB file', () => {
        const maxFileSize = 1024 * 1024 * 1024; // 1GB
        const result = checkUploadPermission('ADMIN', 0, ContentType.VIDEO, maxFileSize);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Platform User Upload Permissions', () => {
      it('should allow platform user to upload within quota', () => {
        const result = checkUploadPermission('PLATFORM_USER', 5, ContentType.PDF);
        expect(result.allowed).toBe(true);
      });

      it('should deny platform user when quota exceeded', () => {
        const result = checkUploadPermission('PLATFORM_USER', 10, ContentType.PDF);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Document limit reached');
      });

      it('should allow platform user to upload PDF', () => {
        const result = checkUploadPermission('PLATFORM_USER', 0, ContentType.PDF);
        expect(result.allowed).toBe(true);
      });

      it('should deny platform user to upload IMAGE', () => {
        const result = checkUploadPermission('PLATFORM_USER', 0, ContentType.IMAGE);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Content type IMAGE not allowed');
      });

      it('should deny platform user to upload VIDEO', () => {
        const result = checkUploadPermission('PLATFORM_USER', 0, ContentType.VIDEO);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Content type VIDEO not allowed');
      });

      it('should deny platform user to upload LINK', () => {
        const result = checkUploadPermission('PLATFORM_USER', 0, ContentType.LINK);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Content type LINK not allowed');
      });

      it('should deny platform user to upload file exceeding size limit', () => {
        const largeFileSize = 100 * 1024 * 1024; // 100MB (exceeds 50MB limit)
        const result = checkUploadPermission('PLATFORM_USER', 0, ContentType.PDF, largeFileSize);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('File size exceeds maximum');
      });

      it('should allow platform user to upload file within size limit', () => {
        const smallFileSize = 30 * 1024 * 1024; // 30MB (within 50MB limit)
        const result = checkUploadPermission('PLATFORM_USER', 0, ContentType.PDF, smallFileSize);
        expect(result.allowed).toBe(true);
      });
    });

    describe('Member Upload Permissions', () => {
      it('should deny member to upload any content', () => {
        const result = checkUploadPermission('MEMBER', 0, ContentType.PDF);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Document limit reached');
      });

      it('should deny member to upload IMAGE', () => {
        const result = checkUploadPermission('MEMBER', 0, ContentType.IMAGE);
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('checkSharePermission', () => {
    describe('Admin Share Permissions', () => {
      it('should allow admin to create email share with any count', () => {
        // Requirement 2.1: Admin shares bypass quota checks
        const result = checkSharePermission('ADMIN', 1000, 'email');
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow admin to create link share with any count', () => {
        // Requirement 2.1: Admin shares bypass quota checks
        const result = checkSharePermission('ADMIN', 1000, 'link');
        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
      });

      it('should allow admin email sharing', () => {
        const result = checkSharePermission('ADMIN', 0, 'email');
        expect(result.allowed).toBe(true);
      });

      it('should allow admin link sharing', () => {
        const result = checkSharePermission('ADMIN', 0, 'link');
        expect(result.allowed).toBe(true);
      });
    });

    describe('Platform User Share Permissions', () => {
      it('should allow platform user to share within quota', () => {
        const result = checkSharePermission('PLATFORM_USER', 3, 'email');
        expect(result.allowed).toBe(true);
      });

      it('should deny platform user when share quota exceeded', () => {
        const result = checkSharePermission('PLATFORM_USER', 5, 'email');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Share limit reached');
      });

      it('should allow platform user email sharing', () => {
        const result = checkSharePermission('PLATFORM_USER', 0, 'email');
        expect(result.allowed).toBe(true);
      });

      it('should allow platform user link sharing', () => {
        const result = checkSharePermission('PLATFORM_USER', 0, 'link');
        expect(result.allowed).toBe(true);
      });
    });

    describe('Member Share Permissions', () => {
      it('should deny member to create email share', () => {
        const result = checkSharePermission('MEMBER', 0, 'email');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Share limit reached');
      });

      it('should deny member to create link share', () => {
        const result = checkSharePermission('MEMBER', 0, 'link');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Share limit reached');
      });
    });
  });

  describe('BookShop Permission Functions', () => {
    it('should allow admin to manage BookShop', () => {
      expect(canManageBookShop('ADMIN')).toBe(true);
    });

    it('should deny platform user to manage BookShop', () => {
      expect(canManageBookShop('PLATFORM_USER')).toBe(false);
    });

    it('should deny member to manage BookShop', () => {
      expect(canManageBookShop('MEMBER')).toBe(false);
    });

    it('should allow admin to upload to BookShop', () => {
      expect(canUploadToBookShop('ADMIN')).toBe(true);
    });

    it('should deny platform user to upload to BookShop', () => {
      expect(canUploadToBookShop('PLATFORM_USER')).toBe(false);
    });

    it('should allow admin to set BookShop pricing', () => {
      expect(canSetBookShopPricing('ADMIN')).toBe(true);
    });

    it('should deny platform user to set BookShop pricing', () => {
      expect(canSetBookShopPricing('PLATFORM_USER')).toBe(false);
    });
  });

  describe('getUploadQuotaRemaining', () => {
    it('should return unlimited for admin', () => {
      // Requirement 1.2: Admin dashboard displays unlimited
      const quota = getUploadQuotaRemaining('ADMIN', 100);
      expect(quota).toBe('unlimited');
    });

    it('should return unlimited for admin regardless of count', () => {
      // Requirement 1.3: Admin quota counter invariance
      const quota = getUploadQuotaRemaining('ADMIN', 0);
      expect(quota).toBe('unlimited');
    });

    it('should return correct remaining quota for platform user', () => {
      const quota = getUploadQuotaRemaining('PLATFORM_USER', 3);
      expect(quota).toBe(7);
    });

    it('should return 0 when platform user quota exhausted', () => {
      const quota = getUploadQuotaRemaining('PLATFORM_USER', 10);
      expect(quota).toBe(0);
    });

    it('should return 0 for member', () => {
      const quota = getUploadQuotaRemaining('MEMBER', 0);
      expect(quota).toBe(0);
    });
  });

  describe('getShareQuotaRemaining', () => {
    it('should return unlimited for admin', () => {
      // Requirement 2.3: Admin share management displays unlimited
      const quota = getShareQuotaRemaining('ADMIN', 100);
      expect(quota).toBe('unlimited');
    });

    it('should return unlimited for admin regardless of count', () => {
      // Requirement 2.4: Admin share quota counter invariance
      const quota = getShareQuotaRemaining('ADMIN', 0);
      expect(quota).toBe('unlimited');
    });

    it('should return correct remaining quota for platform user', () => {
      const quota = getShareQuotaRemaining('PLATFORM_USER', 2);
      expect(quota).toBe(3);
    });

    it('should return 0 when platform user share quota exhausted', () => {
      const quota = getShareQuotaRemaining('PLATFORM_USER', 5);
      expect(quota).toBe(0);
    });

    it('should return 0 for member', () => {
      const quota = getShareQuotaRemaining('MEMBER', 0);
      expect(quota).toBe(0);
    });
  });

  describe('hasUnlimitedUploads', () => {
    it('should return true for admin', () => {
      // Requirement 1.1: Admin has unlimited uploads
      expect(hasUnlimitedUploads('ADMIN')).toBe(true);
    });

    it('should return false for platform user', () => {
      expect(hasUnlimitedUploads('PLATFORM_USER')).toBe(false);
    });

    it('should return false for member', () => {
      expect(hasUnlimitedUploads('MEMBER')).toBe(false);
    });
  });

  describe('hasUnlimitedShares', () => {
    it('should return true for admin', () => {
      // Requirement 2.1: Admin has unlimited shares
      expect(hasUnlimitedShares('ADMIN')).toBe(true);
    });

    it('should return false for platform user', () => {
      expect(hasUnlimitedShares('PLATFORM_USER')).toBe(false);
    });

    it('should return false for member', () => {
      expect(hasUnlimitedShares('MEMBER')).toBe(false);
    });
  });

  describe('getAllowedContentTypes', () => {
    it('should return all content types for admin', () => {
      const types = getAllowedContentTypes('ADMIN');
      expect(types).toHaveLength(4);
      expect(types).toContain(ContentType.PDF);
      expect(types).toContain(ContentType.IMAGE);
      expect(types).toContain(ContentType.VIDEO);
      expect(types).toContain(ContentType.LINK);
    });

    it('should return only PDF for platform user', () => {
      const types = getAllowedContentTypes('PLATFORM_USER');
      expect(types).toHaveLength(1);
      expect(types).toContain(ContentType.PDF);
    });

    it('should return empty array for member', () => {
      const types = getAllowedContentTypes('MEMBER');
      expect(types).toHaveLength(0);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return 1GB for admin', () => {
      const maxSize = getMaxFileSize('ADMIN');
      expect(maxSize).toBe(1024 * 1024 * 1024);
    });

    it('should return 50MB for platform user', () => {
      const maxSize = getMaxFileSize('PLATFORM_USER');
      expect(maxSize).toBe(50 * 1024 * 1024);
    });

    it('should return 0 for member', () => {
      const maxSize = getMaxFileSize('MEMBER');
      expect(maxSize).toBe(0);
    });
  });
});
