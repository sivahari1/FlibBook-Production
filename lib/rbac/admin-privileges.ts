/**
 * Role-Based Access Control (RBAC) for Admin Privileges
 * 
 * Implements unlimited upload and sharing capabilities for admins
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.4
 */

import { ContentType } from '../types/content';

export type UserRole = 'ADMIN' | 'PLATFORM_USER' | 'MEMBER';

/**
 * Role permissions interface defining upload and sharing capabilities
 * Requirements: 1.1, 1.3, 2.1, 2.4
 */
export interface RolePermissions {
  upload: {
    maxDocuments: number | 'unlimited';
    allowedContentTypes: ContentType[];
    maxFileSize: number;
  };
  sharing: {
    maxShares: number | 'unlimited';
    allowEmailSharing: boolean;
    allowLinkSharing: boolean;
  };
  bookshop: {
    canManage: boolean;
    canUpload: boolean;
    canSetPricing: boolean;
  };
}

/**
 * Permission check result interface
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Role-based permissions configuration
 * Admins have unlimited uploads and shares
 * Requirements: 1.1, 1.3, 1.4, 2.1, 2.4
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    upload: {
      maxDocuments: 'unlimited',
      allowedContentTypes: [
        ContentType.PDF,
        ContentType.IMAGE,
        ContentType.VIDEO,
        ContentType.LINK
      ],
      maxFileSize: 1024 * 1024 * 1024 // 1GB
    },
    sharing: {
      maxShares: 'unlimited',
      allowEmailSharing: true,
      allowLinkSharing: true
    },
    bookshop: {
      canManage: true,
      canUpload: true,
      canSetPricing: true
    }
  },
  PLATFORM_USER: {
    upload: {
      maxDocuments: 10,
      allowedContentTypes: [ContentType.PDF],
      maxFileSize: 50 * 1024 * 1024 // 50MB
    },
    sharing: {
      maxShares: 5,
      allowEmailSharing: true,
      allowLinkSharing: true
    },
    bookshop: {
      canManage: false,
      canUpload: false,
      canSetPricing: false
    }
  },
  MEMBER: {
    upload: {
      maxDocuments: 0,
      allowedContentTypes: [],
      maxFileSize: 0
    },
    sharing: {
      maxShares: 0,
      allowEmailSharing: false,
      allowLinkSharing: false
    },
    bookshop: {
      canManage: false,
      canUpload: false,
      canSetPricing: false
    }
  }
};

/**
 * Check if user has permission to upload content
 * Admins bypass all quota checks
 * Requirements: 1.1, 1.4
 * 
 * @param userRole - The role of the user attempting to upload
 * @param currentDocCount - Current number of documents uploaded by user
 * @param contentType - Type of content being uploaded
 * @param fileSize - Size of file being uploaded (optional)
 * @returns Permission check result with allowed status and optional reason
 */
