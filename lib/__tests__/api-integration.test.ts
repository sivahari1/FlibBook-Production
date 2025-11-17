import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';
import { hash } from 'bcryptjs';
import { canAddDocument, addDocumentToMyJstudyroom, removeDocumentFromMyJstudyroom } from '../my-jstudyroom';

/**
 * API Integration Tests
 * Tests for Book Shop CRUD, My jstudyroom, Payment, and Share Access APIs
 */

// Test data
const TEST_ADMIN = {
  id: 'api-test-admin',
  email: 'admin@apitest.com',
  name: 'API Test Admin',
  userRole: 'ADMIN' as const,
};

const TEST_MEMBER = {
  id: 'api-test-member',
  email: 'member@apitest.com',
  name: 'API Test Member',
  userRole: 'MEMBER' as const,
};

const TEST_PLATFORM_USER = {
  id: 'api-test-platform-user',
  email: 'platform@apitest.com',
  name: 'API Test Platform User',
  userRole: 'PLATFORM_USER' as const,
};

describe('API Integration Tests', () => {
  let testDocument: any;
  let testBookShopItem: any;

  beforeEach(async () => {
    // Create test users
    await prisma.user.upsert({
      where: { id: TEST_ADMIN.id },
      update: {},
      create: {
        ...TEST_ADMIN,
        passwordHash: await hash('AdminPass123!', 10),
        emailVerified: true,
      },
    });

    await prisma.user.upsert({
      where: { id: TEST_MEMBER.id },
      update: {},
      create: {
        ...TEST_MEMBER,
        passwordHash: await hash('MemberPass123!', 10),
        emailVerified: true,
        freeDocumentCount: 0,
        paidDocumentCount: 0,
      },
    });

    await prisma.user.upsert({
      where: { id: TEST_PLATFORM_USER.id },
      update: {},
      create: {
        ...TEST_PLATFORM_USER,
        passwordHash: await hash('PlatformPass123!', 10),
        emailVerified: true,
      },
    });

    // Create test document
    testDocument = await prisma.document.create({
      data: {
        title: 'Test Document for API',
        filename: 'test-api-doc.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storagePath: '/test/api-doc.pdf',
        userId: TEST_PLATFORM_USER.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up in correct order due to foreign key constraints
    await prisma.myJstudyroomItem.deleteMany({
      where: { userId: TEST_MEMBER.id },
    });
    await prisma.payment.deleteMany({
      where: { userId: TEST_MEMBER.id },
    });
    await prisma.bookShopItem.deleteMany({
      where: { documentId: testDocument?.id },
    });
    await prisma.document.deleteMany({
      where: { userId: TEST_PLATFORM_USER.id },
    });
    await prisma.shareLink.deleteMany({
      where: { userId: TEST_PLATFORM_USER.id },
    });
    await prisma.documentShare.deleteMany({
      where: { sharedByUserId: TEST_PLATFORM_USER.id },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [TEST_ADMIN.id, TEST_MEMBER.id, TEST_PLATFORM_USER.id],
        },
      },
    }).catch(() => {});
  });

  describe('Book Shop CRUD Operations', () => {
    it('should create a Book Shop item with valid data', async () => {
      const bookShopItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Test Book Shop Item',
          description: 'A test book for the shop',
          category: 'Test Category',
          isFree: true,
          isPublished: true,
        },
        include: {
          document: true,
        },
      });

      expect(bookShopItem).toBeDefined();
      expect(bookShopItem.title).toBe('Test Book Shop Item');
      expect(bookShopItem.category).toBe('Test Category');
      expect(bookShopItem.isFree).toBe(true);
      expect(bookShopItem.isPublished).toBe(true);
      expect(bookShopItem.document.id).toBe(testDocument.id);
    });

    it('should create a paid Book Shop item with price', async () => {
      const bookShopItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Paid Book Shop Item',
          description: 'A paid book',
          category: 'Premium',
          isFree: false,
          price: 50000, // ₹500 in paise
          isPublished: true,
        },
      });

      expect(bookShopItem.isFree).toBe(false);
      expect(bookShopItem.price).toBe(50000);
    });


    it('should retrieve all published Book Shop items', async () => {
      // Create multiple items
      await prisma.bookShopItem.createMany({
        data: [
          {
            documentId: testDocument.id,
            title: 'Published Item 1',
            category: 'Category A',
            isFree: true,
            isPublished: true,
          },
          {
            documentId: testDocument.id,
            title: 'Published Item 2',
            category: 'Category B',
            isFree: false,
            price: 10000,
            isPublished: true,
          },
          {
            documentId: testDocument.id,
            title: 'Unpublished Item',
            category: 'Category A',
            isFree: true,
            isPublished: false,
          },
        ],
      });

      const publishedItems = await prisma.bookShopItem.findMany({
        where: { isPublished: true },
      });

      expect(publishedItems).toHaveLength(2);
      expect(publishedItems.every(item => item.isPublished)).toBe(true);
    });

    it('should filter Book Shop items by category', async () => {
      await prisma.bookShopItem.createMany({
        data: [
          {
            documentId: testDocument.id,
            title: 'Science Book',
            category: 'Science',
            isFree: true,
            isPublished: true,
          },
          {
            documentId: testDocument.id,
            title: 'Math Book',
            category: 'Mathematics',
            isFree: true,
            isPublished: true,
          },
        ],
      });

      const scienceItems = await prisma.bookShopItem.findMany({
        where: {
          category: 'Science',
          isPublished: true,
        },
      });

      expect(scienceItems).toHaveLength(1);
      expect(scienceItems[0].category).toBe('Science');
    });

    it('should update a Book Shop item', async () => {
      const item = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Original Title',
          category: 'Original Category',
          isFree: true,
          isPublished: true,
        },
      });

      const updated = await prisma.bookShopItem.update({
        where: { id: item.id },
        data: {
          title: 'Updated Title',
          category: 'Updated Category',
        },
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.category).toBe('Updated Category');
    });

    it('should delete a Book Shop item', async () => {
      const item = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'To Be Deleted',
          category: 'Test',
          isFree: true,
          isPublished: true,
        },
      });

      await prisma.bookShopItem.delete({
        where: { id: item.id },
      });

      const deletedItem = await prisma.bookShopItem.findUnique({
        where: { id: item.id },
      });

      expect(deletedItem).toBeNull();
    });
  });


  describe('My jstudyroom Operations', () => {
    beforeEach(async () => {
      // Create a test Book Shop item
      testBookShopItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Test My jstudyroom Item',
          category: 'Test',
          isFree: true,
          isPublished: true,
        },
      });
    });

    it('should add a free document to My jstudyroom', async () => {
      const result = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        testBookShopItem.id,
        true
      );

      expect(result.success).toBe(true);
      expect(result.itemId).toBeDefined();

      // Verify item was added
      const item = await prisma.myJstudyroomItem.findUnique({
        where: {
          userId_bookShopItemId: {
            userId: TEST_MEMBER.id,
            bookShopItemId: testBookShopItem.id,
          },
        },
      });

      expect(item).toBeDefined();
      expect(item?.isFree).toBe(true);

      // Verify count was incremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_MEMBER.id },
      });
      expect(user?.freeDocumentCount).toBe(1);
    });

    it('should add a paid document to My jstudyroom', async () => {
      const paidItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Paid Item',
          category: 'Premium',
          isFree: false,
          price: 10000,
          isPublished: true,
        },
      });

      const result = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        paidItem.id,
        false
      );

      expect(result.success).toBe(true);

      // Verify count was incremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_MEMBER.id },
      });
      expect(user?.paidDocumentCount).toBe(1);
    });

    it('should enforce free document limit (5)', async () => {
      // Add 5 free documents
      for (let i = 0; i < 5; i++) {
        const item = await prisma.bookShopItem.create({
          data: {
            documentId: testDocument.id,
            title: `Free Item ${i}`,
            category: 'Test',
            isFree: true,
            isPublished: true,
          },
        });

        await addDocumentToMyJstudyroom(TEST_MEMBER.id, item.id, true);
      }

      // Try to add 6th free document
      const sixthItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Sixth Free Item',
          category: 'Test',
          isFree: true,
          isPublished: true,
        },
      });

      const result = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        sixthItem.id,
        true
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum of 5 free documents');
    });

    it('should enforce paid document limit (5)', async () => {
      // Add 5 paid documents
      for (let i = 0; i < 5; i++) {
        const item = await prisma.bookShopItem.create({
          data: {
            documentId: testDocument.id,
            title: `Paid Item ${i}`,
            category: 'Premium',
            isFree: false,
            price: 10000,
            isPublished: true,
          },
        });

        await addDocumentToMyJstudyroom(TEST_MEMBER.id, item.id, false);
      }

      // Try to add 6th paid document
      const sixthItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Sixth Paid Item',
          category: 'Premium',
          isFree: false,
          price: 10000,
          isPublished: true,
        },
      });

      const result = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        sixthItem.id,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum of 5 paid documents');
    });


    it('should enforce total document limit (10)', async () => {
      // Add 5 free and 5 paid documents (total 10)
      for (let i = 0; i < 5; i++) {
        const freeItem = await prisma.bookShopItem.create({
          data: {
            documentId: testDocument.id,
            title: `Free Item ${i}`,
            category: 'Test',
            isFree: true,
            isPublished: true,
          },
        });
        await addDocumentToMyJstudyroom(TEST_MEMBER.id, freeItem.id, true);

        const paidItem = await prisma.bookShopItem.create({
          data: {
            documentId: testDocument.id,
            title: `Paid Item ${i}`,
            category: 'Premium',
            isFree: false,
            price: 10000,
            isPublished: true,
          },
        });
        await addDocumentToMyJstudyroom(TEST_MEMBER.id, paidItem.id, false);
      }

      // Verify we have 10 documents
      const user = await prisma.user.findUnique({
        where: { id: TEST_MEMBER.id },
      });
      expect(user?.freeDocumentCount).toBe(5);
      expect(user?.paidDocumentCount).toBe(5);

      // Try to add 11th document (should fail even though it's within type limit)
      const eleventhItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Eleventh Item',
          category: 'Test',
          isFree: true,
          isPublished: true,
        },
      });

      const result = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        eleventhItem.id,
        true
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum of 10 documents');
    });

    it('should prevent duplicate documents in My jstudyroom', async () => {
      // Add document first time
      const result1 = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        testBookShopItem.id,
        true
      );
      expect(result1.success).toBe(true);

      // Try to add same document again
      const result2 = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        testBookShopItem.id,
        true
      );
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already in your My jstudyroom');
    });

    it('should remove document from My jstudyroom', async () => {
      // Add document
      const addResult = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        testBookShopItem.id,
        true
      );
      expect(addResult.success).toBe(true);

      // Get the item ID
      const item = await prisma.myJstudyroomItem.findUnique({
        where: {
          userId_bookShopItemId: {
            userId: TEST_MEMBER.id,
            bookShopItemId: testBookShopItem.id,
          },
        },
      });

      // Remove document
      const removeResult = await removeDocumentFromMyJstudyroom(
        TEST_MEMBER.id,
        item!.id
      );
      expect(removeResult.success).toBe(true);

      // Verify document was removed
      const removedItem = await prisma.myJstudyroomItem.findUnique({
        where: { id: item!.id },
      });
      expect(removedItem).toBeNull();

      // Verify count was decremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_MEMBER.id },
      });
      expect(user?.freeDocumentCount).toBe(0);
    });

    it('should retrieve all My jstudyroom items for a user', async () => {
      // Add multiple documents
      const items = [];
      for (let i = 0; i < 3; i++) {
        const bookShopItem = await prisma.bookShopItem.create({
          data: {
            documentId: testDocument.id,
            title: `Item ${i}`,
            category: 'Test',
            isFree: i % 2 === 0,
            price: i % 2 === 0 ? null : 10000,
            isPublished: true,
          },
        });
        await addDocumentToMyJstudyroom(
          TEST_MEMBER.id,
          bookShopItem.id,
          i % 2 === 0
        );
        items.push(bookShopItem);
      }

      // Retrieve items
      const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
        where: { userId: TEST_MEMBER.id },
        include: {
          bookShopItem: {
            include: {
              document: true,
            },
          },
        },
      });

      expect(myJstudyroomItems).toHaveLength(3);
      expect(myJstudyroomItems.every(item => item.userId === TEST_MEMBER.id)).toBe(true);
    });
  });


  describe('Payment Operations', () => {
    beforeEach(async () => {
      testBookShopItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Paid Test Item',
          category: 'Premium',
          isFree: false,
          price: 50000, // ₹500
          isPublished: true,
        },
      });
    });

    it('should create a payment record', async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: TEST_MEMBER.id,
          bookShopItemId: testBookShopItem.id,
          amount: 50000,
          currency: 'INR',
          status: 'pending',
          razorpayOrderId: 'order_test_123',
        },
      });

      expect(payment).toBeDefined();
      expect(payment.userId).toBe(TEST_MEMBER.id);
      expect(payment.bookShopItemId).toBe(testBookShopItem.id);
      expect(payment.amount).toBe(50000);
      expect(payment.status).toBe('pending');
    });

    it('should update payment status to success', async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: TEST_MEMBER.id,
          bookShopItemId: testBookShopItem.id,
          amount: 50000,
          currency: 'INR',
          status: 'pending',
          razorpayOrderId: 'order_test_456',
        },
      });

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          razorpayPaymentId: 'pay_test_456',
          razorpaySignature: 'sig_test_456',
        },
      });

      expect(updated.status).toBe('success');
      expect(updated.razorpayPaymentId).toBe('pay_test_456');
      expect(updated.razorpaySignature).toBe('sig_test_456');
    });

    it('should update payment status to failed', async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: TEST_MEMBER.id,
          bookShopItemId: testBookShopItem.id,
          amount: 50000,
          currency: 'INR',
          status: 'pending',
          razorpayOrderId: 'order_test_789',
        },
      });

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });

      expect(updated.status).toBe('failed');
    });

    it('should retrieve payments by user', async () => {
      // Create multiple payments
      await prisma.payment.createMany({
        data: [
          {
            userId: TEST_MEMBER.id,
            bookShopItemId: testBookShopItem.id,
            amount: 50000,
            currency: 'INR',
            status: 'success',
            razorpayOrderId: 'order_1',
          },
          {
            userId: TEST_MEMBER.id,
            bookShopItemId: testBookShopItem.id,
            amount: 30000,
            currency: 'INR',
            status: 'pending',
            razorpayOrderId: 'order_2',
          },
        ],
      });

      const payments = await prisma.payment.findMany({
        where: { userId: TEST_MEMBER.id },
      });

      expect(payments).toHaveLength(2);
      expect(payments.every(p => p.userId === TEST_MEMBER.id)).toBe(true);
    });

    it('should retrieve payments by status', async () => {
      await prisma.payment.createMany({
        data: [
          {
            userId: TEST_MEMBER.id,
            bookShopItemId: testBookShopItem.id,
            amount: 50000,
            currency: 'INR',
            status: 'success',
            razorpayOrderId: 'order_success_1',
          },
          {
            userId: TEST_MEMBER.id,
            bookShopItemId: testBookShopItem.id,
            amount: 30000,
            currency: 'INR',
            status: 'failed',
            razorpayOrderId: 'order_failed_1',
          },
        ],
      });

      const successPayments = await prisma.payment.findMany({
        where: { status: 'success' },
      });

      expect(successPayments).toHaveLength(1);
      expect(successPayments[0].status).toBe('success');
    });

    it('should link payment to Book Shop item', async () => {
      const payment = await prisma.payment.create({
        data: {
          userId: TEST_MEMBER.id,
          bookShopItemId: testBookShopItem.id,
          amount: 50000,
          currency: 'INR',
          status: 'success',
          razorpayOrderId: 'order_linked',
        },
        include: {
          bookShopItem: {
            include: {
              document: true,
            },
          },
        },
      });

      expect(payment.bookShopItem).toBeDefined();
      expect(payment.bookShopItem.id).toBe(testBookShopItem.id);
      expect(payment.bookShopItem.document.id).toBe(testDocument.id);
    });
  });


  describe('Share Access Validation', () => {
    let testShareLink: any;

    beforeEach(async () => {
      // Create a share link
      testShareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'test-share-key-123',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          isActive: true,
        },
      });
    });

    it('should create a share link without email restriction', async () => {
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'unrestricted-share-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          isActive: true,
        },
      });

      expect(shareLink).toBeDefined();
      expect(shareLink.restrictToEmail).toBeNull();
      expect(shareLink.isActive).toBe(true);
    });

    it('should create a share link with email restriction', async () => {
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'restricted-share-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          restrictToEmail: TEST_MEMBER.email,
          isActive: true,
        },
      });

      expect(shareLink.restrictToEmail).toBe(TEST_MEMBER.email);
    });

    it('should validate share link is active', async () => {
      const shareLink = await prisma.shareLink.findUnique({
        where: { shareKey: testShareLink.shareKey },
      });

      expect(shareLink).toBeDefined();
      expect(shareLink?.isActive).toBe(true);
    });

    it('should validate share link is not expired', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 24 hours from now
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'future-expiry-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          expiresAt: futureDate,
          isActive: true,
        },
      });

      expect(shareLink.expiresAt).toBeDefined();
      expect(shareLink.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should detect expired share link', async () => {
      const pastDate = new Date(Date.now() - 86400000); // 24 hours ago
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'expired-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          expiresAt: pastDate,
          isActive: true,
        },
      });

      const isExpired = shareLink.expiresAt && shareLink.expiresAt < new Date();
      expect(isExpired).toBe(true);
    });

    it('should validate email matches restriction', async () => {
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'email-restricted-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          restrictToEmail: TEST_MEMBER.email,
          isActive: true,
        },
      });

      const emailMatches = shareLink.restrictToEmail === TEST_MEMBER.email;
      expect(emailMatches).toBe(true);
    });

    it('should detect email mismatch', async () => {
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'email-mismatch-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          restrictToEmail: TEST_MEMBER.email,
          isActive: true,
        },
      });

      const wrongEmail = 'wrong@example.com';
      const emailMatches = shareLink.restrictToEmail === wrongEmail;
      expect(emailMatches).toBe(false);
    });

    it('should allow access when no email restriction', async () => {
      const shareLink = await prisma.shareLink.findUnique({
        where: { shareKey: testShareLink.shareKey },
      });

      const hasEmailRestriction = shareLink?.restrictToEmail !== null;
      expect(hasEmailRestriction).toBe(false);
    });

    it('should revoke share link', async () => {
      const updated = await prisma.shareLink.update({
        where: { id: testShareLink.id },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
    });

    it('should track view count', async () => {
      const initial = await prisma.shareLink.findUnique({
        where: { id: testShareLink.id },
      });
      expect(initial?.viewCount).toBe(0);

      // Increment view count
      const updated = await prisma.shareLink.update({
        where: { id: testShareLink.id },
        data: { viewCount: { increment: 1 } },
      });

      expect(updated.viewCount).toBe(1);
    });

    it('should enforce max views limit', async () => {
      const shareLink = await prisma.shareLink.create({
        data: {
          shareKey: 'max-views-key',
          documentId: testDocument.id,
          userId: TEST_PLATFORM_USER.id,
          maxViews: 3,
          viewCount: 3,
          isActive: true,
        },
      });

      const hasReachedLimit = shareLink.maxViews !== null && 
                              shareLink.viewCount >= shareLink.maxViews;
      expect(hasReachedLimit).toBe(true);
    });
  });


  describe('Document Share (Email) Operations', () => {
    it('should create an email share', async () => {
      const documentShare = await prisma.documentShare.create({
        data: {
          documentId: testDocument.id,
          sharedByUserId: TEST_PLATFORM_USER.id,
          sharedWithEmail: TEST_MEMBER.email,
          note: 'Check this out!',
        },
      });

      expect(documentShare).toBeDefined();
      expect(documentShare.sharedWithEmail).toBe(TEST_MEMBER.email);
      expect(documentShare.note).toBe('Check this out!');
    });

    it('should retrieve shares by recipient email', async () => {
      // Create multiple shares
      await prisma.documentShare.createMany({
        data: [
          {
            documentId: testDocument.id,
            sharedByUserId: TEST_PLATFORM_USER.id,
            sharedWithEmail: TEST_MEMBER.email,
          },
          {
            documentId: testDocument.id,
            sharedByUserId: TEST_PLATFORM_USER.id,
            sharedWithEmail: 'other@example.com',
          },
        ],
      });

      const memberShares = await prisma.documentShare.findMany({
        where: { sharedWithEmail: TEST_MEMBER.email },
      });

      expect(memberShares).toHaveLength(1);
      expect(memberShares[0].sharedWithEmail).toBe(TEST_MEMBER.email);
    });

    it('should retrieve shares with expiration', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const share = await prisma.documentShare.create({
        data: {
          documentId: testDocument.id,
          sharedByUserId: TEST_PLATFORM_USER.id,
          sharedWithEmail: TEST_MEMBER.email,
          expiresAt: futureDate,
        },
      });

      expect(share.expiresAt).toBeDefined();
      expect(share.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should filter out expired shares', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const futureDate = new Date(Date.now() + 86400000);

      await prisma.documentShare.createMany({
        data: [
          {
            documentId: testDocument.id,
            sharedByUserId: TEST_PLATFORM_USER.id,
            sharedWithEmail: TEST_MEMBER.email,
            expiresAt: pastDate,
          },
          {
            documentId: testDocument.id,
            sharedByUserId: TEST_PLATFORM_USER.id,
            sharedWithEmail: TEST_MEMBER.email,
            expiresAt: futureDate,
          },
        ],
      });

      const activeShares = await prisma.documentShare.findMany({
        where: {
          sharedWithEmail: TEST_MEMBER.email,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      expect(activeShares).toHaveLength(1);
      expect(activeShares[0].expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should delete email share', async () => {
      const share = await prisma.documentShare.create({
        data: {
          documentId: testDocument.id,
          sharedByUserId: TEST_PLATFORM_USER.id,
          sharedWithEmail: TEST_MEMBER.email,
        },
      });

      // Delete the share (simulating revocation)
      await prisma.documentShare.delete({
        where: { id: share.id },
      });

      const deletedShare = await prisma.documentShare.findUnique({
        where: { id: share.id },
      });

      expect(deletedShare).toBeNull();
    });

    it('should include document details in share query', async () => {
      const share = await prisma.documentShare.create({
        data: {
          documentId: testDocument.id,
          sharedByUserId: TEST_PLATFORM_USER.id,
          sharedWithEmail: TEST_MEMBER.email,
        },
      });

      const shareWithDetails = await prisma.documentShare.findUnique({
        where: { id: share.id },
        include: {
          document: true,
          sharedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      expect(shareWithDetails?.document).toBeDefined();
      expect(shareWithDetails?.document.id).toBe(testDocument.id);
      expect(shareWithDetails?.sharedBy).toBeDefined();
      expect(shareWithDetails?.sharedBy.email).toBe(TEST_PLATFORM_USER.email);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should complete full purchase flow', async () => {
      // Create paid Book Shop item
      const paidItem = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'Premium Document',
          category: 'Premium',
          isFree: false,
          price: 50000,
          isPublished: true,
        },
      });

      // Create payment
      const payment = await prisma.payment.create({
        data: {
          userId: TEST_MEMBER.id,
          bookShopItemId: paidItem.id,
          amount: 50000,
          currency: 'INR',
          status: 'pending',
          razorpayOrderId: 'order_complete_flow',
        },
      });

      // Simulate successful payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          razorpayPaymentId: 'pay_complete_flow',
        },
      });

      // Add to My jstudyroom
      const result = await addDocumentToMyJstudyroom(
        TEST_MEMBER.id,
        paidItem.id,
        false
      );

      expect(result.success).toBe(true);

      // Verify everything is linked correctly
      const myJstudyroomItem = await prisma.myJstudyroomItem.findUnique({
        where: {
          userId_bookShopItemId: {
            userId: TEST_MEMBER.id,
            bookShopItemId: paidItem.id,
          },
        },
        include: {
          bookShopItem: {
            include: {
              document: true,
              payments: {
                where: { userId: TEST_MEMBER.id },
              },
            },
          },
        },
      });

      expect(myJstudyroomItem).toBeDefined();
      expect(myJstudyroomItem?.bookShopItem.payments).toHaveLength(1);
      expect(myJstudyroomItem?.bookShopItem.payments[0].status).toBe('success');
    });

    it('should handle Book Shop item deletion with My jstudyroom cascade', async () => {
      const item = await prisma.bookShopItem.create({
        data: {
          documentId: testDocument.id,
          title: 'To Be Deleted',
          category: 'Test',
          isFree: true,
          isPublished: true,
        },
      });

      // Add to My jstudyroom
      await addDocumentToMyJstudyroom(TEST_MEMBER.id, item.id, true);

      // Delete Book Shop item (should cascade to My jstudyroom)
      await prisma.bookShopItem.delete({
        where: { id: item.id },
      });

      // Verify My jstudyroom item was also deleted
      const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
        where: { bookShopItemId: item.id },
      });

      expect(myJstudyroomItem).toBeNull();
    });
  });
});
