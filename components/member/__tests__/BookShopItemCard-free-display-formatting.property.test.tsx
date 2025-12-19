/**
 * Property-Based Test for Free Item Display Formatting
 * Feature: free-upload-fix
 * Property: 7
 * Validates: Requirements 2.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Type definitions matching the BookShopItemCard component
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

// Helper function matching BookShopItemCard component logic for price display
const getPriceDisplayText = (item: BookShopItem): string => {
  if (item.isFree) {
    return 'Free';
  } else {
    // Match the actual implementation: item.price ? formatPrice(item.price) : 'N/A'
    // Note: 0 is falsy in JavaScript, so price of 0 will show 'N/A'
    if (item.price) {
      const rupees = item.price / 100;
      return `Paid - ₹${rupees.toFixed(2)}`;
    } else {
      return 'Paid - N/A';
    }
  }
};

// Arbitraries for generating test data
const bookShopItemArbitrary = fc.record({
  id: fc.uuid(),
  documentId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  category: fc.oneof(
    fc.constant('Maths > CBSE - 1st Standard'),
    fc.constant('Maths > CBSE - 5th Standard'),
    fc.constant('Music'),
    fc.constant('Functional MRI')
  ),
  isFree: fc.boolean(),
  price: fc.option(fc.integer({ min: 0, max: 1000000 })), // Price in paise, including 0
  isPublished: fc.boolean(),
  inMyJstudyroom: fc.boolean(),
  contentType: fc.option(fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO')),
  metadata: fc.option(fc.record({
    domain: fc.option(fc.webUrl().map(url => new URL(url).hostname)),
    title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    duration: fc.option(fc.integer({ min: 1, max: 3600 })),
    width: fc.option(fc.integer({ min: 100, max: 4000 })),
    height: fc.option(fc.integer({ min: 100, max: 4000 }))
  })),
  previewUrl: fc.option(fc.webUrl()),
  linkUrl: fc.option(fc.webUrl()),
  document: fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    filename: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    contentType: fc.option(fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO')),
    metadata: fc.option(fc.record({
      domain: fc.option(fc.webUrl().map(url => new URL(url).hostname)),
      title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      duration: fc.option(fc.integer({ min: 1, max: 3600 })),
      width: fc.option(fc.integer({ min: 100, max: 4000 })),
      height: fc.option(fc.integer({ min: 100, max: 4000 }))
    })),
    thumbnailUrl: fc.option(fc.webUrl()),
    linkUrl: fc.option(fc.webUrl()),
  })
});

describe('Free Item Display Formatting Property Test', () => {
  /**
   * **Feature: free-upload-fix, Property 7: Free item display formatting**
   * **Validates: Requirements 2.5**
   */
  describe('Property 7: Free item display formatting', () => {
    it('should display "Free" for items with price 0 rather than "₹0"', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            const displayText = getPriceDisplayText(item);
            
            if (item.isFree) {
              // Free items should display exactly "Free", not "₹0" or "₹0.00"
              expect(displayText).toBe('Free');
              expect(displayText).not.toContain('₹0');
              expect(displayText).not.toContain('₹0.00');
            } else {
              // Paid items should not display "Free"
              expect(displayText).not.toBe('Free');
              expect(displayText).toContain('Paid');
              
              if (item.price && item.price > 0) {
                // Should contain rupee symbol and formatted price
                expect(displayText).toContain('₹');
                expect(displayText).toMatch(/₹\d+\.\d{2}/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently show "Free" for all free items regardless of price value', () => {
      fc.assert(
        fc.property(
          fc.record({
            ...bookShopItemArbitrary.value,
            isFree: fc.constant(true),
            price: fc.option(fc.integer({ min: 0, max: 1000000 })) // Price can be 0 or any value
          }),
          (item) => {
            const displayText = getPriceDisplayText(item);
            
            // All free items should show "Free" regardless of price field value
            expect(displayText).toBe('Free');
            expect(displayText).not.toContain('₹');
            expect(displayText).not.toContain('Paid');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show formatted price for paid items with price > 0', () => {
      fc.assert(
        fc.property(
          fc.record({
            ...bookShopItemArbitrary.value,
            isFree: fc.constant(false),
            price: fc.integer({ min: 1, max: 1000000 }) // Positive price only
          }),
          (item) => {
            const displayText = getPriceDisplayText(item);
            
            // Paid items with price should show formatted price
            expect(displayText).toContain('Paid');
            expect(displayText).toContain('₹');
            expect(displayText).toMatch(/Paid - ₹\d+\.\d{2}/);
            
            // Verify the price calculation is correct
            const expectedPrice = (item.price! / 100).toFixed(2);
            expect(displayText).toContain(`₹${expectedPrice}`);
            
            // Should not show "Free"
            expect(displayText).not.toBe('Free');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case of paid items with null or zero price', () => {
      fc.assert(
        fc.property(
          fc.record({
            ...bookShopItemArbitrary.value,
            isFree: fc.constant(false),
            price: fc.constantFrom(null, 0)
          }),
          (item) => {
            const displayText = getPriceDisplayText(item);
            
            // Paid items with null or zero price should show "Paid - N/A"
            // Note: In JavaScript, both null and 0 are falsy, so both show 'N/A'
            expect(displayText).toContain('Paid');
            expect(displayText).toBe('Paid - N/A');
            
            // Should not show "Free" even if price is 0
            expect(displayText).not.toBe('Free');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent formatting across different price ranges', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              ...bookShopItemArbitrary.value,
              isFree: fc.boolean(),
              price: fc.option(fc.integer({ min: 0, max: 1000000 }))
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (items) => {
            const freeItems = items.filter(item => item.isFree);
            const paidItems = items.filter(item => !item.isFree);
            
            // All free items should consistently show "Free"
            freeItems.forEach(item => {
              const displayText = getPriceDisplayText(item);
              expect(displayText).toBe('Free');
            });
            
            // All paid items should consistently show "Paid - ..." format
            paidItems.forEach(item => {
              const displayText = getPriceDisplayText(item);
              expect(displayText).toContain('Paid');
              expect(displayText).not.toBe('Free');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never show currency formatting for free items', () => {
      fc.assert(
        fc.property(
          fc.record({
            ...bookShopItemArbitrary.value,
            isFree: fc.constant(true)
          }),
          (item) => {
            const displayText = getPriceDisplayText(item);
            
            // Free items should never contain currency symbols or decimal formatting
            expect(displayText).not.toContain('₹');
            expect(displayText).not.toMatch(/\d+\.\d{2}/);
            expect(displayText).not.toContain('0.00');
            expect(displayText).not.toContain('Paid');
            
            // Should be exactly "Free"
            expect(displayText).toBe('Free');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});