export function checkUploadPermission(
  userRole: UserRole,
  currentDocCount: number,
  contentType: ContentType,
  fileSize?: number
): PermissionCheckResult {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Check document limit (admins have unlimited)
  // Requirement 1.1: Admin uploads bypass quota checks
  if (permissions.upload.maxDocuments !== 'unlimited' &&
      currentDocCount >= permissions.upload.maxDocuments) {
    return { 
      allowed: false, 
      reason: `Document limit reached. Maximum ${permissions.upload.maxDocuments} documents allowed.` 
    };
  }
  
  // Check content type
  if (!permissions.upload.allowedContentTypes.includes(contentType)) {
    return { 
      allowed: false, 
      reason: `Content type ${contentType} not allowed for your role.` 
    };
  }
  
  // Check file size if provided
  if (fileSize !== undefined && fileSize > permissions.upload.maxFileSize) {
    const maxSizeMB = Math.round(permissions.upload.maxFileSize / (1024 * 1024));
    return { 
      allowed: false, 
      reason: `File size exceeds maximum allowed size of ${maxSizeMB}MB.` 
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user has permission to create shares
 * Admins bypass all quota checks
 * Requirements: 2.1, 2.4
 * 
 * @param userRole - The role of the user attempting to share
 * @param currentShareCount - Current number of shares created by user
 * @param shareType - Type of share being created ('email' or 'link')
 * @returns Permission check result with allowed status and optional reason
 */
export function checkSharePermission(
  userRole: UserRole,
  currentShareCount: number,
  shareType: 'email' | 'link'
): PermissionCheckResult {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Check share limit (admins have unlimited)
  // Requirement 2.1: Admin shares bypass quota checks
  if (permissions.sharing.maxShares !== 'unlimited' &&
      currentShareCount >= permissions.sharing.maxShares) {
    return { 
      allowed: false, 
      reason: `Share limit reached. Maximum ${permissions.sharing.maxShares} shares allowed.` 
    };
  }
  
  // Check share type permission
  if (shareType === 'email' && !permissions.sharing.allowEmailSharing) {
    return { 
      allowed: false, 
      reason: 'Email sharing not allowed for your role.' 
    };
  }
  
  if (shareType === 'link' && !permissions.sharing.allowLinkSharing) {
    return { 
      allowed: false, 
      reason: 'Link sharing not allowed for your role.' 
    };
  }
  
  return { allowed: true };
}

/**
 * Check if user has permission to manage BookShop
 * 
 * @param userRole - The role of the user
 * @returns True if user can manage BookShop
 */
export function canManageBookShop(userRole: UserRole): boolean {
  return ROLE_PERMISSIONS[userRole].bookshop.canManage;
}

/**
 * Check if user has permission to upload to BookShop
 * 
 * @param userRole - The role of the user
 * @returns True if user can upload to BookShop
 */
export function canUploadToBookShop(userRole: UserRole): boolean {
  return ROLE_PERMISSIONS[userRole].bookshop.canUpload;
}

/**
 * Check if user has permission to set pricing for BookShop items
 * 
 * @param userRole - The role of the user
 * @returns True if user can set pricing
 */
export function canSetBookShopPricing(userRole: UserRole): boolean {
  return ROLE_PERMISSIONS[userRole].bookshop.canSetPricing;
}

/**
 * Get the quota remaining for a user
 * Admins return 'unlimited'
 * Requirements: 1.2, 1.3
 * 
 * @param userRole - The role of the user
 * @param currentDocCount - Current number of documents uploaded by user
 * @returns Remaining quota or 'unlimited' for admins
 */
export function getUploadQuotaRemaining(
  userRole: UserRole,
  currentDocCount: number
): number | 'unlimited' {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Requirement 1.2: Admin dashboard displays unlimited
  if (permissions.upload.maxDocuments === 'unlimited') {
    return 'unlimited';
  }
  
  const remaining = permissions.upload.maxDocuments - currentDocCount;
  return Math.max(0, remaining);
}

/**
 * Get the share quota remaining for a user
 * Admins return 'unlimited'
 * Requirements: 2.3, 2.4
 * 
 * @param userRole - The role of the user
 * @param currentShareCount - Current number of shares created by user
 * @returns Remaining quota or 'unlimited' for admins
 */
export function getShareQuotaRemaining(
  userRole: UserRole,
  currentShareCount: number
): number | 'unlimited' {
  const permissions = ROLE_PERMISSIONS[userRole];
  
  // Requirement 2.3: Admin share management displays unlimited
  if (permissions.sharing.maxShares === 'unlimited') {
    return 'unlimited';
  }
  
  const remaining = permissions.sharing.maxShares - currentShareCount;
  return Math.max(0, remaining);
}

/**
 * Check if user role has unlimited uploads
 * Requirements: 1.1, 1.3
 * 
 * @param userRole - The role of the user
 * @returns True if user has unlimited uploads
 */
export function hasUnlimitedUploads(userRole: UserRole): boolean {
  return ROLE_PERMISSIONS[userRole].upload.maxDocuments === 'unlimited';
}

/**
 * Check if user role has unlimited shares
 * Requirements: 2.1, 2.4
 * 
 * @param userRole - The role of the user
 * @returns True if user has unlimited shares
 */
export function hasUnlimitedShares(userRole: UserRole): boolean {
  return ROLE_PERMISSIONS[userRole].sharing.maxShares === 'unlimited';
}

/**
 * Get allowed content types for a user role
 * 
 * @param userRole - The role of the user
 * @returns Array of allowed content types
 */
export function getAllowedContentTypes(userRole: UserRole): ContentType[] {
  return ROLE_PERMISSIONS[userRole].upload.allowedContentTypes;
}

/**
 * Get maximum file size for a user role
 * 
 * @param userRole - The role of the user
 * @returns Maximum file size in bytes
 */
export function getMaxFileSize(userRole: UserRole): number {
  return ROLE_PERMISSIONS[userRole].upload.maxFileSize;
}
