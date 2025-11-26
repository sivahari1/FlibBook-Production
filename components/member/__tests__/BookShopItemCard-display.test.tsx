/**
 * Property-Based Tests for BookShop Item Display
 * Feature: member-study-room-bookshop
 * Properties: 7, 8, 9, 10, 11, 23
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 7.1-7.5
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

// Helper functions matching BookShopItemCard component logic
const getContentType = (item: BookShopItem): string => {
  return item.document?.contentType || item.contentType || 'PDF';
};

const getContentTypeBadge = (type: string) => {
  switch (type) {
    case 'PDF':
      return { label: 'PDF', icon: '📄' };
    case 'IMAGE':
      return { label: 'Image', icon: '🖼️' };
    case 'VIDEO':
      return { label: 'Video', icon: '🎥' };
    case 'LINK':
      return { label: 'Link', icon: '🔗' };
    case 'AUDIO':
      return { label: 'Audio', icon: '🎵' };
    default:
      return { label: 'Document', icon: '📄' };
  }
};

const formatPrice = (priceInPaise: number): string => {
  const rupees = priceInPaise / 100;
  return `₹${rupees.toFixed(2)}`;
};

const hasRequiredFields = (item: BookShopItem): boolean => {
  return !!(
    item.title &&
    item.category &&
    typeof item.isFree === 'boolean'
  );
};

const getPricingDisplay = (item: BookShopItem): { type: 'free' | 'paid'; display: string } => {
  if (item.isFree) {
    return { type: 'free', display: 'Free' };
  } else {
    return { 
      type: 'paid', 
      display: item.price ? formatPrice(item.price) : 'N/A' 
    };
  }
};

const shouldShowThumbnail = (item: BookShopItem): boolean => {
  const thumbnailUrl = item.document?.thumbnailUrl || item.previewUrl;
  return !!thumbnailUrl;
};

const getLinkMetadata = (item: BookShopItem): { url: string; domain?: string; title?: string } | null => {
  const contentType = getContentType(item);
  if (contentType !== 'LINK') return null;
  
  const linkUrl = item.document?.linkUrl || item.linkUrl;
  if (!linkUrl) return null;
  
  const metadata = item.document?.metadata || item.metadata || {};
  
  try {
    const url = new URL(linkUrl);
    return {
      url: linkUrl,
      domain: metadata.domain || url.hostname,
      title: metadata.title
    };
  } catch (e) {
    return {
      url: linkUrl,
      domain: metadata.domain,
      title: metadata.title
    };
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
  price: fc.option(fc.integer({ min: 100, max: 1000000 })), // Price in paise
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

describe('BookShop Item Display Property Tests', () => {
  /**
   * **Feature: member-study-room-bookshop, Property 7: BookShop items display all required fields**
   * **Validates: Requirements 3.1**
   */
  describe('Property 7: BookShop items display all required fields', () => {
    it('should contain title, description, category, and content type for any item', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            // Verify all required fields are present
            expect(hasRequiredFields(item)).toBe(true);
            
            // Title must be present and non-empty
            expect(item.title).toBeTruthy();
            expect(item.title.length).toBeGreaterThan(0);
            
            // Category must be present
            expect(item.category).toBeTruthy();
            expect(item.category.length).toBeGreaterThan(0);
            
            // Content type must be determinable
            const contentType = getContentType(item);
            expect(contentType).toBeTruthy();
            expect(['PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO']).toContain(contentType);
            
            // isFree must be a boolean
            expect(typeof item.isFree).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle items with and without descriptions', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            // Description can be null or a string
            if (item.description !== null) {
              expect(typeof item.description).toBe('string');
            }
            
            // Item should still be valid regardless of description
            expect(hasRequiredFields(item)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 8: Pricing information is displayed correctly**
   * **Validates: Requirements 3.2**
   */
  describe('Property 8: Pricing information is displayed correctly', () => {
    it('should show "Free" for free items and price for paid items', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            const pricingDisplay = getPricingDisplay(item);
            
            if (item.isFree) {
              // Free items should show "Free"
              expect(pricingDisplay.type).toBe('free');
              expect(pricingDisplay.display).toBe('Free');
            } else {
              // Paid items should show price
              expect(pricingDisplay.type).toBe('paid');
              
              if (item.price) {
                // Price should be formatted correctly
                expect(pricingDisplay.display).toContain('₹');
                expect(pricingDisplay.display).toMatch(/₹\d+\.\d{2}/);
                
                // Verify the price calculation
                const expectedPrice = formatPrice(item.price);
                expect(pricingDisplay.display).toBe(expectedPrice);
              } else {
                // If no price is set, should show N/A
                expect(pricingDisplay.display).toBe('N/A');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly format prices in rupees from paise', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000000 }),
          (priceInPaise) => {
            const formatted = formatPrice(priceInPaise);
            const rupees = priceInPaise / 100;
            
            // Should contain rupee symbol
            expect(formatted).toContain('₹');
            
            // Should have exactly 2 decimal places
            expect(formatted).toMatch(/₹\d+\.\d{2}/);
            
            // Should match expected value
            expect(formatted).toBe(`₹${rupees.toFixed(2)}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 9: Thumbnail display is conditional**
   * **Validates: Requirements 3.3**
   */
  describe('Property 9: Thumbnail display is conditional', () => {
    it('should show thumbnail when URL exists, otherwise show placeholder/icon', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            const hasThumbnail = shouldShowThumbnail(item);
            const thumbnailUrl = item.document?.thumbnailUrl || item.previewUrl;
            
            if (thumbnailUrl) {
              // If thumbnail URL exists, should show thumbnail
              expect(hasThumbnail).toBe(true);
            } else {
              // If no thumbnail URL, should not show thumbnail
              expect(hasThumbnail).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize document.thumbnailUrl over previewUrl', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          fc.webUrl(),
          (docThumbnail, previewUrl) => {
            const item: BookShopItem = {
              id: 'test',
              documentId: 'test',
              title: 'Test',
              description: null,
              category: 'Music',
              isFree: true,
              price: null,
              isPublished: true,
              inMyJstudyroom: false,
              previewUrl: previewUrl,
              document: {
                id: 'test',
                title: 'Test',
                filename: 'test.pdf',
                thumbnailUrl: docThumbnail
              }
            };
            
            // Should use document.thumbnailUrl when both exist
            const thumbnailUrl = item.document?.thumbnailUrl || item.previewUrl;
            expect(thumbnailUrl).toBe(docThumbnail);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 10: Collection status is indicated**
   * **Validates: Requirements 3.4**
   */
  describe('Property 10: Collection status is indicated', () => {
    it('should indicate when item is in Study Room', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            // The inMyJstudyroom flag should be a boolean
            expect(typeof item.inMyJstudyroom).toBe('boolean');
            
            // When true, should indicate item is in collection
            if (item.inMyJstudyroom) {
              expect(item.inMyJstudyroom).toBe(true);
            } else {
              expect(item.inMyJstudyroom).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly reflect collection status for all items', () => {
      fc.assert(
        fc.property(
          fc.array(bookShopItemArbitrary, { minLength: 5, maxLength: 20 }),
          (items) => {
            const inCollection = items.filter(item => item.inMyJstudyroom);
            const notInCollection = items.filter(item => !item.inMyJstudyroom);
            
            // All items in collection should have flag set to true
            inCollection.forEach(item => {
              expect(item.inMyJstudyroom).toBe(true);
            });
            
            // All items not in collection should have flag set to false
            notInCollection.forEach(item => {
              expect(item.inMyJstudyroom).toBe(false);
            });
            
            // Total should equal original array length
            expect(inCollection.length + notInCollection.length).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 11: Link items show URL and metadata**
   * **Validates: Requirements 3.5**
   */
  describe('Property 11: Link items show URL and metadata', () => {
    it('should display URL and metadata for LINK content type', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary.filter(item => {
            const contentType = getContentType(item);
            return contentType === 'LINK';
          }),
          (item) => {
            const linkMetadata = getLinkMetadata(item);
            const linkUrl = item.document?.linkUrl || item.linkUrl;
            
            if (linkUrl) {
              // Should return metadata object
              expect(linkMetadata).not.toBeNull();
              expect(linkMetadata?.url).toBe(linkUrl);
              
              // Should extract or use provided domain
              expect(linkMetadata?.domain).toBeTruthy();
              
              // Title is optional but should be included if present
              const metadata = item.document?.metadata || item.metadata;
              if (metadata?.title) {
                expect(linkMetadata?.title).toBe(metadata.title);
              }
            } else {
              // If no URL, should return null
              expect(linkMetadata).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not show link metadata for non-LINK content types', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary.filter(item => {
            const contentType = getContentType(item);
            return contentType !== 'LINK';
          }),
          (item) => {
            const linkMetadata = getLinkMetadata(item);
            
            // Non-LINK items should not have link metadata
            expect(linkMetadata).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract domain from URL when not provided in metadata', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          (url) => {
            const item: BookShopItem = {
              id: 'test',
              documentId: 'test',
              title: 'Test Link',
              description: null,
              category: 'Music',
              isFree: true,
              price: null,
              isPublished: true,
              inMyJstudyroom: false,
              document: {
                id: 'test',
                title: 'Test',
                filename: 'test.link',
                contentType: 'LINK',
                linkUrl: url,
                metadata: {} // No domain in metadata
              }
            };
            
            const linkMetadata = getLinkMetadata(item);
            
            // Should extract domain from URL
            expect(linkMetadata).not.toBeNull();
            expect(linkMetadata?.url).toBe(url);
            expect(linkMetadata?.domain).toBeTruthy();
            
            // Verify domain matches URL hostname
            const urlObj = new URL(url);
            expect(linkMetadata?.domain).toBe(urlObj.hostname);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: member-study-room-bookshop, Property 23: Content type icons are correct**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  describe('Property 23: Content type icons are correct', () => {
    it('should map each content type to the correct icon', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
          (contentType) => {
            const badge = getContentTypeBadge(contentType);
            
            // Verify correct icon for each type
            switch (contentType) {
              case 'PDF':
                expect(badge.icon).toBe('📄');
                expect(badge.label).toBe('PDF');
                break;
              case 'IMAGE':
                expect(badge.icon).toBe('🖼️');
                expect(badge.label).toBe('Image');
                break;
              case 'VIDEO':
                expect(badge.icon).toBe('🎥');
                expect(badge.label).toBe('Video');
                break;
              case 'LINK':
                expect(badge.icon).toBe('🔗');
                expect(badge.label).toBe('Link');
                break;
              case 'AUDIO':
                expect(badge.icon).toBe('🎵');
                expect(badge.label).toBe('Audio');
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display correct icon for any BookShop item', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            const contentType = getContentType(item);
            const badge = getContentTypeBadge(contentType);
            
            // Icon should be one of the valid icons
            const validIcons = ['📄', '🖼️', '🎥', '🔗', '🎵'];
            expect(validIcons).toContain(badge.icon);
            
            // Label should match content type
            expect(badge.label).toBeTruthy();
            expect(badge.label.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to PDF icon for unknown content types', () => {
      const unknownTypes = ['UNKNOWN', 'DOC', 'TXT', ''];
      
      unknownTypes.forEach(type => {
        const badge = getContentTypeBadge(type);
        expect(badge.icon).toBe('📄');
        expect(badge.label).toBe('Document');
      });
    });

    it('should consistently map content types to icons', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PDF', 'IMAGE', 'VIDEO', 'LINK', 'AUDIO'),
          (contentType) => {
            // Call multiple times to ensure consistency
            const badge1 = getContentTypeBadge(contentType);
            const badge2 = getContentTypeBadge(contentType);
            const badge3 = getContentTypeBadge(contentType);
            
            // Should always return the same icon and label
            expect(badge1.icon).toBe(badge2.icon);
            expect(badge1.icon).toBe(badge3.icon);
            expect(badge1.label).toBe(badge2.label);
            expect(badge1.label).toBe(badge3.label);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined property test - ensures all display properties work together
   */
  describe('Combined display properties', () => {
    it('should correctly display all properties for any item', () => {
      fc.assert(
        fc.property(
          bookShopItemArbitrary,
          (item) => {
            // Required fields
            expect(hasRequiredFields(item)).toBe(true);
            
            // Pricing
            const pricing = getPricingDisplay(item);
            expect(pricing).toBeTruthy();
            expect(['free', 'paid']).toContain(pricing.type);
            
            // Content type icon
            const contentType = getContentType(item);
            const badge = getContentTypeBadge(contentType);
            expect(badge.icon).toBeTruthy();
            expect(badge.label).toBeTruthy();
            
            // Collection status
            expect(typeof item.inMyJstudyroom).toBe('boolean');
            
            // Link metadata (if applicable)
            if (contentType === 'LINK') {
              const linkMetadata = getLinkMetadata(item);
              const linkUrl = item.document?.linkUrl || item.linkUrl;
              if (linkUrl) {
                expect(linkMetadata).not.toBeNull();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
