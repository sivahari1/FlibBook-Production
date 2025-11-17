import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';

// Test IDs
const TEST_USER_ID = 'test-share-user-id';
const TEST_DOCUMENT_ID = 'test-share-document-id';
const TEST_SHARE_KEY = 'test-share-key-123';

// Helper function to validate share access (mirrors the logic in the API)
async function validateShareAccess(
  shareKey: string,
  userEmail?: string
): Promise<{ allowed: boolean; reason?: string; share?: any }> {
  const share = await prisma.shareLink.findUnique({
    where: { shareKey },
    include: { document: true },
  });

  if (!share) {
    return { allowed: false, reason: 'Share link not found' };
  }

  if (!share.isActive) {
    return { allowed: false, reason: 'This share link has been revoked' };
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return { allowed: false, reason: 'This share link has expired' };
  }

  // Email restriction check
  if (share.restrictToEmail) {
    if (!userEmail) {
      return {
        allowed: false,
        reason: 'You must be logged in to access this document',
      };
    }

    if (share.restrictToEmail !== userEmail) {
      return {
        allowed: false,
        reason: 'This document was shared with a different email address',
      };
    }
  }

  return { allowed: true, share };
}

describe('Share Access Validation', () => {
  beforeEach(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        email: 'sharer@example.com',
        passwordHash: 'test-hash',
        name: 'Test Sharer',
        userRole: 'PLATFORM_USER',
      },
    });

    // Create test document
    await prisma.document.upsert({
      where: { id: TEST_DOCUMENT_ID },
      update: {},
      create: {
        id: TEST_DOCUMENT_ID,
        title: 'Shared Test Document',
        filename: 'shared-test.pdf',
        fileSize: 2048,
        storagePath: '/test/shared-path',
        userId: TEST_USER_ID,
      },
    });
  });

  afterEach(async () => {
    // Clean up in correct order
    await prisma.shareLink.deleteMany({
      where: { shareKey: TEST_SHARE_KEY },
    });
    await prisma.document.deleteMany({
      where: { id: TEST_DOCUMENT_ID },
    });
    await prisma.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
  });

  describe('Basic share access', () => {
    it('should allow access to unrestricted share link', async () => {
      // Create unrestricted share link
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.share).toBeDefined();
    });

    it('should reject access to non-existent share link', async () => {
      const result = await validateShareAccess('non-existent-key');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Share link not found');
    });

    it('should reject access to revoked share link', async () => {
      // Create revoked share link
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: false,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('This share link has been revoked');
    });

    it('should reject access to expired share link', async () => {
      // Create expired share link
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          expiresAt: yesterday,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('This share link has expired');
    });

    it('should allow access to share link that has not expired yet', async () => {
      // Create share link expiring tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          expiresAt: tomorrow,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Email-restricted share access', () => {
    it('should allow access when email matches restriction', async () => {
      // Create email-restricted share link
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
        },
      });

      const result = await validateShareAccess(
        TEST_SHARE_KEY,
        'member@example.com'
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject access when email does not match restriction', async () => {
      // Create email-restricted share link
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
        },
      });

      const result = await validateShareAccess(
        TEST_SHARE_KEY,
        'different@example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        'This document was shared with a different email address'
      );
    });

    it('should reject access when no email provided for restricted share', async () => {
      // Create email-restricted share link
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You must be logged in to access this document');
    });

    it('should be case-sensitive for email matching', async () => {
      // Create email-restricted share link
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
        },
      });

      const result = await validateShareAccess(
        TEST_SHARE_KEY,
        'Member@Example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        'This document was shared with a different email address'
      );
    });
  });

  describe('Combined restrictions', () => {
    it('should enforce both email restriction and expiration', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
          expiresAt: tomorrow,
        },
      });

      // Correct email, not expired
      const validResult = await validateShareAccess(
        TEST_SHARE_KEY,
        'member@example.com'
      );
      expect(validResult.allowed).toBe(true);

      // Wrong email, not expired
      const wrongEmailResult = await validateShareAccess(
        TEST_SHARE_KEY,
        'wrong@example.com'
      );
      expect(wrongEmailResult.allowed).toBe(false);
      expect(wrongEmailResult.reason).toContain('different email');
    });

    it('should check expiration before email restriction', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
          expiresAt: yesterday,
        },
      });

      const result = await validateShareAccess(
        TEST_SHARE_KEY,
        'member@example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('This share link has expired');
    });

    it('should check active status before other restrictions', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: false,
          restrictToEmail: 'member@example.com',
          expiresAt: tomorrow,
        },
      });

      const result = await validateShareAccess(
        TEST_SHARE_KEY,
        'member@example.com'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('This share link has been revoked');
    });
  });

  describe('Edge cases', () => {
    it('should handle share link with null expiresAt', async () => {
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          expiresAt: null,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(true);
    });

    it('should handle share link with null restrictToEmail', async () => {
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: null,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY, 'any@example.com');

      expect(result.allowed).toBe(true);
    });

    it('should handle empty string email', async () => {
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
          restrictToEmail: 'member@example.com',
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY, '');

      expect(result.allowed).toBe(false);
    });

    it('should include document details in successful validation', async () => {
      await prisma.shareLink.create({
        data: {
          shareKey: TEST_SHARE_KEY,
          documentId: TEST_DOCUMENT_ID,
          userId: TEST_USER_ID,
          isActive: true,
        },
      });

      const result = await validateShareAccess(TEST_SHARE_KEY);

      expect(result.allowed).toBe(true);
      expect(result.share).toBeDefined();
      expect(result.share?.document).toBeDefined();
      expect(result.share?.document.title).toBe('Shared Test Document');
    });
  });
});
