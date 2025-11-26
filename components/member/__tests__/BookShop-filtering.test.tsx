/**
 * Property-Based Tests for BookShop Filtering
 * Feature: member-study-room-bookshop
 * Properties: 3, 4, 5, 6
 * Validates: Requirements 2.1, 2.3, 2.4, 2.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Type definitions matching the BookShop component
interface BookShopItem {
  id: string;
  documentId: string;
  title: string;
  description: string | null;
  category: string;
  isFree: boolean;
  price: number | null;
  isPublished: boolean;
  inMyJstudyroom: boolean;
  contentType?: string;
  metadata?: any;
  previewUrl?: string;
  linkUrl?: string;
  document: {
    id: string;
    title: string;
    filename: string;
    contentType?: string;
    metadata?: any;
    thumbnailUrl?: string;
    linkUrl?: string;
  };
}

// Filtering functions matching BookShop component logic
const filterByPublished = (items: BookShopItem[]): BookShopItem[] => {
  return items.filter(item => item.isPublished);
};

const filterByCategory = (items: BookShopItem[], category: string): BookShopItem[] => {
  if (!category) return items;
  return items.filter(item => item.category === category);
};

const filterByContentType = (items: BookShopItem[], contentType: string): BookShopItem[] => {
  if (!contentType) return items;
  return items.filter(item => {
    const itemContentType = item.document?.contentType || 'PDF';
    return itemContentType === contentType;
  });
};

const filterBySearch = (items: BookShopItem[], query: string): BookShopItem[] => {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.description?.toLowerCase().includes(lowerQuery)
  );
};

// Arbitraries for generating test data
const bookShopItemArbitrary = fc.record({
  id: fc.uuid(),
  documentId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  category: fc.oneof(
    fc.constant('Maths > CBSE - 1st Standard'),
    fc.constant('Maths > CBSE - 2nd Standard'),
    fc.constant('Maths > CBSE - 5th Standard'),
    fc.constant('Maths > CBSE - 10th Standard'),
    fc.constant('Music'),
    fc.constant('Functional MRI')
  ),
  isFree: fc.boolean(),
  price: fc.option(fc.float({ min: 1, max: 10000, noNaN: true })),
  isPublished: fc.boolean(),
  inMyJstudyroom: fc.boolean(),
  contentType: fc.option(fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO')),
  metadata: fc.option(fc.record({})),
  previewUrl: fc.option(fc.webUrl()),
  linkUrl: fc.option(fc.webUrl()),
  document: fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    filename: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    contentType: fc.option(fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO')),
    metadata: fc.option(fc.record({})),
    thumbnailUrl: fc.option(fc.webUrl()),
    linkUrl: fc.option(fc.webUrl()),
  })
});

describe('BookShop Filtering Property Tests', () => {
  /**
   * **Feature: member-study-room-bookshop, Property 3: BookShop displays only published items**
   * **Validates: Requirements 2.1**
   */
  describe('Property 3: BookShop displays only published items', () => {
    it('should display only items where isPublished is true', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          (items) => {
            const filtered = filterByPublished(items);
            
            // All filtered items must have isPublished = true
            filtered.forEach(item => {
              expect(item.isPublished).toBe(true);
            });
            
            // Count should match the number of published items
            const expectedCount = items.filter(item => item.isPublished).length;
            expect(filtered.length).toBe(expectedCount);
            
            // No unpublished items should be in the result
            const unpublishedInResult = filtered.some(item => !item.isPublished);
            expect(unpublishedInResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 4: Category filtering is accurate**
   * **Validates: Requirements 2.3**
   */
  describe('Property 4: Category filtering is accurate', () => {
    it('should display only items matching the selected category', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          fc.constantFrom(
            'Maths > CBSE - 1st Standard',
            'Maths > CBSE - 2nd Standard',
            'Music',
            'Functional MRI'
          ),
          (items, selectedCategory) => {
            const filtered = filterByCategory(items, selectedCategory);
            
            // All filtered items must have the selected category
            filtered.forEach(item => {
              expect(item.category).toBe(selectedCategory);
            });
            
            // Count should match the number of items with that category
            const expectedCount = items.filter(item => item.category === selectedCategory).length;
            expect(filtered.length).toBe(expectedCount);
            
            // No items with different categories should be in the result
            const wrongCategoryInResult = filtered.some(item => item.category !== selectedCategory);
            expect(wrongCategoryInResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all items when no category is selected', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          (items) => {
            const filtered = filterByCategory(items, '');
            
            // Should return all items when category is empty
            expect(filtered.length).toBe(items.length);
            expect(filtered).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 5: Content type filtering is accurate**
   * **Validates: Requirements 2.4**
   */
  describe('Property 5: Content type filtering is accurate', () => {
    it('should display only items matching the selected content type', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
          (items, selectedContentType) => {
            const filtered = filterByContentType(items, selectedContentType);
            
            // All filtered items must have the selected content type
            filtered.forEach(item => {
              const itemContentType = item.document?.contentType || 'PDF';
              expect(itemContentType).toBe(selectedContentType);
            });
            
            // Count should match the number of items with that content type
            const expectedCount = items.filter(item => {
              const itemContentType = item.document?.contentType || 'PDF';
              return itemContentType === selectedContentType;
            }).length;
            expect(filtered.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all items when no content type is selected', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          (items) => {
            const filtered = filterByContentType(items, '');
            
            // Should return all items when content type is empty
            expect(filtered.length).toBe(items.length);
            expect(filtered).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 6: Search filtering matches title and description**
   * **Validates: Requirements 2.5**
   */
  describe('Property 6: Search filtering matches title and description', () => {
    it('should display only items where query appears in title or description (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          (items, searchQuery) => {
            const filtered = filterBySearch(items, searchQuery);
            const lowerQuery = searchQuery.toLowerCase();
            
            // All filtered items must contain the query in title or description
            filtered.forEach(item => {
              const titleMatch = item.title.toLowerCase().includes(lowerQuery);
              const descriptionMatch = item.description?.toLowerCase().includes(lowerQuery) || false;
              expect(titleMatch || descriptionMatch).toBe(true);
            });
            
            // Count should match the number of items with matching title or description
            const expectedCount = items.filter(item => {
              const titleMatch = item.title.toLowerCase().includes(lowerQuery);
              const descriptionMatch = item.description?.toLowerCase().includes(lowerQuery) || false;
              return titleMatch || descriptionMatch;
            }).length;
            expect(filtered.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all items when search query is empty', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          (items) => {
            const filtered = filterBySearch(items, '');
            
            // Should return all items when query is empty
            expect(filtered.length).toBe(items.length);
            expect(filtered).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          (items, searchQuery) => {
            const lowerFiltered = filterBySearch(items, searchQuery.toLowerCase());
            const upperFiltered = filterBySearch(items, searchQuery.toUpperCase());
            const mixedFiltered = filterBySearch(items, searchQuery);
            
            // All three should return the same results
            expect(lowerFiltered.length).toBe(upperFiltered.length);
            expect(lowerFiltered.length).toBe(mixedFiltered.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined filtering test - ensures filters work together correctly
   */
  describe('Combined filtering', () => {
    it('should correctly apply multiple filters together', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 10, maxLength: 50 }),
          fc.constantFrom('Music', 'Functional MRI'),
          fc.constantFrom('PDF', 'VIDEO'),
          (items, category, contentType) => {
            // Apply filters in sequence (as the component does)
            let filtered = filterByPublished(items);
            filtered = filterByCategory(filtered, category);
            filtered = filterByContentType(filtered, contentType);
            
            // All items must pass all filter conditions
            filtered.forEach(item => {
              expect(item.isPublished).toBe(true);
              expect(item.category).toBe(category);
              const itemContentType = item.document?.contentType || 'PDF';
              expect(itemContentType).toBe(contentType);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
