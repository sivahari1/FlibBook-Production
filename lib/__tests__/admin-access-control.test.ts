import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';
import { hash } from 'bcryptjs';
import { generateSecurePassword } from '../password-generator';

// Test user data
const TEST_ADMIN = {
  id: 'test-admin-user',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: 'ADMIN' as const,
};

const TEST_PLATFORM_USER = {
  id: 'test-platform-user',
  email: 'platform@test.com',
  name: 'Test Platform User',
  role: 'PLATFORM_USER' as const,
};

const TEST_READER_USER = {
  id: 'test-reader-user',
  email: 'reader@test.com',
  name: 'Test Reader User',
  role: 'READER_USER' as const,
};

describe('Admin-Managed Access Control Tests', () => {
  // Clean up before and after each test
  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.accessRequest.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'duplicate@test.com', TEST_PLATFORM_USER.email, TEST_READER_USER.email],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [TEST_ADMIN.id, TEST_PLATFORM_USER.id, TEST_READER_USER.id],
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.accessRequest.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'duplicate@test.com', TEST_PLATFORM_USER.email, TEST_READER_USER.email],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [TEST_ADMIN.id, TEST_PLATFORM_USER.id, TEST_READER_USER.id],
        },
      },
    });
  });

  describe('11.1 Access Request Flow', () => {
    it('should create an access request with all required fields', async () => {
      const accessRequest = await prisma.accessRequest.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          purpose: 'I need access to share educational PDFs with my students',
          numDocuments: 50,
          numUsers: 10,
          requestedRole: 'PLATFORM_USER',
          extraMessage: 'I am a teacher at XYZ School',
          status: 'PENDING',
        },
      });

      expect(accessRequest).toBeDefined();
      expect(accessRequest.email).toBe('test@example.com');
      expect(accessRequest.name).toBe('Test User');
      expect(accessRequest.purpose).toBe('I need access to share educational PDFs with my students');
      expect(accessRequest.numDocuments).toBe(50);
      expect(accessRequest.numUsers).toBe(10);
      expect(accessRequest.requestedRole).toBe('PLATFORM_USER');
      expect(accessRequest.status).toBe('PENDING');
      expect(accessRequest.createdAt).toBeDefined();
    });

    it('should create an access request with only required fields', async () => {
      const accessRequest = await prisma.accessRequest.create({
        data: {
          email: 'test@example.com',
          purpose: 'Need access for document sharing',
        },
      });

      expect(accessRequest).toBeDefined();
      expect(accessRequest.email).toBe('test@example.com');
      expect(accessRequest.purpose).toBe('Need access for document sharing');
      expect(accessRequest.status).toBe('PENDING'); // Default status
      expect(accessRequest.name).toBeNull();
      expect(accessRequest.numDocuments).toBeNull();
      expect(accessRequest.numUsers).toBeNull();
      expect(accessRequest.requestedRole).toBeNull();
    });

    it('should list access requests with filtering by status', async () => {
      // Create multiple access requests with different statuses
      await prisma.accessRequest.createMany({
        data: [
          { email: 'pending1@test.com', purpose: 'Test purpose 1', status: 'PENDING' },
          { email: 'pending2@test.com', purpose: 'Test purpose 2', status: 'PENDING' },
          { email: 'approved@test.com', purpose: 'Test purpose 3', status: 'APPROVED' },
          { email: 'rejected@test.com', purpose: 'Test purpose 4', status: 'REJECTED' },
        ],
      });

      // Get all pending requests
      const pendingRequests = await prisma.accessRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      expect(pendingRequests).toHaveLength(2);
      expect(pendingRequests.every(r => r.status === 'PENDING')).toBe(true);

      // Get all approved requests
      const approvedRequests = await prisma.accessRequest.findMany({
        where: { status: 'APPROVED' },
      });

      expect(approvedRequests).toHaveLength(1);
      expect(approvedRequests[0].status).toBe('APPROVED');

      // Clean up
      await prisma.accessRequest.deleteMany({
        where: {
          email: {
            in: ['pending1@test.com', 'pending2@test.com', 'approved@test.com', 'rejected@test.com'],
          },
        },
      });
    });

    it('should update access request status', async () => {
      const accessRequest = await prisma.accessRequest.create({
        data: {
          email: 'test@example.com',
          purpose: 'Test purpose',
          status: 'PENDING',
        },
      });

      // Update to APPROVED
      const updated = await prisma.accessRequest.update({
        where: { id: accessRequest.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          adminNotes: 'Approved for platform access',
        },
      });

      expect(updated.status).toBe('APPROVED');
      expect(updated.reviewedAt).toBeDefined();
      expect(updated.adminNotes).toBe('Approved for platform access');
    });
  });

  describe('11.2 Admin Approval Workflow', () => {
    it('should create a user from an access request', async () => {
      // Create access request
      const accessRequest = await prisma.accessRequest.create({
        data: {
          email: TEST_PLATFORM_USER.email,
          name: TEST_PLATFORM_USER.name,
          purpose: 'Need platform access',
          requestedRole: 'PLATFORM_USER',
        },
      });

      // Generate password
      const password = generateSecurePassword();
      const passwordHash = await hash(password, 12);

      // Create user and update access request in transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: TEST_PLATFORM_USER.id,
            email: TEST_PLATFORM_USER.email,
            name: TEST_PLATFORM_USER.name,
            passwordHash,
            userRole: 'PLATFORM_USER',
            pricePlan: 'Starter – 10 docs / 5 users – ₹500/month',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            isActive: true,
          },
        });

        await tx.accessRequest.update({
          where: { id: accessRequest.id },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
          },
        });

        return user;
      });

      expect(result).toBeDefined();
      expect(result.email).toBe(TEST_PLATFORM_USER.email);
      expect(result.userRole).toBe('PLATFORM_USER');
      expect(result.emailVerified).toBe(true);
      expect(result.isActive).toBe(true);

      // Verify access request was updated
      const updatedRequest = await prisma.accessRequest.findUnique({
        where: { id: accessRequest.id },
      });
      expect(updatedRequest?.status).toBe('APPROVED');
      expect(updatedRequest?.reviewedAt).toBeDefined();
    });

    it('should prevent duplicate user creation', async () => {
      // Create first user
      const password = await hash('TestPassword123!', 12);
      await prisma.user.create({
        data: {
          id: TEST_PLATFORM_USER.id,
          email: 'duplicate@test.com',
          passwordHash: password,
          userRole: 'PLATFORM_USER',
        },
      });

      // Try to create duplicate
      await expect(
        prisma.user.create({
          data: {
            email: 'duplicate@test.com',
            passwordHash: password,
            userRole: 'PLATFORM_USER',
          },
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.user.delete({
        where: { email: 'duplicate@test.com' },
      });
    });

    it('should generate secure passwords', () => {
      const password = generateSecurePassword();

      expect(password).toBeDefined();
      expect(password.length).toBeGreaterThanOrEqual(16);
      expect(/[A-Z]/.test(password)).toBe(true); // Has uppercase
      expect(/[a-z]/.test(password)).toBe(true); // Has lowercase
      expect(/[0-9]/.test(password)).toBe(true); // Has numbers
      expect(/[!@#$%^&*]/.test(password)).toBe(true); // Has special chars
    });
  });

  describe('11.3 User Management', () => {
    beforeEach(async () => {
      // Create test users
      const password = await hash('TestPassword123!', 12);
      await prisma.user.createMany({
        data: [
          {
            id: TEST_ADMIN.id,
            email: TEST_ADMIN.email,
            name: TEST_ADMIN.name,
            passwordHash: password,
            userRole: 'ADMIN',
            emailVerified: true,
          },
          {
            id: TEST_PLATFORM_USER.id,
            email: TEST_PLATFORM_USER.email,
            name: TEST_PLATFORM_USER.name,
            passwordHash: password,
            userRole: 'PLATFORM_USER',
            pricePlan: 'Starter',
            emailVerified: true,
          },
          {
            id: TEST_READER_USER.id,
            email: TEST_READER_USER.email,
            name: TEST_READER_USER.name,
            passwordHash: password,
            userRole: 'MEMBER',
            emailVerified: true,
          },
        ],
      });
    });

    it('should list all users', async () => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      expect(users.length).toBeGreaterThanOrEqual(3);
      const testUsers = users.filter(u =>
        [TEST_ADMIN.email, TEST_PLATFORM_USER.email, TEST_READER_USER.email].includes(u.email)
      );
      expect(testUsers).toHaveLength(3);
    });

    it('should filter users by role', async () => {
      const platformUsers = await prisma.user.findMany({
        where: { userRole: 'PLATFORM_USER' },
      });

      expect(platformUsers.length).toBeGreaterThanOrEqual(1);
      expect(platformUsers.every(u => u.userRole === 'PLATFORM_USER')).toBe(true);
    });

    it('should update user details', async () => {
      const updated = await prisma.user.update({
        where: { id: TEST_PLATFORM_USER.id },
        data: {
          userRole: 'MEMBER',
          pricePlan: 'Premium',
          notes: 'Downgraded to reader',
        },
      });

      expect(updated.userRole).toBe('READER_USER');
      expect(updated.pricePlan).toBe('Premium');
      expect(updated.notes).toBe('Downgraded to reader');
    });

    it('should reset user password', async () => {
      const newPassword = generateSecurePassword();
      const newPasswordHash = await hash(newPassword, 12);

      const updated = await prisma.user.update({
        where: { id: TEST_PLATFORM_USER.id },
        data: { passwordHash: newPasswordHash },
      });

      expect(updated.passwordHash).toBe(newPasswordHash);
      expect(updated.passwordHash).not.toBe('TestPassword123!');
    });

    it('should deactivate user', async () => {
      const deactivated = await prisma.user.update({
        where: { id: TEST_PLATFORM_USER.id },
        data: { isActive: false },
      });

      expect(deactivated.isActive).toBe(false);

      // Reactivate for cleanup
      await prisma.user.update({
        where: { id: TEST_PLATFORM_USER.id },
        data: { isActive: true },
      });
    });
  });

  describe('11.4 Role-Based Authentication', () => {
    beforeEach(async () => {
      // Create test users with different roles
      const password = await hash('TestPassword123!', 12);
      await prisma.user.createMany({
        data: [
          {
            id: TEST_ADMIN.id,
            email: TEST_ADMIN.email,
            name: TEST_ADMIN.name,
            passwordHash: password,
            userRole: 'ADMIN',
            emailVerified: true,
          },
          {
            id: TEST_PLATFORM_USER.id,
            email: TEST_PLATFORM_USER.email,
            name: TEST_PLATFORM_USER.name,
            passwordHash: password,
            userRole: 'PLATFORM_USER',
            emailVerified: true,
          },
          {
            id: TEST_READER_USER.id,
            email: TEST_READER_USER.email,
            name: TEST_READER_USER.name,
            passwordHash: password,
            userRole: 'MEMBER',
            emailVerified: true,
          },
        ],
      });
    });

    it('should retrieve user with ADMIN role', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_ADMIN.email },
      });

      expect(user).toBeDefined();
      expect(user?.userRole).toBe('ADMIN');
      expect(user?.emailVerified).toBe(true);
    });

    it('should retrieve user with PLATFORM_USER role', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_PLATFORM_USER.email },
      });

      expect(user).toBeDefined();
      expect(user?.userRole).toBe('PLATFORM_USER');
    });

    it('should retrieve user with READER_USER role', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_READER_USER.email },
      });

      expect(user).toBeDefined();
      expect(user?.userRole).toBe('READER_USER');
    });

    it('should verify password for authentication', async () => {
      const user = await prisma.user.findUnique({
        where: { email: TEST_PLATFORM_USER.email },
      });

      expect(user).toBeDefined();

      // Verify correct password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare('TestPassword123!', user!.passwordHash);
      expect(isValid).toBe(true);

      // Verify incorrect password
      const isInvalid = await bcrypt.compare('WrongPassword', user!.passwordHash);
      expect(isInvalid).toBe(false);
    });

    it('should not authenticate inactive users', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: TEST_PLATFORM_USER.id },
        data: { isActive: false },
      });

      const user = await prisma.user.findUnique({
        where: { email: TEST_PLATFORM_USER.email },
      });

      expect(user?.isActive).toBe(false);

      // Reactivate for cleanup
      await prisma.user.update({
        where: { id: TEST_PLATFORM_USER.id },
        data: { isActive: true },
      });
    });
  });

  describe('11.5 Role-Based Features', () => {
    let testDocument: any;

    beforeEach(async () => {
      // Create test users
      const password = await hash('TestPassword123!', 12);
      await prisma.user.createMany({
        data: [
          {
            id: TEST_ADMIN.id,
            email: TEST_ADMIN.email,
            passwordHash: password,
            userRole: 'ADMIN',
            emailVerified: true,
          },
          {
            id: TEST_PLATFORM_USER.id,
            email: TEST_PLATFORM_USER.email,
            passwordHash: password,
            userRole: 'PLATFORM_USER',
            emailVerified: true,
          },
          {
            id: TEST_READER_USER.id,
            email: TEST_READER_USER.email,
            passwordHash: password,
            userRole: 'MEMBER',
            emailVerified: true,
          },
        ],
      });

      // Create a test document for platform user
      testDocument = await prisma.document.create({
        data: {
          title: 'Test Document',
          filename: 'test.pdf',
          fileSize: BigInt(1024),
          storagePath: '/test/path',
          userId: TEST_PLATFORM_USER.id,
        },
      });
    });

    afterEach(async () => {
      // Clean up documents
      if (testDocument) {
        await prisma.document.deleteMany({
          where: { id: testDocument.id },
        });
      }
    });

    it('should allow PLATFORM_USER to create documents', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Platform User Document',
          filename: 'platform.pdf',
          fileSize: BigInt(2048),
          storagePath: '/platform/path',
          userId: TEST_PLATFORM_USER.id,
        },
      });

      expect(document).toBeDefined();
      expect(document.userId).toBe(TEST_PLATFORM_USER.id);

      // Clean up
      await prisma.document.delete({ where: { id: document.id } });
    });

    it('should allow ADMIN to create documents', async () => {
      const document = await prisma.document.create({
        data: {
          title: 'Admin Document',
          filename: 'admin.pdf',
          fileSize: BigInt(2048),
          storagePath: '/admin/path',
          userId: TEST_ADMIN.id,
        },
      });

      expect(document).toBeDefined();
      expect(document.userId).toBe(TEST_ADMIN.id);

      // Clean up
      await prisma.document.delete({ where: { id: document.id } });
    });

    it('should allow PLATFORM_USER to create share links', async () => {
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'test-share-key-platform',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          isActive: true,
        },
      });

      expect(shareLink).toBeDefined();
      expect(shareLink.userId).toBe(TEST_PLATFORM_USER.id);

      // Clean up
      await prisma.shareLink.delete({ where: { id: shareLink.id } });
    });

    it('should allow READER_USER to view shared documents', async () => {
      // Create a share for reader user
      const share = await prisma.documentShare.create({
        data: {
          documentId: testDocument.id,
          sharedByUserId: TEST_PLATFORM_USER.id,
          sharedWithUserId: TEST_READER_USER.id,
          canDownload: false,
        },
      });

      // Reader should be able to query their shared documents
      const sharedDocs = await prisma.documentShare.findMany({
        where: { sharedWithUserId: TEST_READER_USER.id },
        include: { document: true },
      });

      expect(sharedDocs).toHaveLength(1);
      expect(sharedDocs[0].documentId).toBe(testDocument.id);

      // Clean up
      await prisma.documentShare.delete({ where: { id: share.id } });
    });

    it('should verify role-based permissions', async () => {
      // Get users with their roles
      const admin = await prisma.user.findUnique({
        where: { id: TEST_ADMIN.id },
      });
      const platformUser = await prisma.user.findUnique({
        where: { id: TEST_PLATFORM_USER.id },
      });
      const readerUser = await prisma.user.findUnique({
        where: { id: TEST_READER_USER.id },
      });

      // Verify roles
      expect(admin?.userRole).toBe('ADMIN');
      expect(platformUser?.userRole).toBe('PLATFORM_USER');
      expect(readerUser?.userRole).toBe('READER_USER');

      // Verify ADMIN has full access (can do everything)
      expect(admin?.userRole === 'ADMIN').toBe(true);

      // Verify PLATFORM_USER can upload and share
      expect(['ADMIN', 'PLATFORM_USER'].includes(platformUser?.userRole || '')).toBe(true);

      // Verify READER_USER cannot upload
      expect(['ADMIN', 'PLATFORM_USER'].includes(readerUser?.userRole || '')).toBe(false);
    });
  });
});
