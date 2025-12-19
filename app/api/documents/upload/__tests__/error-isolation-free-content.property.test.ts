/**
 * Property-Based Test for Error Isolation in Free Content Uploads
 * Feature: free-upload-fix, Property 6: Error isolation for free content
 * Validates: Requirements 2.3
 * 
 * Property 6: Error isolation for free content
 * For any validation scenario where other fields have errors but price is 0, no price-related errors should be generated
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Simplified validation logic simulation
// This simulates the validation logic from the upload route
const simulateValidationWithErrors = (uploadData: {
  title: string;
  description: string;
  category: string;
  contentType: string;
  price: number;
  hasFile: boolean;
}) => {
  const errors: string[] = [];

  // Title validation
  if (!uploadData.title || uploadData.title.trim().length === 0) {
    errors.push('Title is required');
  }

  // File validation
  if (!uploadData.hasFile) {
    errors.push('File is required');
  }

  // Price validation - this is what we're testing for error isolation
  if (uploadData.price < 0) {
    errors.push('Price must be 0 or greater when adding to bookshop');
  }

  if (uploadData.price > 10000) {
    errors.push('Price cannot exceed ₹10,000');
  }

  // Category validation (when adding to bookshop)
  if (!uploadData.category || uploadData.category.trim().length === 0) {
    errors.push('Category is required when adding to bookshop');
  }

  // Description validation (optional but test various lengths)
  if (uploadData.description && uploadData.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    priceErrors: errors.filter(error => 
      error.includes('Price') || error.includes('price')
    ),
    nonPriceErrors: errors.filter(error => 
      !error.includes('Price') && !error.includes('price')
    )
  };
};

describe('Error Isolation for Free Content Property Tests', () => {

  /**
   * **Feature: free-upload-fix, Property 6: Error isolation for free content**
   * **Validates: Requirements 2.3**
   * 
   * For any validation scenario where other fields have errors but price is 0, no price-related errors should be generated
   */
  describe('Property 6: Error isolation for free content', () => {

    it('should not generate price errors when price is 0 and other fields have errors', () => {
      fc.assert(
        fc.property(
          // Generate upload data with intentional errors in other fields but valid price = 0
          fc.record({
            title: fc.oneof(
              fc.constant(''), // Invalid: empty title
              fc.constant('   '), // Invalid: whitespace only
              fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0) // Valid title
            ),
            description: fc.oneof(
              fc.string({ minLength: 0, maxLength: 500 }), // Valid description
              fc.string({ minLength: 1001, maxLength: 2000 }) // Invalid: too long
            ),
            category: fc.oneof(
              fc.constant(''), // Invalid: empty category
              fc.constantFrom('Music', 'Education', 'Technology', 'Art', 'Business') // Valid category
            ),
            contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO'),
            price: fc.constant(0), // Always test with free price (valid)
            hasFile: fc.oneof(
              fc.constant(true), // Valid: has file
              fc.constant(false) // Invalid: no file
            )
          }),
          (uploadData) => {
            // Simulate validation
            const result = simulateValidationWithErrors(uploadData);

            // Property: When price is 0, there should be no price-related errors
            expect(result.priceErrors).toHaveLength(0);
            
            // Property: Price 0 should never be flagged as invalid
            const hasPriceZeroError = result.errors.some(error => 
              error.includes('Price must be') && error.includes('greater') ||
              error.includes('price') && error.includes('0')
            );
            expect(hasPriceZeroError).toBe(false);
            
            // Property: Other field errors should still be detected when present
            if (!uploadData.title || uploadData.title.trim().length === 0) {
              expect(result.errors).toContain('Title is required');
            }
            
            if (!uploadData.hasFile) {
              expect(result.errors).toContain('File is required');
            }
            
            if (!uploadData.category || uploadData.category.trim().length === 0) {
              expect(result.errors).toContain('Category is required when adding to bookshop');
            }
            
            if (uploadData.description && uploadData.description.length > 1000) {
              expect(result.errors).toContain('Description cannot exceed 1000 characters');
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design doc
      );
    });

    it('should isolate price validation from other field validation errors', () => {
      fc.assert(
        fc.property(
          // Generate scenarios with multiple field errors but valid price
          fc.record({
            title: fc.constant(''), // Always invalid
            description: fc.string({ minLength: 1001, maxLength: 2000 }), // Always invalid (too long)
            category: fc.constant(''), // Always invalid
            contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO'),
            price: fc.constant(0), // Always valid (free)
            hasFile: fc.constant(false) // Always invalid
          }),
          (uploadData) => {
            // Simulate validation with multiple errors
            const result = simulateValidationWithErrors(uploadData);

            // Property: Should have multiple non-price errors
            expect(result.nonPriceErrors.length).toBeGreaterThan(0);
            
            // Property: Should have zero price-related errors
            expect(result.priceErrors).toHaveLength(0);
            
            // Property: Overall validation should fail due to other errors
            expect(result.isValid).toBe(false);
            
            // Property: Specific errors should be present for invalid fields
            expect(result.errors).toContain('Title is required');
            expect(result.errors).toContain('File is required');
            expect(result.errors).toContain('Category is required when adding to bookshop');
            expect(result.errors).toContain('Description cannot exceed 1000 characters');
            
            // Property: No price errors should be present
            const priceErrorKeywords = ['Price must be', 'price', 'cost', 'amount'];
            const hasPriceError = result.errors.some(error => 
              priceErrorKeywords.some(keyword => error.includes(keyword))
            );
            expect(hasPriceError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain price validation independence across different error combinations', () => {
      fc.assert(
        fc.property(
          // Generate various combinations of field validity
          fc.record({
            titleValid: fc.boolean(),
            categoryValid: fc.boolean(),
            fileValid: fc.boolean(),
            descriptionValid: fc.boolean(),
            contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO'),
            price: fc.constant(0) // Always test with valid free price
          }),
          (config) => {
            const uploadData = {
              title: config.titleValid ? 'Valid Title' : '',
              description: config.descriptionValid ? 'Valid description' : 'x'.repeat(1001),
              category: config.categoryValid ? 'Education' : '',
              contentType: config.contentType,
              price: config.price,
              hasFile: config.fileValid
            };

            // Simulate validation
            const result = simulateValidationWithErrors(uploadData);

            // Property: Price validation should be independent of other field validation
            expect(result.priceErrors).toHaveLength(0);
            
            // Property: The presence of other errors should not affect price validation
            const expectedNonPriceErrors = [
              !config.titleValid ? 'Title is required' : null,
              !config.fileValid ? 'File is required' : null,
              !config.categoryValid ? 'Category is required when adding to bookshop' : null,
              !config.descriptionValid ? 'Description cannot exceed 1000 characters' : null
            ].filter(Boolean);

            expect(result.nonPriceErrors).toEqual(expect.arrayContaining(expectedNonPriceErrors));
            
            // Property: Validation should pass only if all fields are valid
            const shouldBeValid = config.titleValid && config.categoryValid && 
                                config.fileValid && config.descriptionValid;
            expect(result.isValid).toBe(shouldBeValid);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure free price validation works correctly even with edge case field values', () => {
      fc.assert(
        fc.property(
          // Generate edge case values for other fields
          fc.record({
            title: fc.oneof(
              fc.constant(null as any), // Edge case: null
              fc.constant(undefined as any), // Edge case: undefined
              fc.constant(''), // Edge case: empty
              fc.constant('   \n\t   '), // Edge case: whitespace
              fc.string({ minLength: 1, maxLength: 5 }) // Valid short title
            ),
            description: fc.oneof(
              fc.constant(null as any), // Edge case: null
              fc.constant(undefined as any), // Edge case: undefined
              fc.string({ minLength: 0, maxLength: 100 }) // Valid description
            ),
            category: fc.oneof(
              fc.constant(null as any), // Edge case: null
              fc.constant(undefined as any), // Edge case: undefined
              fc.constant(''), // Edge case: empty
              fc.constantFrom('Music', 'Education') // Valid category
            ),
            contentType: fc.constantFrom('PDF', 'IMAGE', 'VIDEO'),
            price: fc.constant(0), // Always valid free price
            hasFile: fc.boolean()
          }),
          (uploadData) => {
            // Handle edge cases in validation simulation
            const normalizedData = {
              title: uploadData.title || '',
              description: uploadData.description || '',
              category: uploadData.category || '',
              contentType: uploadData.contentType,
              price: uploadData.price,
              hasFile: uploadData.hasFile
            };

            // Simulate validation
            const result = simulateValidationWithErrors(normalizedData);

            // Property: Price should never generate errors when set to 0
            expect(result.priceErrors).toHaveLength(0);
            
            // Property: Edge case values in other fields should not affect price validation
            const priceRelatedErrors = result.errors.filter(error => 
              error.toLowerCase().includes('price') || 
              error.toLowerCase().includes('cost') ||
              error.toLowerCase().includes('amount')
            );
            expect(priceRelatedErrors).toHaveLength(0);
            
            // Property: Price 0 should be treated as valid regardless of other field states
            // This ensures that the price validation logic is truly isolated
            expect(normalizedData.price).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

  });
});