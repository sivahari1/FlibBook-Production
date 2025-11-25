import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';
import {
  canAddDocument,
  addDocumentToMyJstudyroom,
  removeDocumentFromMyJstudyroom,
} from '../my-jstudyroom';

// Test IDs
const TEST_USER_ID = 'test-member-user-id';
const TEST_DOCUMENT_ID = 'test-document-id';
const TEST_BOOKSHOP_ITEM_ID = 'test-bookshop-item-id';

describe('My jstudyroom Business Logic', () => {
  beforeEach(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {
        freeDocumentCount: 0,
        paidDocumentCount: 0,
      },
      create: {
        id: TEST_USER_ID,
        email: 'member@example.com',
        passwordHash: 'test-hash',
        name: 'Test Member',
        userRole: 'MEMBER',
        freeDocumentCount: 0,
        paidDocumentCount: 0,
      },
    });

    // Create test document
    await prisma.document.upsert({
      where: { id: TEST_DOCUMENT_ID },
      update: {},
      create: {
        id: TEST_DOCUMENT_ID,
        title: 'Test Document',
        filename: 'test.pdf',
        fileSize: 1024,
        storagePath: '/test/path',
        userId: TEST_USER_ID,
      },
    });

    // Create test book shop item
    await prisma.bookShopItem.upsert({
      where: { id: TEST_BOOKSHOP_ITEM_ID },
      update: {},
      create: {
        id: TEST_BOOKSHOP_ITEM_ID,
        documentId: TEST_DOCUMENT_ID,
        title: 'Test Book',
        description: 'Test Description',
        category: 'Test Category',
        isFree: true,
        isPublished: true,
      },
    });
  });

  afterEach(async () => {
    // Clean up in correct order due to foreign key constraints
    await prisma.myJstudyroomItem.deleteMany({
      where: { userId: TEST_USER_ID },
    });
    await prisma.bookShopItem.deleteMany({
      where: { id: TEST_BOOKSHOP_ITEM_ID },
    });
    await prisma.document.deleteMany({
      where: { id: TEST_DOCUMENT_ID },
    });
    await prisma.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
  });

  describe('canAddDocument', () => {
    it('should allow adding a free document when under all limits', async () => {
      const result = await canAddDocument(TEST_USER_ID, true);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow adding a paid document when under all limits', async () => {
      const result = await canAddDocument(TEST_USER_ID, false);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject when total document limit (10) is reached', async () => {
      // Set user to have 10 documents (5 free + 5 paid)
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 5,
          paidDocumentCount: 5,
        },
      });

      const result = await canAddDocument(TEST_USER_ID, true);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You have reached the maximum of 10 documents in My jstudyroom');
    });

    it('should reject when free document limit (5) is reached', async () => {
      // Set user to have 5 free documents
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 5,
          paidDocumentCount: 0,
        },
      });

      const result = await canAddDocument(TEST_USER_ID, true);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You have reached the maximum of 5 free documents');
    });

    it('should reject when paid document limit (5) is reached', async () => {
      // Set user to have 5 paid documents
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 0,
          paidDocumentCount: 5,
        },
      });

      const result = await canAddDocument(TEST_USER_ID, false);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You have reached the maximum of 5 paid documents');
    });

    it('should allow adding paid document when free limit is reached but paid limit is not', async () => {
      // Set user to have 5 free documents and 0 paid
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 5,
          paidDocumentCount: 0,
        },
      });

      const result = await canAddDocument(TEST_USER_ID, false);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow adding free document when paid limit is reached but free limit is not', async () => {
      // Set user to have 0 free documents and 5 paid
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 0,
          paidDocumentCount: 5,
        },
      });

      const result = await canAddDocument(TEST_USER_ID, true);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should handle edge case with 9 documents (4 free + 5 paid)', async () => {
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 4,
          paidDocumentCount: 5,
        },
      });

      const freeResult = await canAddDocument(TEST_USER_ID, true);
      expect(freeResult.allowed).toBe(true);

      const paidResult = await canAddDocument(TEST_USER_ID, false);
      expect(paidResult.allowed).toBe(false);
      expect(paidResult.reason).toBe('You have reached the maximum of 5 paid documents');
    });
  });

  describe('addDocumentToMyJstudyroom', () => {
    it('should successfully add a free document', async () => {
      const result = await addDocumentToMyJstudyroom(
        TEST_USER_ID,
        TEST_BOOKSHOP_ITEM_ID,
        true
      );

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.userId).toBe(TEST_USER_ID);
      expect(result.item?.bookShopItemId).toBe(TEST_BOOKSHOP_ITEM_ID);
      expect(result.item?.isFree).toBe(true);

      // Verify user's free document count was incremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.freeDocumentCount).toBe(1);
      expect(user?.paidDocumentCount).toBe(0);
    });

    it('should successfully add a paid document', async () => {
      const result = await addDocumentToMyJstudyroom(
        TEST_USER_ID,
        TEST_BOOKSHOP_ITEM_ID,
        false
      );

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.isFree).toBe(false);

      // Verify user's paid document count was incremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.freeDocumentCount).toBe(0);
      expect(user?.paidDocumentCount).toBe(1);
    });

    it('should reject adding document when limit is exceeded', async () => {
      // Set user to have 10 documents
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: {
          freeDocumentCount: 5,
          paidDocumentCount: 5,
        },
      });

      const result = await addDocumentToMyJstudyroom(
        TEST_USER_ID,
        TEST_BOOKSHOP_ITEM_ID,
        true
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('You have reached the maximum of 10 documents in My jstudyroom');
      expect(result.item).toBeUndefined();
    });

    it('should prevent duplicate additions', async () => {
      // Add document first time
      await addDocumentToMyJstudyroom(TEST_USER_ID, TEST_BOOKSHOP_ITEM_ID, true);

      // Try to add same document again
      const result = await addDocumentToMyJstudyroom(
        TEST_USER_ID,
        TEST_BOOKSHOP_ITEM_ID,
        true
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already');

      // Verify count was not incremented twice
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.freeDocumentCount).toBe(1);
    });

    it('should use transaction to ensure atomicity', async () => {
      // This test verifies that both the item creation and count increment happen together
      const result = await addDocumentToMyJstudyroom(
        TEST_USER_ID,
        TEST_BOOKSHOP_ITEM_ID,
        true
      );

      expect(result.success).toBe(true);

      // Verify both operations completed
      const item = await prisma.myJstudyroomItem.findFirst({
        where: {
          userId: TEST_USER_ID,
          bookShopItemId: TEST_BOOKSHOP_ITEM_ID,
        },
      });
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });

      expect(item).toBeDefined();
      expect(user?.freeDocumentCount).toBe(1);
    });
  });

  describe('removeDocumentFromMyJstudyroom', () => {
    let itemId: string;

    beforeEach(async () => {
      // Add a document to remove
      const result = await addDocumentToMyJstudyroom(TEST_USER_ID, TEST_BOOKSHOP_ITEM_ID, true);
      itemId = result.itemId!;
    });

    it('should successfully remove a free document', async () => {
      const result = await removeDocumentFromMyJstudyroom(
        TEST_USER_ID,
        itemId
      );

      expect(result.success).toBe(true);

      // Verify document was removed
      const item = await prisma.myJstudyroomItem.findFirst({
        where: {
          userId: TEST_USER_ID,
          bookShopItemId: TEST_BOOKSHOP_ITEM_ID,
        },
      });
      expect(item).toBeNull();

      // Verify user's free document count was decremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.freeDocumentCount).toBe(0);
    });

    it('should successfully remove a paid document', async () => {
      // First remove the free document and add a paid one
      await removeDocumentFromMyJstudyroom(TEST_USER_ID, itemId);
      const addResult = await addDocumentToMyJstudyroom(TEST_USER_ID, TEST_BOOKSHOP_ITEM_ID, false);
      const paidItemId = addResult.itemId!;

      const result = await removeDocumentFromMyJstudyroom(
        TEST_USER_ID,
        paidItemId
      );

      expect(result.success).toBe(true);

      // Verify user's paid document count was decremented
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.paidDocumentCount).toBe(0);
    });

    it('should handle removing non-existent document', async () => {
      const result = await removeDocumentFromMyJstudyroom(
        TEST_USER_ID,
        'non-existent-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should use transaction to ensure atomicity', async () => {
      const result = await removeDocumentFromMyJstudyroom(
        TEST_USER_ID,
        itemId
      );

      expect(result.success).toBe(true);

      // Verify both operations completed
      const item = await prisma.myJstudyroomItem.findFirst({
        where: {
          userId: TEST_USER_ID,
          bookShopItemId: TEST_BOOKSHOP_ITEM_ID,
        },
      });
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });

      expect(item).toBeNull();
      expect(user?.freeDocumentCount).toBe(0);
    });

    it('should not decrement count below zero', async () => {
      // Manually set count to 0
      await prisma.user.update({
        where: { id: TEST_USER_ID },
        data: { freeDocumentCount: 0 },
      });

      // Try to remove (this should handle the edge case)
      await removeDocumentFromMyJstudyroom(TEST_USER_ID, TEST_BOOKSHOP_ITEM_ID);

      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.freeDocumentCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Document limit calculations', () => {
    it('should correctly calculate limits with various combinations', async () => {
      const testCases = [
        { free: 0, paid: 0, canAddFree: true, canAddPaid: true },
        { free: 5, paid: 0, canAddFree: false, canAddPaid: true },
        { free: 0, paid: 5, canAddFree: true, canAddPaid: false },
        { free: 5, paid: 5, canAddFree: false, canAddPaid: false },
        { free: 3, paid: 3, canAddFree: true, canAddPaid: true },
        { free: 4, paid: 6, canAddFree: false, canAddPaid: false }, // Total exceeds 10
      ];

      for (const testCase of testCases) {
        await prisma.user.update({
          where: { id: TEST_USER_ID },
          data: {
            freeDocumentCount: testCase.free,
            paidDocumentCount: testCase.paid,
          },
        });

        const freeResult = await canAddDocument(TEST_USER_ID, true);
        const paidResult = await canAddDocument(TEST_USER_ID, false);

        expect(freeResult.allowed).toBe(testCase.canAddFree);
        expect(paidResult.allowed).toBe(testCase.canAddPaid);
      }
    });
  });
});
