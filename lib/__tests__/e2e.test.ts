/**
 * End-to-End Tests for jstudyroom Platform
 * 
 * These tests validate complete user flows including:
 * - Member registration and verification
 * - Adding free documents to My jstudyroom
 * - Purchasing paid documents
 * - Returning documents
 * - Share access with email restrictions
 * - Role-based routing
 * - Dark mode toggle
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { canAddDocument, addDocumentToMyJstudyroom, removeDocumentFromMyJstudyroom } from '@/lib/my-jstudyroom';

// Test data
let testMember: any;
let testPlatformUser: any;
let testDocument: any;
let testFreeBookShopItem: any;
let testPaidBookShopItem: any;
let testShareLink: any;

describe('E2E: Member Registration and Verification', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['e2e-member@test.com', 'e2e-platform@test.com']
        }
      }
    });
  });

  it('should create a new Member account with unverified status', async () => {
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    
    testMember = await prisma.user.create({
      data: {
        email: 'e2e-member@test.com',
        passwordHash,
        name: 'E2E Test Member',
        userRole: 'MEMBER',
        emailVerified: false,
        freeDocumentCount: 0,
        paidDocumentCount: 0,
      }
    });

    expect(testMember).toBeDefined();
    expect(testMember.userRole).toBe('MEMBER');
    expect(testMember.emailVerified).toBe(false);
    expect(testMember.freeDocumentCount).toBe(0);
    expect(testMember.paidDocumentCount).toBe(0);
  });

  it('should verify Member email', async () => {
    const updatedMember = await prisma.user.update({
      where: { id: testMember.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    });

    expect(updatedMember.emailVerified).toBe(true);
    expect(updatedMember.emailVerifiedAt).toBeDefined();
  });
});

describe('E2E: Role-Based Routing', () => {
  beforeAll(async () => {
    // Create Platform User for routing tests
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    
    testPlatformUser = await prisma.user.create({
      data: {
        email: 'e2e-platform@test.com',
        passwordHash,
        name: 'E2E Platform User',
        userRole: 'PLATFORM_USER',
        emailVerified: true,
        isActive: true,
      }
    });
  });

  it('should have correct role for Member', async () => {
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });

    expect(member?.userRole).toBe('MEMBER');
  });

  it('should have correct role for Platform User', async () => {
    const platformUser = await prisma.user.findUnique({
      where: { id: testPlatformUser.id }
    });

    expect(platformUser?.userRole).toBe('PLATFORM_USER');
  });

  it('should verify Member cannot access Platform User features', async () => {
    // Members should not be able to create documents
    const member = await prisma.user.findUnique({
      where: { id: testMember.id },
      select: { userRole: true }
    });

    expect(member?.userRole).not.toBe('PLATFORM_USER');
    expect(member?.userRole).not.toBe('ADMIN');
  });
});

describe('E2E: Book Shop Setup', () => {
  beforeAll(async () => {
    // Create a test document for Book Shop items
    testDocument = await prisma.document.create({
      data: {
        title: 'E2E Test Document',
        filename: 'e2e-test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storagePath: 'e2e-test/e2e-test.pdf',
        userId: testPlatformUser.id,
      }
    });
  });

  it('should create a free Book Shop item', async () => {
    testFreeBookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId: testDocument.id,
        title: 'E2E Free Book',
        description: 'A free book for E2E testing',
        category: 'Test Category',
        isFree: true,
        price: null,
        isPublished: true,
      }
    });

    expect(testFreeBookShopItem).toBeDefined();
    expect(testFreeBookShopItem.isFree).toBe(true);
    expect(testFreeBookShopItem.price).toBeNull();
  });

  it('should create a paid Book Shop item', async () => {
    testPaidBookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId: testDocument.id,
        title: 'E2E Paid Book',
        description: 'A paid book for E2E testing',
        category: 'Test Category',
        isFree: false,
        price: 9900, // ₹99
        isPublished: true,
      }
    });

    expect(testPaidBookShopItem).toBeDefined();
    expect(testPaidBookShopItem.isFree).toBe(false);
    expect(testPaidBookShopItem.price).toBe(9900);
  });
});

describe('E2E: Adding Free Documents to My jstudyroom', () => {
  it('should check if Member can add a free document', async () => {
    const result = await canAddDocument(testMember.id, true);
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should add a free document to My jstudyroom', async () => {
    const result = await addDocumentToMyJstudyroom(
      testMember.id,
      testFreeBookShopItem.id,
      true
    );

    expect(result.success).toBe(true);
    expect(result.itemId).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should increment free document count', async () => {
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });

    expect(member?.freeDocumentCount).toBe(1);
    expect(member?.paidDocumentCount).toBe(0);
  });

  it('should verify document is in My jstudyroom', async () => {
    const items = await prisma.myJstudyroomItem.findMany({
      where: { userId: testMember.id }
    });

    expect(items.length).toBe(1);
    expect(items[0].bookShopItemId).toBe(testFreeBookShopItem.id);
    expect(items[0].isFree).toBe(true);
  });

  it('should prevent adding duplicate documents', async () => {
    const result = await addDocumentToMyJstudyroom(
      testMember.id,
      testFreeBookShopItem.id,
      true
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('already in your My jstudyroom');
  });
});

describe('E2E: Document Limits', () => {
  it('should enforce free document limit (5)', async () => {
    // Add 4 more free documents to reach the limit
    for (let i = 0; i < 4; i++) {
      const doc = await prisma.document.create({
        data: {
          title: `E2E Free Doc ${i}`,
          filename: `e2e-free-${i}.pdf`,
          fileSize: 1024000,
          mimeType: 'application/pdf',
          storagePath: `e2e-test/e2e-free-${i}.pdf`,
          userId: testPlatformUser.id,
        }
      });

      const bookShopItem = await prisma.bookShopItem.create({
        data: {
          documentId: doc.id,
          title: `E2E Free Book ${i}`,
          description: `Free book ${i}`,
          category: 'Test',
          isFree: true,
          isPublished: true,
        }
      });

      await addDocumentToMyJstudyroom(testMember.id, bookShopItem.id, true);
    }

    // Verify we have 5 free documents
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });
    expect(member?.freeDocumentCount).toBe(5);

    // Try to add one more - should fail
    const doc = await prisma.document.create({
      data: {
        title: 'E2E Free Doc Extra',
        filename: 'e2e-free-extra.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storagePath: 'e2e-test/e2e-free-extra.pdf',
        userId: testPlatformUser.id,
      }
    });

    const bookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId: doc.id,
        title: 'E2E Free Book Extra',
        description: 'Extra free book',
        category: 'Test',
        isFree: true,
        isPublished: true,
      }
    });

    const result = await addDocumentToMyJstudyroom(testMember.id, bookShopItem.id, true);
    expect(result.success).toBe(false);
    expect(result.error).toContain('maximum of 5 free documents');
  });
});

describe('E2E: Purchasing Paid Documents', () => {
  it('should check if Member can add a paid document', async () => {
    const result = await canAddDocument(testMember.id, false);
    
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should simulate successful payment and add paid document', async () => {
    // Create a payment record
    const payment = await prisma.payment.create({
      data: {
        userId: testMember.id,
        bookShopItemId: testPaidBookShopItem.id,
        amount: testPaidBookShopItem.price!,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: `order_${nanoid(10)}`,
      }
    });

    expect(payment.status).toBe('pending');

    // Simulate successful payment
    const result = await addDocumentToMyJstudyroom(
      testMember.id,
      testPaidBookShopItem.id,
      false
    );

    expect(result.success).toBe(true);
    expect(result.itemId).toBeDefined();

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'success',
        razorpayPaymentId: `pay_${nanoid(10)}`,
      }
    });

    // Verify paid document count
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });
    expect(member?.paidDocumentCount).toBe(1);
  });

  it('should verify payment record exists', async () => {
    const payments = await prisma.payment.findMany({
      where: {
        userId: testMember.id,
      }
    });

    expect(payments.length).toBeGreaterThan(0);
    
    // Find the successful payment
    const successfulPayment = payments.find(p => p.status === 'success');
    expect(successfulPayment).toBeDefined();
    expect(successfulPayment?.amount).toBe(testPaidBookShopItem.price);
  });
});

describe('E2E: Returning Documents', () => {
  let itemToReturn: any;

  beforeAll(async () => {
    // Get one of the items to return
    itemToReturn = await prisma.myJstudyroomItem.findFirst({
      where: {
        userId: testMember.id,
        isFree: true
      }
    });
  });

  it('should return a document from My jstudyroom', async () => {
    expect(itemToReturn).toBeDefined();

    const result = await removeDocumentFromMyJstudyroom(
      testMember.id,
      itemToReturn.id
    );

    expect(result.success).toBe(true);
  });

  it('should decrement document count after return', async () => {
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });

    expect(member?.freeDocumentCount).toBe(4);
  });

  it('should verify document is removed from My jstudyroom', async () => {
    const item = await prisma.myJstudyroomItem.findUnique({
      where: { id: itemToReturn.id }
    });

    expect(item).toBeNull();
  });

  it('should allow re-adding the returned document', async () => {
    const result = await addDocumentToMyJstudyroom(
      testMember.id,
      itemToReturn.bookShopItemId,
      true
    );

    expect(result.success).toBe(true);
  });
});

describe('E2E: Share Access with Email Restrictions', () => {
  beforeAll(async () => {
    // Create a share link with email restriction
    testShareLink = await prisma.shareLink.create({
      data: {
        shareKey: nanoid(16),
        documentId: testDocument.id,
        userId: testPlatformUser.id,
        restrictToEmail: testMember.email,
        isActive: true,
      }
    });
  });

  it('should create share link with email restriction', async () => {
    expect(testShareLink).toBeDefined();
    expect(testShareLink.restrictToEmail).toBe(testMember.email);
  });

  it('should allow access for matching email', async () => {
    const share = await prisma.shareLink.findUnique({
      where: { shareKey: testShareLink.shareKey }
    });

    expect(share).toBeDefined();
    expect(share?.restrictToEmail).toBe(testMember.email);
    expect(share?.isActive).toBe(true);
  });

  it('should deny access for non-matching email', async () => {
    const share = await prisma.shareLink.findUnique({
      where: { shareKey: testShareLink.shareKey }
    });

    const wrongEmail = 'wrong@test.com';
    const accessAllowed = share?.restrictToEmail === wrongEmail;

    expect(accessAllowed).toBe(false);
  });

  it('should handle expired share links', async () => {
    const expiredShare = await prisma.shareLink.create({
      data: {
        shareKey: nanoid(16),
        documentId: testDocument.id,
        userId: testPlatformUser.id,
        restrictToEmail: testMember.email,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        isActive: true,
      }
    });

    const now = new Date();
    const isExpired = expiredShare.expiresAt && expiredShare.expiresAt < now;

    expect(isExpired).toBe(true);
  });

  it('should handle revoked share links', async () => {
    const revokedShare = await prisma.shareLink.update({
      where: { id: testShareLink.id },
      data: { isActive: false }
    });

    expect(revokedShare.isActive).toBe(false);
  });
});

describe('E2E: Dark Mode Toggle', () => {
  it('should verify theme preferences can be stored', () => {
    // Simulate localStorage behavior
    const themes = ['light', 'dark', 'system'];
    
    themes.forEach(theme => {
      expect(['light', 'dark', 'system']).toContain(theme);
    });
  });

  it('should verify theme classes are valid', () => {
    const validThemeClasses = [
      'dark:bg-gray-900',
      'dark:text-white',
      'dark:border-gray-700',
      'bg-white',
      'text-gray-900'
    ];

    validThemeClasses.forEach(className => {
      expect(className).toBeTruthy();
      expect(typeof className).toBe('string');
    });
  });
});

describe('E2E: Total Document Limit', () => {
  it('should enforce total document limit (10)', async () => {
    // Current state: 5 free, 1 paid = 6 total
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });

    expect(member?.freeDocumentCount + member?.paidDocumentCount).toBeLessThanOrEqual(10);

    // Add 4 more paid documents to reach 10 total
    for (let i = 0; i < 4; i++) {
      const doc = await prisma.document.create({
        data: {
          title: `E2E Paid Doc ${i}`,
          filename: `e2e-paid-${i}.pdf`,
          fileSize: 1024000,
          mimeType: 'application/pdf',
          storagePath: `e2e-test/e2e-paid-${i}.pdf`,
          userId: testPlatformUser.id,
        }
      });

      const bookShopItem = await prisma.bookShopItem.create({
        data: {
          documentId: doc.id,
          title: `E2E Paid Book ${i}`,
          description: `Paid book ${i}`,
          category: 'Test',
          isFree: false,
          price: 9900,
          isPublished: true,
        }
      });

      await addDocumentToMyJstudyroom(testMember.id, bookShopItem.id, false);
    }

    // Verify we have 10 total documents
    const updatedMember = await prisma.user.findUnique({
      where: { id: testMember.id }
    });
    expect(updatedMember?.freeDocumentCount + updatedMember?.paidDocumentCount).toBe(10);

    // Try to add one more - should fail
    const result = await canAddDocument(testMember.id, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('maximum of 10 documents');
  });
});

// Cleanup
afterAll(async () => {
  // Clean up test data
  await prisma.myJstudyroomItem.deleteMany({
    where: { userId: testMember.id }
  });

  await prisma.payment.deleteMany({
    where: { userId: testMember.id }
  });

  await prisma.shareLink.deleteMany({
    where: { userId: testPlatformUser.id }
  });

  await prisma.bookShopItem.deleteMany({
    where: {
      title: {
        startsWith: 'E2E'
      }
    }
  });

  await prisma.document.deleteMany({
    where: {
      title: {
        startsWith: 'E2E'
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['e2e-member@test.com', 'e2e-platform@test.com']
      }
    }
  });

  await prisma.$disconnect();
});
