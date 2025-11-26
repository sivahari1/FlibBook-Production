/**
 * Property-Based Tests for My jstudyroom
 * Feature: member-study-room-bookshop
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using fast-check for property-based testing.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { prisma } from '../db';
import {
  addDocumentToMyJstudyroom,
  MY_JSTUDYROOM_LIMITS,
} from '../my-jstudyroom';

// Generate a valid free document count (0-5)
const freeCountArbitrary = fc.integer({ min: 0, max: MY_JSTUDYROOM_LIMITS.MAX_FREE_DOCUMENTS });

// Generate a valid paid document count (0-5)
const paidCountArbitrary = fc.integer({ min: 0, max: MY_JSTUDYROOM_LIMITS.MAX_PAID_DOCUMENTS });

// Generate a user state with valid document counts
const userStateArbitrary = fc.record({
  freeDocumentCount: freeCountArbitrary,
  paidDocumentCount: paidCountArbitrary,
}).filter(state => 
  // Ensure total doesn't exceed max
  state.freeDocumentCount + state.paidDocumentCount <= MY_JSTUDYROOM_LIMITS.MAX_TOTAL_DOCUMENTS
);

describe('My jstudyroom Property-Based Tests', () => {
  // Helper function to clean up test data
  async function cleanupTestData(userId: string, bookShopItemIds: string[], documentIds: string[]) {
    try {
      // Delete in correct order due to foreign key constraints
      await prisma.myJstudyroomItem.deleteMany({
        where: { userId },
      });
      
      for (const itemId of bookShopItemIds) {
        await prisma.bookShopItem.deleteMany({
          where: { id: itemId },
        }).catch(() => {}); // Ignore errors if already deleted
      }
      
      for (const docId of documentIds) {
        await prisma.document.deleteMany({
          where: { id: docId },
        }).catch(() => {}); // Ignore errors if already deleted
      }
      
      await prisma.user.deleteMany({
        where: { id: userId },
      }).catch(() => {}); // Ignore errors if already deleted
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Feature: member-study-room-bookshop, Property 12: Adding free items increments free count
   * Validates: Requirements 4.1
   */
  describe('Property 12: Adding free items increments free count', () => {
    it('for any member with available free slots, adding a free item should increment freeDocumentCount by 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          userStateArbitrary.filter(state => 
            // Only test when free slots are available
            state.freeDocumentCount < MY_JSTUDYROOM_LIMITS.MAX_FREE_DOCUMENTS &&
            state.freeDocumentCount + state.paidDocumentCount < MY_JSTUDYROOM_LIMITS.MAX_TOTAL_DOCUMENTS
          ),
          async (userState) => {
            // Generate unique IDs for this test run
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const userId = `test-pbt-user-${timestamp}-${random}`;
            const documentId = `test-pbt-doc-${timestamp}-${random}`;
            const bookShopItemId = `test-pbt-item-${timestamp}-${random}`;

            try {
              // Setup: Create user with specific document counts
              await prisma.user.create({
                data: {
                  id: userId,
                  email: `test-${timestamp}-${random}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  userRole: 'MEMBER',
                  freeDocumentCount: userState.freeDocumentCount,
                  paidDocumentCount: userState.paidDocumentCount,
                },
              });

              // Create test document
              await prisma.document.create({
                data: {
                  id: documentId,
                  title: 'Test Document',
                  filename: 'test.pdf',
                  fileSize: 1024,
                  storagePath: '/test/path',
                  userId: userId,
                },
              });

              // Create free book shop item
              await prisma.bookShopItem.create({
                data: {
                  id: bookShopItemId,
                  documentId: documentId,
                  title: 'Test Book',
                  description: 'Test Description',
                  category: 'Test Category',
                  isFree: true,
                  isPublished: true,
                },
              });

              // Get initial count
              const initialCount = userState.freeDocumentCount;

              // Action: Add free document to My jstudyroom
              const result = await addDocumentToMyJstudyroom(
                userId,
                bookShopItemId,
                true // isFree
              );

              // Verify operation succeeded
              expect(result.success).toBe(true);

              // Property: Free count should increment by exactly 1
              const updatedUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  freeDocumentCount: true,
                  paidDocumentCount: true,
                },
              });

              expect(updatedUser).toBeDefined();
              expect(updatedUser!.freeDocumentCount).toBe(initialCount + 1);
              
              // Paid count should remain unchanged
              expect(updatedUser!.paidDocumentCount).toBe(userState.paidDocumentCount);

              // Verify MyJstudyroom record was created
              const myJstudyroomItem = await prisma.myJstudyroomItem.findUnique({
                where: {
                  userId_bookShopItemId: {
                    userId,
                    bookShopItemId,
                  },
                },
              });

              expect(myJstudyroomItem).toBeDefined();
              expect(myJstudyroomItem!.isFree).toBe(true);
            } finally {
              // Cleanup for this specific test run
              await cleanupTestData(userId, [bookShopItemId], [documentId]);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for database-heavy operations
      );
    }, 60000); // Increase timeout for property-based tests

    it('for any member with available free slots, adding a paid item should NOT increment freeDocumentCount', async () => {
      await fc.assert(
        fc.asyncProperty(
          userStateArbitrary.filter(state => 
            // Only test when paid slots are available
            state.paidDocumentCount < MY_JSTUDYROOM_LIMITS.MAX_PAID_DOCUMENTS &&
            state.freeDocumentCount + state.paidDocumentCount < MY_JSTUDYROOM_LIMITS.MAX_TOTAL_DOCUMENTS
          ),
          async (userState) => {
            // Generate unique IDs for this test run
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const userId = `test-pbt-user-${timestamp}-${random}`;
            const documentId = `test-pbt-doc-${timestamp}-${random}`;
            const bookShopItemId = `test-pbt-item-${timestamp}-${random}`;

            try {
              // Setup: Create user with specific document counts
              await prisma.user.create({
                data: {
                  id: userId,
                  email: `test-${timestamp}-${random}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  userRole: 'MEMBER',
                  freeDocumentCount: userState.freeDocumentCount,
                  paidDocumentCount: userState.paidDocumentCount,
                },
              });

              // Create test document
              await prisma.document.create({
                data: {
                  id: documentId,
                  title: 'Test Document',
                  filename: 'test.pdf',
                  fileSize: 1024,
                  storagePath: '/test/path',
                  userId: userId,
                },
              });

              // Create paid book shop item
              await prisma.bookShopItem.create({
                data: {
                  id: bookShopItemId,
                  documentId: documentId,
                  title: 'Test Book',
                  description: 'Test Description',
                  category: 'Test Category',
                  isFree: false,
                  price: 100,
                  isPublished: true,
                },
              });

              // Get initial count
              const initialFreeCount = userState.freeDocumentCount;
              const initialPaidCount = userState.paidDocumentCount;

              // Action: Add paid document to My jstudyroom
              const result = await addDocumentToMyJstudyroom(
                userId,
                bookShopItemId,
                false // isFree
              );

              // Verify operation succeeded
              expect(result.success).toBe(true);

              // Property: Free count should remain unchanged
              const updatedUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  freeDocumentCount: true,
                  paidDocumentCount: true,
                },
              });

              expect(updatedUser).toBeDefined();
              expect(updatedUser!.freeDocumentCount).toBe(initialFreeCount);
              
              // Paid count should increment by 1
              expect(updatedUser!.paidDocumentCount).toBe(initialPaidCount + 1);
            } finally {
              // Cleanup for this specific test run
              await cleanupTestData(userId, [bookShopItemId], [documentId]);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for database-heavy operations
      );
    }, 60000); // Increase timeout for property-based tests
  });

  /**
   * Feature: member-study-room-bookshop, Property 17: Removing items decrements correct counter
   * Validates: Requirements 5.4
   */
  describe('Property 17: Removing items decrements correct counter', () => {
    it('for any free Study Room item, removing it should decrement freeDocumentCount by 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          userStateArbitrary.filter(state => 
            // Only test when there's at least one free item to remove
            state.freeDocumentCount > 0
          ),
          async (userState) => {
            // Generate unique IDs for this test run
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const userId = `test-pbt-user-${timestamp}-${random}`;
            const documentId = `test-pbt-doc-${timestamp}-${random}`;
            const bookShopItemId = `test-pbt-item-${timestamp}-${random}`;

            try {
              // Setup: Create user with specific document counts
              await prisma.user.create({
                data: {
                  id: userId,
                  email: `test-${timestamp}-${random}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  userRole: 'MEMBER',
                  freeDocumentCount: userState.freeDocumentCount,
                  paidDocumentCount: userState.paidDocumentCount,
                },
              });

              // Create test document
              await prisma.document.create({
                data: {
                  id: documentId,
                  title: 'Test Document',
                  filename: 'test.pdf',
                  fileSize: 1024,
                  storagePath: '/test/path',
                  userId: userId,
                },
              });

              // Create free book shop item
              await prisma.bookShopItem.create({
                data: {
                  id: bookShopItemId,
                  documentId: documentId,
                  title: 'Test Book',
                  description: 'Test Description',
                  category: 'Test Category',
                  isFree: true,
                  isPublished: true,
                },
              });

              // Create MyJstudyroom item directly (simulating it was already added)
              const myJstudyroomItem = await prisma.myJstudyroomItem.create({
                data: {
                  userId,
                  bookShopItemId,
                  isFree: true,
                },
              });

              // Get initial counts
              const initialFreeCount = userState.freeDocumentCount;
              const initialPaidCount = userState.paidDocumentCount;

              // Action: Remove free document from My jstudyroom
              const { removeDocumentFromMyJstudyroom } = await import('../my-jstudyroom');
              const result = await removeDocumentFromMyJstudyroom(
                userId,
                myJstudyroomItem.id
              );

              // Verify operation succeeded
              expect(result.success).toBe(true);

              // Property: Free count should decrement by exactly 1
              const updatedUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  freeDocumentCount: true,
                  paidDocumentCount: true,
                },
              });

              expect(updatedUser).toBeDefined();
              expect(updatedUser!.freeDocumentCount).toBe(initialFreeCount - 1);
              
              // Paid count should remain unchanged
              expect(updatedUser!.paidDocumentCount).toBe(initialPaidCount);

              // Verify MyJstudyroom record was deleted
              const deletedItem = await prisma.myJstudyroomItem.findUnique({
                where: {
                  userId_bookShopItemId: {
                    userId,
                    bookShopItemId,
                  },
                },
              });

              expect(deletedItem).toBeNull();
            } finally {
              // Cleanup for this specific test run
              await cleanupTestData(userId, [bookShopItemId], [documentId]);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for database-heavy operations
      );
    }, 60000); // Increase timeout for property-based tests

    it('for any paid Study Room item, removing it should decrement paidDocumentCount by 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          userStateArbitrary.filter(state => 
            // Only test when there's at least one paid item to remove
            state.paidDocumentCount > 0
          ),
          async (userState) => {
            // Generate unique IDs for this test run
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const userId = `test-pbt-user-${timestamp}-${random}`;
            const documentId = `test-pbt-doc-${timestamp}-${random}`;
            const bookShopItemId = `test-pbt-item-${timestamp}-${random}`;

            try {
              // Setup: Create user with specific document counts
              await prisma.user.create({
                data: {
                  id: userId,
                  email: `test-${timestamp}-${random}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  userRole: 'MEMBER',
                  freeDocumentCount: userState.freeDocumentCount,
                  paidDocumentCount: userState.paidDocumentCount,
                },
              });

              // Create test document
              await prisma.document.create({
                data: {
                  id: documentId,
                  title: 'Test Document',
                  filename: 'test.pdf',
                  fileSize: 1024,
                  storagePath: '/test/path',
                  userId: userId,
                },
              });

              // Create paid book shop item
              await prisma.bookShopItem.create({
                data: {
                  id: bookShopItemId,
                  documentId: documentId,
                  title: 'Test Book',
                  description: 'Test Description',
                  category: 'Test Category',
                  isFree: false,
                  price: 100,
                  isPublished: true,
                },
              });

              // Create MyJstudyroom item directly (simulating it was already added)
              const myJstudyroomItem = await prisma.myJstudyroomItem.create({
                data: {
                  userId,
                  bookShopItemId,
                  isFree: false,
                },
              });

              // Get initial counts
              const initialFreeCount = userState.freeDocumentCount;
              const initialPaidCount = userState.paidDocumentCount;

              // Action: Remove paid document from My jstudyroom
              const { removeDocumentFromMyJstudyroom } = await import('../my-jstudyroom');
              const result = await removeDocumentFromMyJstudyroom(
                userId,
                myJstudyroomItem.id
              );

              // Verify operation succeeded
              expect(result.success).toBe(true);

              // Property: Paid count should decrement by exactly 1
              const updatedUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  freeDocumentCount: true,
                  paidDocumentCount: true,
                },
              });

              expect(updatedUser).toBeDefined();
              expect(updatedUser!.paidDocumentCount).toBe(initialPaidCount - 1);
              
              // Free count should remain unchanged
              expect(updatedUser!.freeDocumentCount).toBe(initialFreeCount);

              // Verify MyJstudyroom record was deleted
              const deletedItem = await prisma.myJstudyroomItem.findUnique({
                where: {
                  userId_bookShopItemId: {
                    userId,
                    bookShopItemId,
                  },
                },
              });

              expect(deletedItem).toBeNull();
            } finally {
              // Cleanup for this specific test run
              await cleanupTestData(userId, [bookShopItemId], [documentId]);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs for database-heavy operations
      );
    }, 60000); // Increase timeout for property-based tests
  });

  /**
   * Feature: member-study-room-bookshop, Property 24: Document counts are calculated correctly
   * Validates: Requirements 8.1, 8.2
   */
  describe('Property 24: Document counts are calculated correctly', () => {
    it('for any member collection, freeDocumentCount should equal the number of free items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: MY_JSTUDYROOM_LIMITS.MAX_FREE_DOCUMENTS }),
          fc.integer({ min: 0, max: MY_JSTUDYROOM_LIMITS.MAX_PAID_DOCUMENTS }),
          async (numFreeItems, numPaidItems) => {
            // Ensure total doesn't exceed limit
            if (numFreeItems + numPaidItems > MY_JSTUDYROOM_LIMITS.MAX_TOTAL_DOCUMENTS) {
              return true; // Skip this combination
            }

            // Generate unique IDs for this test run
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const userId = `test-pbt-user-${timestamp}-${random}`;
            const documentIds: string[] = [];
            const bookShopItemIds: string[] = [];

            try {
              // Setup: Create user
              await prisma.user.create({
                data: {
                  id: userId,
                  email: `test-${timestamp}-${random}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  userRole: 'MEMBER',
                  freeDocumentCount: 0,
                  paidDocumentCount: 0,
                },
              });

              // Add free items
              for (let i = 0; i < numFreeItems; i++) {
                const documentId = `test-pbt-doc-free-${timestamp}-${i}-${random}`;
                const bookShopItemId = `test-pbt-item-free-${timestamp}-${i}-${random}`;
                documentIds.push(documentId);
                bookShopItemIds.push(bookShopItemId);

                await prisma.document.create({
                  data: {
                    id: documentId,
                    title: `Test Document ${i}`,
                    filename: `test${i}.pdf`,
                    fileSize: 1024,
                    storagePath: `/test/path${i}`,
                    userId: userId,
                  },
                });

                await prisma.bookShopItem.create({
                  data: {
                    id: bookShopItemId,
                    documentId: documentId,
                    title: `Test Book ${i}`,
                    description: 'Test Description',
                    category: 'Test Category',
                    isFree: true,
                    isPublished: true,
                  },
                });

                await addDocumentToMyJstudyroom(userId, bookShopItemId, true);
              }

              // Add paid items
              for (let i = 0; i < numPaidItems; i++) {
                const documentId = `test-pbt-doc-paid-${timestamp}-${i}-${random}`;
                const bookShopItemId = `test-pbt-item-paid-${timestamp}-${i}-${random}`;
                documentIds.push(documentId);
                bookShopItemIds.push(bookShopItemId);

                await prisma.document.create({
                  data: {
                    id: documentId,
                    title: `Test Document Paid ${i}`,
                    filename: `test-paid${i}.pdf`,
                    fileSize: 1024,
                    storagePath: `/test/path-paid${i}`,
                    userId: userId,
                  },
                });

                await prisma.bookShopItem.create({
                  data: {
                    id: bookShopItemId,
                    documentId: documentId,
                    title: `Test Book Paid ${i}`,
                    description: 'Test Description',
                    category: 'Test Category',
                    isFree: false,
                    price: 100,
                    isPublished: true,
                  },
                });

                await addDocumentToMyJstudyroom(userId, bookShopItemId, false);
              }

              // Property: Counts should match the number of items added
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  freeDocumentCount: true,
                  paidDocumentCount: true,
                },
              });

              expect(user).toBeDefined();
              expect(user!.freeDocumentCount).toBe(numFreeItems);
              expect(user!.paidDocumentCount).toBe(numPaidItems);

              // Verify actual items in collection match counts
              const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
                where: { userId },
              });

              const actualFreeCount = myJstudyroomItems.filter(item => item.isFree).length;
              const actualPaidCount = myJstudyroomItems.filter(item => !item.isFree).length;

              expect(actualFreeCount).toBe(numFreeItems);
              expect(actualPaidCount).toBe(numPaidItems);
              expect(user!.freeDocumentCount).toBe(actualFreeCount);
              expect(user!.paidDocumentCount).toBe(actualPaidCount);
            } finally {
              // Cleanup for this specific test run
              await cleanupTestData(userId, bookShopItemIds, documentIds);
            }
          }
        ),
        { numRuns: 20 } // Reduced runs due to complexity
      );
    }, 60000); // Increase timeout for complex property-based tests

    it('for any member collection, total count should equal freeDocumentCount + paidDocumentCount', async () => {
      await fc.assert(
        fc.asyncProperty(
          userStateArbitrary,
          async (userState) => {
            // Generate unique IDs for this test run
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const userId = `test-pbt-user-${timestamp}-${random}`;

            try {
              // Setup: Create user with specific document counts
              await prisma.user.create({
                data: {
                  id: userId,
                  email: `test-${timestamp}-${random}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  userRole: 'MEMBER',
                  freeDocumentCount: userState.freeDocumentCount,
                  paidDocumentCount: userState.paidDocumentCount,
                },
              });

              // Property: Total should always equal sum of free and paid
              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                  freeDocumentCount: true,
                  paidDocumentCount: true,
                },
              });

              expect(user).toBeDefined();
              const totalCount = user!.freeDocumentCount + user!.paidDocumentCount;
              
              // Total should be the sum
              expect(totalCount).toBe(userState.freeDocumentCount + userState.paidDocumentCount);
              
              // Total should not exceed maximum
              expect(totalCount).toBeLessThanOrEqual(MY_JSTUDYROOM_LIMITS.MAX_TOTAL_DOCUMENTS);
            } finally {
              // Cleanup for this specific test run
              await cleanupTestData(userId, [], []);
            }
          }
        ),
        { numRuns: 50 } // Moderate runs for simple database operations
      );
    }, 60000); // Increase timeout for property-based tests
  });
});
