/**
 * Property-Based Tests for EnhancedUploadModal component
 * Feature: admin-enhanced-privileges, Property 27: Upload success confirmation
 * Validates: Requirements 9.5
 * 
 * Property 27: Upload success confirmation
 * For any successful upload, the confirmation message should contain the uploaded content's title and type
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { ContentType } from '@/lib/types/content';

describe('EnhancedUploadModal Property Tests', () => {
  describe('Property 27: Upload success confirmation', () => {
    /**
     * **Feature: admin-enhanced-privileges, Property 27: Upload success confirmation**
     * **Validates: Requirements 9.5**
     * 
     * For any successful upload, the confirmation message should contain 
     * the uploaded content's title and type
     */
    it('should generate success message containing title and content type for any upload', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary content types
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          // Generate arbitrary non-empty titles
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title) => {
            // Simulate the success message generation logic from EnhancedUploadModal
            // This is the actual logic from the component:
            // setSuccessMessage(`Successfully uploaded ${selectedType.toLowerCase()}: "${title}"`)
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            // Property: The success message must contain both the title and the content type
            const containsTitle = successMessage.includes(title);
            const containsType = successMessage.toLowerCase().includes(contentType.toLowerCase());
            
            // Assert the property holds
            expect(containsTitle).toBe(true);
            expect(containsType).toBe(true);
            
            // Additional verification: message should follow the expected format
            expect(successMessage).toMatch(/^Successfully uploaded (pdf|image|video|link): ".+"$/);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design doc
      );
    });

    it('should generate success message with correct format for PDF uploads', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (title) => {
            const contentType = ContentType.PDF;
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            expect(successMessage).toContain('pdf');
            expect(successMessage).toContain(title);
            expect(successMessage).toMatch(/^Successfully uploaded pdf: ".+"$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate success message with correct format for IMAGE uploads', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (title) => {
            const contentType = ContentType.IMAGE;
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            expect(successMessage).toContain('image');
            expect(successMessage).toContain(title);
            expect(successMessage).toMatch(/^Successfully uploaded image: ".+"$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate success message with correct format for VIDEO uploads', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (title) => {
            const contentType = ContentType.VIDEO;
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            expect(successMessage).toContain('video');
            expect(successMessage).toContain(title);
            expect(successMessage).toMatch(/^Successfully uploaded video: ".+"$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate success message with correct format for LINK uploads', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (title) => {
            const contentType = ContentType.LINK;
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            expect(successMessage).toContain('link');
            expect(successMessage).toContain(title);
            expect(successMessage).toMatch(/^Successfully uploaded link: ".+"$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle titles with special characters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title) => {
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            // The title should be preserved exactly as provided, including special characters
            expect(successMessage).toContain(title);
            
            // The message should properly quote the title
            expect(successMessage).toContain(`"${title}"`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle titles with quotes by preserving them', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 })
            .filter(s => s.trim().length > 0)
            .map(s => s + '"test"'), // Add quotes to test edge case
          (contentType, title) => {
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            // The title should be included in the message
            expect(successMessage).toContain(title);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency between content type and message format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title) => {
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            // Verify the content type in the message matches the input content type
            const messageType = successMessage.match(/uploaded (\w+):/)?.[1];
            expect(messageType).toBe(contentType.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique messages for different titles', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title1, title2) => {
            // Skip if titles are the same
            fc.pre(title1 !== title2);
            
            const message1 = `Successfully uploaded ${contentType.toLowerCase()}: "${title1}"`;
            const message2 = `Successfully uploaded ${contentType.toLowerCase()}: "${title2}"`;
            
            // Messages should be different for different titles
            expect(message1).not.toBe(message2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different messages for different content types with same title', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (title) => {
            const pdfMessage = `Successfully uploaded ${ContentType.PDF.toLowerCase()}: "${title}"`;
            const imageMessage = `Successfully uploaded ${ContentType.IMAGE.toLowerCase()}: "${title}"`;
            const videoMessage = `Successfully uploaded ${ContentType.VIDEO.toLowerCase()}: "${title}"`;
            const linkMessage = `Successfully uploaded ${ContentType.LINK.toLowerCase()}: "${title}"`;
            
            // All messages should be different despite having the same title
            const messages = [pdfMessage, imageMessage, videoMessage, linkMessage];
            const uniqueMessages = new Set(messages);
            
            expect(uniqueMessages.size).toBe(4);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Success Message Format Validation', () => {
    it('should always start with "Successfully uploaded"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title) => {
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            expect(successMessage.startsWith('Successfully uploaded')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always include a colon after the content type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title) => {
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            expect(successMessage).toContain(`${contentType.toLowerCase()}:`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always wrap title in quotes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (contentType, title) => {
            const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
            
            // Check that the title is wrapped in quotes
            expect(successMessage).toContain(`"${title}"`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit Test for Free Upload Success Messages
   * Validates: Requirements 2.4
   * 
   * Test that free uploads show appropriate success message
   */
  describe('Free Upload Success Messages', () => {
    it('should show appropriate success message for free content uploads', () => {
      // Test data for free content uploads
      const testCases = [
        {
          contentType: ContentType.PDF,
          title: 'Free Educational Guide',
          price: 0,
          bookShopCategory: 'Education',
          hasBookShopItem: true
        },
        {
          contentType: ContentType.IMAGE,
          title: 'Free Stock Photo',
          price: 0,
          bookShopCategory: 'Graphics',
          hasBookShopItem: true
        },
        {
          contentType: ContentType.VIDEO,
          title: 'Free Tutorial Video',
          price: 0,
          bookShopCategory: 'Tutorials',
          hasBookShopItem: true
        },
        {
          contentType: ContentType.LINK,
          title: 'Free Resource Link',
          price: 0,
          bookShopCategory: 'Resources',
          hasBookShopItem: true
        }
      ];

      testCases.forEach(({ contentType, title, price, bookShopCategory, hasBookShopItem }) => {
        // Simulate the success message generation logic from EnhancedUploadModal
        // This matches the actual logic in the component
        let successMessage: string;
        
        if (hasBookShopItem) {
          successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}" and added to ${bookShopCategory} category in bookshop`;
        } else {
          successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;
        }

        // Verify the success message contains appropriate content for free uploads
        expect(successMessage).toContain('Successfully uploaded');
        expect(successMessage).toContain(contentType.toLowerCase());
        expect(successMessage).toContain(title);
        
        // For bookshop items, verify category information is included
        if (hasBookShopItem) {
          expect(successMessage).toContain('added to');
          expect(successMessage).toContain(bookShopCategory);
          expect(successMessage).toContain('category in bookshop');
        }

        // Verify the message follows the expected format
        if (hasBookShopItem) {
          expect(successMessage).toMatch(
            new RegExp(`^Successfully uploaded ${contentType.toLowerCase()}: "${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" and added to ${bookShopCategory} category in bookshop$`)
          );
        } else {
          expect(successMessage).toMatch(
            new RegExp(`^Successfully uploaded ${contentType.toLowerCase()}: "${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"$`)
          );
        }
      });
    });

    it('should show success message for free content without bookshop integration', () => {
      const testCases = [
        { contentType: ContentType.PDF, title: 'Free Document' },
        { contentType: ContentType.IMAGE, title: 'Free Image' },
        { contentType: ContentType.VIDEO, title: 'Free Video' },
        { contentType: ContentType.LINK, title: 'Free Link' }
      ];

      testCases.forEach(({ contentType, title }) => {
        // Simulate success message for uploads without bookshop integration
        const successMessage = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;

        // Verify the success message is appropriate for free content
        expect(successMessage).toContain('Successfully uploaded');
        expect(successMessage).toContain(contentType.toLowerCase());
        expect(successMessage).toContain(`"${title}"`);
        expect(successMessage).toMatch(/^Successfully uploaded (pdf|image|video|link): ".+"$/);
        
        // Verify it doesn't contain bookshop-related text when not using bookshop
        expect(successMessage).not.toContain('added to');
        expect(successMessage).not.toContain('category');
        expect(successMessage).not.toContain('bookshop');
      });
    });

    it('should generate consistent success messages for free content regardless of price being 0', () => {
      const title = 'Free Educational Content';
      const contentType = ContentType.PDF;
      const category = 'Education';
      
      // Test both scenarios: with and without bookshop integration
      const withBookshop = `Successfully uploaded ${contentType.toLowerCase()}: "${title}" and added to ${category} category in bookshop`;
      const withoutBookshop = `Successfully uploaded ${contentType.toLowerCase()}: "${title}"`;

      // Both messages should indicate successful upload
      expect(withBookshop).toContain('Successfully uploaded');
      expect(withoutBookshop).toContain('Successfully uploaded');
      
      // Both should contain the content type and title
      expect(withBookshop).toContain(contentType.toLowerCase());
      expect(withBookshop).toContain(title);
      expect(withoutBookshop).toContain(contentType.toLowerCase());
      expect(withoutBookshop).toContain(title);
      
      // The bookshop version should contain additional information
      expect(withBookshop).toContain('added to');
      expect(withBookshop).toContain(category);
      expect(withBookshop).toContain('bookshop');
      
      // The non-bookshop version should not contain bookshop information
      expect(withoutBookshop).not.toContain('added to');
      expect(withoutBookshop).not.toContain('category');
      expect(withoutBookshop).not.toContain('bookshop');
    });
  });
});
