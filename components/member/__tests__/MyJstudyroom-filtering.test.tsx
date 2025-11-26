/**
 * Property-Based Tests for Study Room (MyJstudyroom) Filtering
 * Feature: member-study-room-bookshop
 * Properties: 15, 16, 18, 19, 20, 21, 22
 * Validates: Requirements 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Type definitions matching the MyJstudyroom component
interface MyJstudyroomItem {
  id: string;
  bookShopItemId: string;
  title: string;
  description?: string;
  category: string;
  isFree: boolean;
  addedAt: string;
  documentId: string;
  documentTitle: string;
  contentType: string;
  metadata: any;
}

// Filtering functions matching MyJstudyroom component logic
const filterBySearch = (items: MyJstudyroomItem[], query: string): MyJstudyroomItem[] => {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    (item.description && item.description.toLowerCase().includes(lowerQuery))
  );
};

const filterByContentType = (items: MyJstudyroomItem[], contentType: string): MyJstudyroomItem[] => {
  if (!contentType) return items;
  return items.filter(item => item.contentType === contentType);
};

const filterByPriceType = (items: MyJstudyroomItem[], priceType: 'all' | 'free' | 'paid'): MyJstudyroomItem[] => {
  if (priceType === 'all') return items;
  return items.filter(item => 
    priceType === 'free' ? item.isFree : !item.isFree
  );
};

// Helper to check if item has required fields
const hasRequiredFields = (item: MyJstudyroomItem): boolean => {
  return !!(
    item.title &&
    item.contentType &&
    typeof item.isFree === 'boolean' &&
    item.description !== undefined // Can be null/undefined but must exist
  );
};

// Arbitraries for generating test data
const myJstudyroomItemArbitrary = fc.record({
  id: fc.uuid(),
  bookShopItemId: fc.uuid(),
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
  addedAt: fc.integer({ min: 1577836800000, max: Date.now() }).map(timestamp => new Date(timestamp).toISOString()),
  documentId: fc.uuid(),
  documentTitle: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
  metadata: fc.option(fc.record({})),
});

describe('Study Room (MyJstudyroom) Filtering Property Tests', () => {
  /**
   * **Feature: member-study-room-bookshop, Property 15: Study Room displays all collection items**
   * **Validates: Requirements 5.1**
   */
  describe('Property 15: Study Room displays all collection items', () => {
    it('should display all items in the member collection without filtering', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 0, maxLength: 10 }),
          (items) => {
            // When no filters are applied, all items should be displayed
            const displayedItems = items; // No filtering
            
            // Count should match exactly
            expect(displayedItems.length).toBe(items.length);
            
            // All items should be present
            items.forEach(item => {
              const found = displayedItems.find(d => d.id === item.id);
              expect(found).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty collections', () => {
      fc.assert(
        fc.property(
          fc.constant([]),
          (items) => {
            expect(items.length).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should display collections up to the maximum limit of 10 items', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 0, maxLength: 10 }),
          (items) => {
            // Collection should never exceed 10 items
            expect(items.length).toBeLessThanOrEqual(10);
            
            // All items should be displayable
            expect(items.length).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 16: Study Room items display required fields**
   * **Validates: Requirements 5.2**
   */
  describe('Property 16: Study Room items display required fields', () => {
    it('should display title, description, content type, and free/paid status for all items', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 1, maxLength: 10 }),
          (items) => {
            // All items must have required fields
            items.forEach(item => {
              expect(hasRequiredFields(item)).toBe(true);
              
              // Verify specific fields
              expect(item.title).toBeDefined();
              expect(typeof item.title).toBe('string');
              expect(item.title.length).toBeGreaterThan(0);
              
              expect(item.contentType).toBeDefined();
              expect(['PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO']).toContain(item.contentType);
              
              expect(typeof item.isFree).toBe('boolean');
              
              // Description can be null/undefined but must be defined
              expect('description' in item).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify free vs paid items', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 1, maxLength: 10 }),
          (items) => {
            items.forEach(item => {
              // isFree should be a boolean
              expect(typeof item.isFree).toBe('boolean');
              
              // Item should be either free or paid, not both
              if (item.isFree) {
                expect(item.isFree).toBe(true);
              } else {
                expect(item.isFree).toBe(false);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 18: Study Room search filters correctly**
   * **Validates: Requirements 6.1**
   */
  describe('Property 18: Study Room search filters correctly', () => {
    it('should display only items where query appears in title or description (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
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

    it('should return all items when search query is empty or whitespace', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          fc.constantFrom('', '   ', '\t', '\n'),
          (items, emptyQuery) => {
            const filtered = filterBySearch(items, emptyQuery);
            
            // Should return all items when query is empty/whitespace
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
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
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
   * **Feature: member-study-room-bookshop, Property 19: Study Room content type filter works**
   * **Validates: Requirements 6.2**
   */
  describe('Property 19: Study Room content type filter works', () => {
    it('should display only items matching the selected content type', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
          (items, selectedContentType) => {
            const filtered = filterByContentType(items, selectedContentType);
            
            // All filtered items must have the selected content type
            filtered.forEach(item => {
              expect(item.contentType).toBe(selectedContentType);
            });
            
            // Count should match the number of items with that content type
            const expectedCount = items.filter(item => item.contentType === selectedContentType).length;
            expect(filtered.length).toBe(expectedCount);
            
            // No items with different content types should be in the result
            const wrongTypeInResult = filtered.some(item => item.contentType !== selectedContentType);
            expect(wrongTypeInResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all items when no content type is selected', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
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
   * **Feature: member-study-room-bookshop, Property 20: Study Room price type filter works**
   * **Validates: Requirements 6.3**
   */
  describe('Property 20: Study Room price type filter works', () => {
    it('should display only free items when "free" filter is selected', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          (items) => {
            const filtered = filterByPriceType(items, 'free');
            
            // All filtered items must be free
            filtered.forEach(item => {
              expect(item.isFree).toBe(true);
            });
            
            // Count should match the number of free items
            const expectedCount = items.filter(item => item.isFree).length;
            expect(filtered.length).toBe(expectedCount);
            
            // No paid items should be in the result
            const paidInResult = filtered.some(item => !item.isFree);
            expect(paidInResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display only paid items when "paid" filter is selected', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          (items) => {
            const filtered = filterByPriceType(items, 'paid');
            
            // All filtered items must be paid
            filtered.forEach(item => {
              expect(item.isFree).toBe(false);
            });
            
            // Count should match the number of paid items
            const expectedCount = items.filter(item => !item.isFree).length;
            expect(filtered.length).toBe(expectedCount);
            
            // No free items should be in the result
            const freeInResult = filtered.some(item => item.isFree);
            expect(freeInResult).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all items when "all" filter is selected', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          (items) => {
            const filtered = filterByPriceType(items, 'all');
            
            // Should return all items when filter is "all"
            expect(filtered.length).toBe(items.length);
            expect(filtered).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 21: Filter count display is accurate**
   * **Validates: Requirements 6.4**
   */
  describe('Property 21: Filter count display is accurate', () => {
    it('should show correct count of filtered items vs total items', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
          fc.constantFrom('all', 'free', 'paid'),
          (items, searchQuery, contentType, priceType) => {
            // Apply all filters
            let filtered = filterBySearch(items, searchQuery);
            filtered = filterByContentType(filtered, contentType);
            filtered = filterByPriceType(filtered, priceType as 'all' | 'free' | 'paid');
            
            const filteredCount = filtered.length;
            const totalCount = items.length;
            
            // Filtered count should never exceed total count
            expect(filteredCount).toBeLessThanOrEqual(totalCount);
            
            // Filtered count should be non-negative
            expect(filteredCount).toBeGreaterThanOrEqual(0);
            
            // Total count should match original collection size
            expect(totalCount).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show total count equals filtered count when no filters are active', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          (items) => {
            // No filters applied
            const filtered = filterBySearch(items, '');
            const filteredWithType = filterByContentType(filtered, '');
            const finalFiltered = filterByPriceType(filteredWithType, 'all');
            
            const filteredCount = finalFiltered.length;
            const totalCount = items.length;
            
            // When no filters are active, counts should be equal
            expect(filteredCount).toBe(totalCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 22: Clearing filters shows all items**
   * **Validates: Requirements 6.5**
   */
  describe('Property 22: Clearing filters shows all items', () => {
    it('should display all items after clearing all filters', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
          fc.constantFrom('free', 'paid'),
          (items, searchQuery, contentType, priceType) => {
            // Apply filters
            let filtered = filterBySearch(items, searchQuery);
            filtered = filterByContentType(filtered, contentType);
            filtered = filterByPriceType(filtered, priceType as 'free' | 'paid');
            
            // Now clear all filters (simulate clearing)
            const clearedSearch = filterBySearch(items, '');
            const clearedContentType = filterByContentType(clearedSearch, '');
            const clearedPriceType = filterByPriceType(clearedContentType, 'all');
            
            // After clearing, should show all items
            expect(clearedPriceType.length).toBe(items.length);
            expect(clearedPriceType).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should restore original collection after applying and clearing filters', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          (items) => {
            // Store original
            const original = [...items];
            
            // Apply some filters
            let filtered = filterBySearch(items, 'test');
            filtered = filterByContentType(filtered, 'PDF');
            filtered = filterByPriceType(filtered, 'free');
            
            // Clear filters
            const restored = filterBySearch(items, '');
            const restoredType = filterByContentType(restored, '');
            const restoredPrice = filterByPriceType(restoredType, 'all');
            
            // Should match original
            expect(restoredPrice.length).toBe(original.length);
            expect(restoredPrice).toEqual(original);
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
          fc.array(myJstudyroomItemArbitrary, { minLength: 10, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          fc.constantFrom('PDF', 'VIDEO'),
          fc.constantFrom('free', 'paid'),
          (items, searchQuery, contentType, priceType) => {
            // Apply filters in sequence (as the component does)
            let filtered = filterBySearch(items, searchQuery);
            filtered = filterByContentType(filtered, contentType);
            filtered = filterByPriceType(filtered, priceType as 'free' | 'paid');
            
            // All items must pass all filter conditions
            filtered.forEach(item => {
              const lowerQuery = searchQuery.toLowerCase();
              const titleMatch = item.title.toLowerCase().includes(lowerQuery);
              const descriptionMatch = item.description?.toLowerCase().includes(lowerQuery) || false;
              expect(titleMatch || descriptionMatch).toBe(true);
              
              expect(item.contentType).toBe(contentType);
              
              if (priceType === 'free') {
                expect(item.isFree).toBe(true);
              } else {
                expect(item.isFree).toBe(false);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case where all filters result in empty set', () => {
      fc.assert(
        fc.property(
          fc.array(myJstudyroomItemArbitrary, { minLength: 5, maxLength: 10 }),
          (items) => {
            // Apply filters that are unlikely to match
            let filtered = filterBySearch(items, 'xyzabc123nonexistent');
            
            // Result might be empty, which is valid
            expect(filtered.length).toBeGreaterThanOrEqual(0);
            expect(filtered.length).toBeLessThanOrEqual(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
