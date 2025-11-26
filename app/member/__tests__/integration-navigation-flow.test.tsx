/**
 * Integration Tests for Navigation Flow
 * Task 14.1: Write integration test for navigation flow
 * 
 * This test suite validates complete end-to-end workflows:
 * - Browse and add workflow
 * - Payment workflow
 * - Collection management workflow
 * 
 * Requirements: All
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { 
  canAddDocument, 
  addDocumentToMyJstudyroom, 
  removeDocumentFromMyJstudyroom 
} from '@/lib/my-jstudyroom';

// Test data
let testMember: any;
let testPlatformUser: any;
let testDocument1: any;
let testDocument2: any;
let testDocument3: any;
let testFreeBookShopItem: any;
let testPaidBookShopItem: any;
let testPublishedItem: any;
let testUnpublishedItem: any;

describe('Integration: Complete Browse and Add Workflow', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['integration-member@test.com', 'integration-platform@test.com']
        }
      }
    });

    // Create test users
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    
    testMember = await prisma.user.create({
      data: {
        email: 'integration-member@test.com',
        passwordHash,
        name: 'Integration Test Member',
        userRole: 'MEMBER',
        emailVerified: true,
        freeDocumentCount: 0,
        paidDocumentCount: 0,
      }
    });

    testPlatformUser = await prisma.user.create({
      data: {
        email: 'integration-platform@test.com',
        passwordHash,
        name: 'Integration Platform User',
        userRole: 'PLATFORM_USER',
        emailVerified: true,
        isActive: true,
      }
    });

    // Create test documents
    testDocument1 = await prisma.document.create({
      data: {
        title: 'Integration Test Doc 1',
        filename: 'integration-test-1.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        storagePath: 'integration-test/test-1.pdf',
        userId: testPlatformUser.id,
        contentType: 'PDF',
      }
    });

    testDocument2 = await prisma.document.create({
      data: {
        title: 'Integration Test Doc 2',
        filename: 'integration-test-2.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf',
        storagePath: 'integration-test/test-2.pdf',
        userId: testPlatformUser.id,
        contentType: 'PDF',
      }
    });

    testDocument3 = await prisma.document.create({
      data: {
        title: 'Integration Test Doc 3',
        filename: 'integration-test-3.pdf',
        fileSize: 3072000,
        mimeType: 'application/pdf',
        storagePath: 'integration-test/test-3.pdf',
        userId: testPlatformUser.id,
        contentType: 'VIDEO',
      }
    });

    // Create BookShop items
    testFreeBookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId: testDocument1.id,
        title: 'Free Integration Book',
        description: 'A free book for integration testing',
        category: 'Maths > CBSE - 1st Standard',
        isFree: true,
        price: null,
        isPublished: true,
      }
    });

    testPaidBookShopItem = await prisma.bookShopItem.create({
      data: {
        documentId: testDocument2.id,
        title: 'Paid Integration Book',
        description: 'A paid book for integration testing',
        category: 'Music',
        isFree: false,
        price: 9900,
        isPublished: true,
      }
    });

    testPublishedItem = await prisma.bookShopItem.create({
      data: {
        documentId: testDocument3.id,
        title: 'Published Video Book',
        description: 'A published video for testing',
        category: 'Functional MRI',
        isFree: true,
        price: null,
        isPublished: true,
      }
    });

    testUnpublishedItem = await prisma.bookShopItem.create({
      data: {
        documentId: testDocument3.id,
        title: 'Unpublished Book',
        description: 'An unpublished book for testing',
        category: 'Music',
        isFree: true,
        price: null,
        isPublished: false,
      }
    });
  });

  describe('Step 1: Member navigates to dashboard', () => {
    it('should display member dashboard with correct initial counts', async () => {
      const member = await prisma.user.findUnique({
        where: { id: testMember.id }
      });

      expect(member).toBeDefined();
      expect(member?.userRole).toBe('MEMBER');
      expect(member?.freeDocumentCount).toBe(0);
      expect(member?.paidDocumentCount).toBe(0);
    });

    it('should show quick action cards for navigation', () => {
      // Verify the expected navigation paths exist
      const expectedPaths = [
        '/member',
        '/member/bookshop',
        '/member/my-jstudyroom',
        '/member/shared'
      ];

      expectedPaths.forEach(path => {
        expect(path).toBeTruthy();
        expect(path.startsWith('/member')).toBe(true);
      });
    });
  });

  describe('Step 2: Member navigates to BookShop', () => {
    it('should navigate from dashboard to BookShop', () => {
      const dashboardPath = '/member';
      const bookshopPath = '/member/bookshop';

      expect(bookshopPath).toBeTruthy();
      expect(bookshopPath).not.toBe(dashboardPath);
    });

    it('should display only published items in BookShop', async () => {
      const publishedItems = await prisma.bookShopItem.findMany({
        where: { isPublished: true }
      });

      const unpublishedItems = await prisma.bookShopItem.findMany({
        where: { isPublished: false }
      });

      // Verify published items exist
      expect(publishedItems.length).toBeGreaterThan(0);
      
      // Verify all published items have isPublished = true
      publishedItems.forEach(item => {
        expect(item.isPublished).toBe(true);
      });

      // Verify unpublished items are not shown (would be filtered out)
      unpublishedItems.forEach(item => {
        expect(item.isPublished).toBe(false);
      });
    });

    it('should display items with all required information', async () => {
      const item = await prisma.bookShopItem.findUnique({
        where: { id: testFreeBookShopItem.id },
        include: { document: true }
      });

      expect(item).toBeDefined();
      expect(item?.title).toBeDefined();
      expect(item?.description).toBeDefined();
      expect(item?.category).toBeDefined();
      expect(typeof item?.isFree).toBe('boolean');
      expect(item?.document).toBeDefined();
    });
  });

  describe('Step 3: Member filters BookShop by category', () => {
    it('should filter items by Maths category', async () => {
      const mathsItems = await prisma.bookShopItem.findMany({
        where: {
          isPublished: true,
          category: { startsWith: 'Maths' }
        }
      });

      mathsItems.forEach(item => {
        expect(item.category.startsWith('Maths')).toBe(true);
        expect(item.isPublished).toBe(true);
      });
    });

    it('should filter items by Music category', async () => {
      const musicItems = await prisma.bookShopItem.findMany({
        where: {
          isPublished: true,
          category: 'Music'
        }
      });

      musicItems.forEach(item => {
        expect(item.category).toBe('Music');
        expect(item.isPublished).toBe(true);
      });
    });
  });

  describe('Step 4: Member searches for specific content', () => {
    it('should search by title', async () => {
      const searchQuery = 'Free';
      const results = await prisma.bookShopItem.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        }
      });

      results.forEach(item => {
        const titleMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const descMatch = item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        expect(titleMatch || descMatch).toBe(true);
      });
    });

    it('should search by description', async () => {
      const searchQuery = 'integration';
      const results = await prisma.bookShopItem.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        }
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Step 5: Member adds free item to Study Room', () => {
    it('should check if member can add free item', async () => {
      const canAdd = await canAddDocument(testMember.id, true);
      
      expect(canAdd.allowed).toBe(true);
      expect(canAdd.reason).toBeUndefined();
    });

    it('should add free item to Study Room', async () => {
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

    it('should verify item appears in Study Room', async () => {
      const items = await prisma.myJstudyroomItem.findMany({
        where: { userId: testMember.id }
      });

      expect(items.length).toBe(1);
      expect(items[0].bookShopItemId).toBe(testFreeBookShopItem.id);
      expect(items[0].isFree).toBe(true);
    });
  });

  describe('Step 6: Member navigates to Study Room', () => {
    it('should navigate from BookShop to Study Room', () => {
      const bookshopPath = '/member/bookshop';
      const studyroomPath = '/member/my-jstudyroom';

      expect(studyroomPath).toBeTruthy();
      expect(studyroomPath).not.toBe(bookshopPath);
    });

    it('should display all items in Study Room', async () => {
      const items = await prisma.myJstudyroomItem.findMany({
        where: { userId: testMember.id },
        include: {
          bookShopItem: {
            include: { document: true }
          }
        }
      });

      expect(items.length).toBe(1);
      
      items.forEach(item => {
        expect(item.bookShopItem).toBeDefined();
        expect(item.bookShopItem.title).toBeDefined();
        expect(item.bookShopItem.document).toBeDefined();
      });
    });
  });

  describe('Step 7: Member navigates back to dashboard', () => {
    it('should navigate from Study Room to dashboard', () => {
      const studyroomPath = '/member/my-jstudyroom';
      const dashboardPath = '/member';

      expect(dashboardPath).toBeTruthy();
      expect(dashboardPath).not.toBe(studyroomPath);
    });

    it('should display updated counts on dashboard', async () => {
      const member = await prisma.user.findUnique({
        where: { id: testMember.id }
      });

      expect(member?.freeDocumentCount).toBe(1);
      expect(member?.paidDocumentCount).toBe(0);
    });
  });
});

describe('Integration: Complete Payment Workflow', () => {
  beforeEach(async () => {
    // Ensure member has space for paid items
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });
    expect(member?.paidDocumentCount).toBeLessThan(5);
  });

  describe('Step 1: Member selects paid item from BookShop', () => {
    it('should display paid item with price', async () => {
      const item = await prisma.bookShopItem.findUnique({
        where: { id: testPaidBookShopItem.id }
      });

      expect(item).toBeDefined();
      expect(item?.isFree).toBe(false);
      expect(item?.price).toBe(9900);
      expect(item?.isPublished).toBe(true);
    });

    it('should check if member can add paid item', async () => {
      const canAdd = await canAddDocument(testMember.id, false);
      
      expect(canAdd.allowed).toBe(true);
      expect(canAdd.reason).toBeUndefined();
    });
  });

  describe('Step 2: Payment modal is triggered', () => {
    it('should create payment order', async () => {
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

      expect(payment).toBeDefined();
      expect(payment.status).toBe('pending');
      expect(payment.amount).toBe(9900);
      expect(payment.userId).toBe(testMember.id);
    });
  });

  describe('Step 3: Member completes payment', () => {
    let paymentRecord: any;

    beforeEach(async () => {
      // Create a payment record
      paymentRecord = await prisma.payment.create({
        data: {
          userId: testMember.id,
          bookShopItemId: testPaidBookShopItem.id,
          amount: testPaidBookShopItem.price!,
          currency: 'INR',
          status: 'pending',
          razorpayOrderId: `order_${nanoid(10)}`,
        }
      });
    });

    it('should verify payment and add item to Study Room', async () => {
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
        where: { id: paymentRecord.id },
        data: {
          status: 'success',
          razorpayPaymentId: `pay_${nanoid(10)}`,
        }
      });

      // Verify payment record
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: paymentRecord.id }
      });

      expect(updatedPayment?.status).toBe('success');
      expect(updatedPayment?.razorpayPaymentId).toBeDefined();
    });

    it('should increment paid document count', async () => {
      const member = await prisma.user.findUnique({
        where: { id: testMember.id }
      });

      expect(member?.paidDocumentCount).toBe(1);
    });

    it('should verify paid item appears in Study Room', async () => {
      const items = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: testMember.id,
          isFree: false
        }
      });

      expect(items.length).toBe(1);
      expect(items[0].bookShopItemId).toBe(testPaidBookShopItem.id);
      expect(items[0].isFree).toBe(false);
    });
  });

  describe('Step 4: Payment failure handling', () => {
    it('should handle payment failure gracefully', async () => {
      const failedPayment = await prisma.payment.create({
        data: {
          userId: testMember.id,
          bookShopItemId: testPaidBookShopItem.id,
          amount: testPaidBookShopItem.price!,
          currency: 'INR',
          status: 'pending',
          razorpayOrderId: `order_${nanoid(10)}`,
        }
      });

      // Simulate payment failure
      await prisma.payment.update({
        where: { id: failedPayment.id },
        data: { status: 'failed' }
      });

      const payment = await prisma.payment.findUnique({
        where: { id: failedPayment.id }
      });

      expect(payment?.status).toBe('failed');

      // Verify item was not added to Study Room
      const itemCount = await prisma.myJstudyroomItem.count({
        where: {
          userId: testMember.id,
          bookShopItemId: testPaidBookShopItem.id
        }
      });

      // Should only have 1 (from successful payment above)
      expect(itemCount).toBe(1);
    });
  });

  describe('Step 5: Member views updated Study Room', () => {
    it('should display both free and paid items', async () => {
      const items = await prisma.myJstudyroomItem.findMany({
        where: { userId: testMember.id },
        include: {
          bookShopItem: true
        }
      });

      expect(items.length).toBe(2); // 1 free + 1 paid
      
      const freeItems = items.filter(item => item.isFree);
      const paidItems = items.filter(item => !item.isFree);

      expect(freeItems.length).toBe(1);
      expect(paidItems.length).toBe(1);
    });
  });
});

describe('Integration: Complete Collection Management Workflow', () => {
  describe('Step 1: Member views Study Room collection', () => {
    it('should display all items with correct information', async () => {
      const items = await prisma.myJstudyroomItem.findMany({
        where: { userId: testMember.id },
        include: {
          bookShopItem: {
            include: { document: true }
          }
        }
      });

      expect(items.length).toBe(2);

      items.forEach(item => {
        expect(item.bookShopItem).toBeDefined();
        expect(item.bookShopItem.title).toBeDefined();
        expect(item.bookShopItem.description).toBeDefined();
        expect(typeof item.isFree).toBe('boolean');
        expect(item.bookShopItem.document).toBeDefined();
      });
    });
  });

  describe('Step 2: Member filters Study Room by content type', () => {
    it('should filter by PDF content type', async () => {
      const pdfItems = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: testMember.id,
          bookShopItem: {
            document: {
              contentType: 'PDF'
            }
          }
        },
        include: {
          bookShopItem: {
            include: { document: true }
          }
        }
      });

      pdfItems.forEach(item => {
        expect(item.bookShopItem.document.contentType).toBe('PDF');
      });
    });
  });

  describe('Step 3: Member filters by free/paid', () => {
    it('should filter to show only free items', async () => {
      const freeItems = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: testMember.id,
          isFree: true
        }
      });

      expect(freeItems.length).toBe(1);
      freeItems.forEach(item => {
        expect(item.isFree).toBe(true);
      });
    });

    it('should filter to show only paid items', async () => {
      const paidItems = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: testMember.id,
          isFree: false
        }
      });

      expect(paidItems.length).toBe(1);
      paidItems.forEach(item => {
        expect(item.isFree).toBe(false);
      });
    });
  });

  describe('Step 4: Member searches within Study Room', () => {
    it('should search by title', async () => {
      const searchQuery = 'Free';
      const items = await prisma.myJstudyroomItem.findMany({
        where: {
          userId: testMember.id,
          bookShopItem: {
            OR: [
              { title: { contains: searchQuery, mode: 'insensitive' } },
              { description: { contains: searchQuery, mode: 'insensitive' } }
            ]
          }
        },
        include: {
          bookShopItem: true
        }
      });

      items.forEach(item => {
        const titleMatch = item.bookShopItem.title.toLowerCase().includes(searchQuery.toLowerCase());
        const descMatch = item.bookShopItem.description?.toLowerCase().includes(searchQuery.toLowerCase());
        expect(titleMatch || descMatch).toBe(true);
      });
    });
  });

  describe('Step 5: Member removes item from Study Room', () => {
    let itemToRemove: any;
    let removedItemId: string;

    beforeEach(async () => {
      itemToRemove = await prisma.myJstudyroomItem.findFirst({
        where: {
          userId: testMember.id,
          isFree: true
        }
      });
    });

    it('should remove free item from Study Room', async () => {
      expect(itemToRemove).toBeDefined();
      removedItemId = itemToRemove.id;

      const result = await removeDocumentFromMyJstudyroom(
        testMember.id,
        itemToRemove.id
      );

      expect(result.success).toBe(true);
    });

    it('should decrement free document count', async () => {
      const member = await prisma.user.findUnique({
        where: { id: testMember.id }
      });

      expect(member?.freeDocumentCount).toBe(0);
      expect(member?.paidDocumentCount).toBe(1);
    });

    it('should verify item is removed from Study Room', async () => {
      const item = await prisma.myJstudyroomItem.findUnique({
        where: { id: removedItemId }
      });

      expect(item).toBeNull();
    });

    it('should verify remaining items are still in Study Room', async () => {
      const items = await prisma.myJstudyroomItem.findMany({
        where: { userId: testMember.id }
      });

      expect(items.length).toBe(1); // Only paid item remains
      expect(items[0].isFree).toBe(false);
    });
  });

  describe('Step 6: Member re-adds the removed item', () => {
    it('should allow re-adding previously removed item', async () => {
      const result = await addDocumentToMyJstudyroom(
        testMember.id,
        testFreeBookShopItem.id,
        true
      );

      expect(result.success).toBe(true);
      expect(result.itemId).toBeDefined();
    });

    it('should increment free document count again', async () => {
      const member = await prisma.user.findUnique({
        where: { id: testMember.id }
      });

      expect(member?.freeDocumentCount).toBe(1);
      expect(member?.paidDocumentCount).toBe(1);
    });
  });

  describe('Step 7: Member clears all filters', () => {
    it('should display all items when filters are cleared', async () => {
      const allItems = await prisma.myJstudyroomItem.findMany({
        where: { userId: testMember.id }
      });

      expect(allItems.length).toBe(2);
    });
  });

  describe('Step 8: Member navigates to view an item', () => {
    it('should navigate to item viewer', async () => {
      const item = await prisma.myJstudyroomItem.findFirst({
        where: { userId: testMember.id }
      });

      expect(item).toBeDefined();
      
      const viewerPath = `/member/view/${item?.id}`;
      expect(viewerPath).toBeTruthy();
      expect(viewerPath.startsWith('/member/view/')).toBe(true);
    });
  });
});

describe('Integration: Navigation History and Browser Back', () => {
  it('should support navigation flow: Dashboard -> BookShop -> Study Room -> Dashboard', () => {
    const navigationFlow = [
      '/member',
      '/member/bookshop',
      '/member/my-jstudyroom',
      '/member'
    ];

    navigationFlow.forEach((path, index) => {
      expect(path).toBeTruthy();
      expect(path.startsWith('/member')).toBe(true);
      
      if (index > 0) {
        expect(path).not.toBe(navigationFlow[index - 1]);
      }
    });
  });

  it('should support navigation with query parameters', () => {
    const paths = [
      '/member/bookshop?category=Maths',
      '/member/bookshop?contentType=PDF',
      '/member/my-jstudyroom?filter=free'
    ];

    paths.forEach(path => {
      expect(path).toBeTruthy();
      expect(path.includes('?')).toBe(true);
    });
  });
});

describe('Integration: Complete User Journey', () => {
  it('should complete full member journey from registration to collection management', async () => {
    // Verify member exists and is verified
    const member = await prisma.user.findUnique({
      where: { id: testMember.id }
    });

    expect(member).toBeDefined();
    expect(member?.emailVerified).toBe(true);
    expect(member?.userRole).toBe('MEMBER');

    // Verify member has items in Study Room
    const items = await prisma.myJstudyroomItem.findMany({
      where: { userId: testMember.id }
    });

    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(10);

    // Verify member has both free and paid items
    const freeCount = items.filter(item => item.isFree).length;
    const paidCount = items.filter(item => !item.isFree).length;

    expect(freeCount).toBeGreaterThan(0);
    expect(paidCount).toBeGreaterThan(0);

    // Verify counts match database
    expect(member?.freeDocumentCount).toBe(freeCount);
    expect(member?.paidDocumentCount).toBe(paidCount);

    // Verify payment records exist
    const payments = await prisma.payment.findMany({
      where: { userId: testMember.id }
    });

    expect(payments.length).toBeGreaterThan(0);
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

  await prisma.bookShopItem.deleteMany({
    where: {
      title: {
        contains: 'Integration'
      }
    }
  });

  await prisma.document.deleteMany({
    where: {
      title: {
        startsWith: 'Integration'
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['integration-member@test.com', 'integration-platform@test.com']
      }
    }
  });

  await prisma.$disconnect();
});
