/**
 * Property-Based Tests for BookShop API
 * Feature: admin-enhanced-privileges
 * 
 * Tests the following properties:
 * - Property 37: BookShop item deletion visibility
 * - Property 38: BookShop purchase preservation
 * - Property 39: BookShop analytics by type
 * 
 * Requirements: 12.3, 12.4, 12.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ContentType } from '@/lib/types/content';
import { DELETE } from '../[id]/route';
import { GET as getAnalytics } from '../analytics/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/role-check', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

// Mock Prisma client - use factory function to avoid hoisting issues
vi.mock('@/lib/db', () => ({
  prisma: {
    bookShopItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

// Import the mocked prisma after mocking
import { prisma } from '@/lib/db';

describe('Property-Based Tests - BookShop API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Feature: admin-enhanced-privileges, Property 37: BookShop item deletion visibility**
   * For any BookShop item, after deletion, querying the member-visible catalog should not return that item
   * **Validates: Requirements 12.3**
   */
  it('Property 37: BookShop item deletion visibility', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random BookShop item data
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          contentType: fc.constantFrom(
            ContentType.PDF,
            ContentType.IMAGE,
            ContentType.VIDEO,
            ContentType.LINK
          ),
          isPublished: fc.boolean(),
          hasPurchases: fc.boolean()
        }),
        async (itemData) => {
          // Setup: Create a mock BookShop item
          const mockItem = {
            id: itemData.id,
            title: itemData.title,
            contentType: itemData.contentType,
            isPublished: itemData.isPublished,
            _count: {
              myJstudyroomItems: itemData.hasPurchases ? 1 : 0,
              payments: itemData.hasPurchases ? 1 : 0
            }
          };

          vi.mocked(prisma.bookShopItem.findUnique).mockResolvedValue(mockItem);

          // If item has purchases, it should be soft deleted (unpublished)
          if (itemData.hasPurchases) {
            vi.mocked(prisma.bookShopItem.update).mockResolvedValue({
              ...mockItem,
              isPublished: false
            });
          } else {
            vi.mocked(prisma.bookShopItem.delete).mockResolvedValue(mockItem);
          }

          // Execute: Delete the item
          const request = new NextRequest(
            `http://localhost:3000/api/admin/bookshop/${itemData.id}`,
            { method: 'DELETE' }
          );
          const response = await DELETE(request, { params: { id: itemData.id } });
          const result = await response.json();

          // Property: After deletion, the item should not be visible in member catalog
          // This is achieved by either:
          // 1. Hard delete (item removed from database) - no purchases
          // 2. Soft delete (isPublished = false) - has purchases
          
          if (itemData.hasPurchases) {
            // Soft delete: item should be unpublished
            expect(prisma.bookShopItem.update).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { id: itemData.id },
                data: { isPublished: false }
              })
            );
            expect(result.preservedPurchases).toBe(true);
            
            // Verify the item would not appear in member-visible catalog
            // (member catalog filters by isPublished: true)
            const updatedItem = await vi.mocked(prisma.bookShopItem.update).mock.results[0].value;
            expect(updatedItem.isPublished).toBe(false);
          } else {
            // Hard delete: item should be removed from database
            expect(prisma.bookShopItem.delete).toHaveBeenCalledWith({
              where: { id: itemData.id }
            });
            expect(result.preservedPurchases).toBe(false);
          }

          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * **Feature: admin-enhanced-privileges, Property 38: BookShop purchase preservation**
   * For any BookShop item with existing purchases, updating the item should not modify or delete purchase records
   * **Validates: Requirements 12.4**
   */
  it('Property 38: BookShop purchase preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random BookShop item with purchases
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          contentType: fc.constantFrom(
            ContentType.PDF,
            ContentType.IMAGE,
            ContentType.VIDEO,
            ContentType.LINK
          ),
          purchaseCount: fc.integer({ min: 1, max: 100 }),
          paymentCount: fc.integer({ min: 1, max: 100 })
        }),
        async (itemData) => {
          // Setup: Create a mock BookShop item with purchases
          const mockItem = {
            id: itemData.id,
            title: itemData.title,
            contentType: itemData.contentType,
            isPublished: true,
            _count: {
              myJstudyroomItems: itemData.purchaseCount,
              payments: itemData.paymentCount
            }
          };

          vi.mocked(prisma.bookShopItem.findUnique).mockResolvedValue(mockItem);

          // Mock the delete operation (should result in soft delete)
          vi.mocked(prisma.bookShopItem.update).mockResolvedValue({
            ...mockItem,
            isPublished: false
          });

          // Execute: Delete the item (which should soft delete due to purchases)
          const request = new NextRequest(
            `http://localhost:3000/api/admin/bookshop/${itemData.id}`,
            { method: 'DELETE' }
          );
          const response = await DELETE(request, { params: { id: itemData.id } });
          const result = await response.json();

          // Property: Purchase records should be preserved
          // This is verified by:
          // 1. The item is soft deleted (update, not delete)
          // 2. The response indicates purchases were preserved
          // 3. The delete operation was NOT called (which would cascade delete purchases)
          
          expect(prisma.bookShopItem.update).toHaveBeenCalled();
          expect(prisma.bookShopItem.delete).not.toHaveBeenCalled();
          expect(result.preservedPurchases).toBe(true);
          expect(result.purchaseCount).toBe(itemData.purchaseCount + itemData.paymentCount);
          
          // Verify the soft delete only changed isPublished, not the item itself
          expect(prisma.bookShopItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { id: itemData.id },
              data: { isPublished: false }
            })
          );

          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: admin-enhanced-privileges, Property 39: BookShop analytics by type**
   * For any set of BookShop items, the analytics should include statistics broken down by each content type
   * **Validates: Requirements 12.5**
   */
  it('Property 39: BookShop analytics by type', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random set of BookShop items with various content types
        fc.array(
          fc.record({
            id: fc.uuid(),
            contentType: fc.constantFrom(
              ContentType.PDF,
              ContentType.IMAGE,
              ContentType.VIDEO,
              ContentType.LINK
            ),
            isFree: fc.boolean(),
            price: fc.integer({ min: 0, max: 10000 }),
            isPublished: fc.boolean(),
            purchaseCount: fc.integer({ min: 0, max: 50 }),
            paymentCount: fc.integer({ min: 0, max: 50 })
          }),
          { minLength: 0, maxLength: 50 }
        ),
        async (items) => {
          // Setup: Mock the database to return our generated items
          const mockItems = items.map(item => ({
            id: item.id,
            contentType: item.contentType,
            isFree: item.isFree,
            price: item.isFree ? null : item.price,
            isPublished: item.isPublished,
            _count: {
              myJstudyroomItems: item.purchaseCount,
              payments: item.paymentCount
            }
          }));

          vi.mocked(prisma.bookShopItem.findMany).mockResolvedValue(mockItems);

          // Execute: Get analytics
          const request = new NextRequest(
            'http://localhost:3000/api/admin/bookshop/analytics',
            { method: 'GET' }
          );
          const response = await getAnalytics(request);
          const result = await response.json();

          // Property: Analytics should include breakdown by content type
          expect(result.analytics).toBeDefined();
          expect(result.analytics.byContentType).toBeDefined();

          // Verify all content types are present in analytics
          const contentTypes = [ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK];
          contentTypes.forEach(type => {
            expect(result.analytics.byContentType[type]).toBeDefined();
            expect(result.analytics.byContentType[type]).toHaveProperty('items');
            expect(result.analytics.byContentType[type]).toHaveProperty('published');
            expect(result.analytics.byContentType[type]).toHaveProperty('draft');
            expect(result.analytics.byContentType[type]).toHaveProperty('free');
            expect(result.analytics.byContentType[type]).toHaveProperty('paid');
            expect(result.analytics.byContentType[type]).toHaveProperty('purchases');
            expect(result.analytics.byContentType[type]).toHaveProperty('revenue');
          });

          // Verify the counts match the input data
          const expectedCounts: Record<string, number> = {};
          contentTypes.forEach(type => {
            expectedCounts[type] = items.filter(item => item.contentType === type).length;
          });

          contentTypes.forEach(type => {
            expect(result.analytics.byContentType[type].items).toBe(expectedCounts[type]);
          });

          // Verify total counts match sum of all items
          const totalItems = items.length;
          expect(result.analytics.total.items).toBe(totalItems);

          // Verify published/draft counts
          const publishedCount = items.filter(item => item.isPublished).length;
          const draftCount = items.filter(item => !item.isPublished).length;
          expect(result.analytics.total.published).toBe(publishedCount);
          expect(result.analytics.total.draft).toBe(draftCount);

          // Verify free/paid counts
          const freeCount = items.filter(item => item.isFree).length;
          const paidCount = items.filter(item => !item.isFree).length;
          expect(result.analytics.total.free).toBe(freeCount);
          expect(result.analytics.total.paid).toBe(paidCount);

          // Verify total purchases
          const totalPurchases = items.reduce(
            (sum, item) => sum + item.purchaseCount + item.paymentCount,
            0
          );
          expect(result.analytics.total.totalPurchases).toBe(totalPurchases);

          // Verify total revenue
          const totalRevenue = items.reduce((sum, item) => {
            if (item.isFree) return sum;
            return sum + (item.price * item.paymentCount);
          }, 0);
          expect(result.analytics.total.totalRevenue).toBe(totalRevenue);

          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});
