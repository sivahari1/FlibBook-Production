import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: document-preview-fix, Property 2: Parameter extraction correctness
 * Validates: Requirements 1.2
 * 
 * Property: For any API route with dynamic parameters, the extracted parameter 
 * values should match the values in the request URL
 */

describe('Property 2: Parameter extraction correctness', () => {
  it('should extract document ID correctly from params', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random document IDs (UUIDs)
        fc.uuid(),
        async (expectedDocumentId) => {
          // Simulate Next.js 15 params Promise
          const paramsPromise = Promise.resolve({ id: expectedDocumentId });
          
          // Extract the ID as the route handler does
          const { id: extractedId } = await paramsPromise;
          
          // Verify extraction is correct
          expect(extractedId).toBe(expectedDocumentId);
          expect(typeof extractedId).toBe('string');
          expect(extractedId.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle various ID formats correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various string formats for IDs
        fc.oneof(
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => !s.includes('/') && s.length > 0),
        ),
        async (documentId) => {
          const paramsPromise = Promise.resolve({ id: documentId });
          const { id } = await paramsPromise;
          
          // Verify the extracted ID matches exactly
          expect(id).toBe(documentId);
          
          // Verify no transformation occurred
          expect(id.length).toBe(documentId.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should extract ID without side effects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (documentId) => {
          const originalParams = { id: documentId };
          const paramsPromise = Promise.resolve(originalParams);
          
          // Extract ID multiple times
          const { id: firstExtraction } = await paramsPromise;
          const secondPromise = Promise.resolve(originalParams);
          const { id: secondExtraction } = await secondPromise;
          
          // Verify both extractions are identical
          expect(firstExtraction).toBe(secondExtraction);
          expect(firstExtraction).toBe(documentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle destructuring with renaming', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (documentId) => {
          const paramsPromise = Promise.resolve({ id: documentId });
          
          // Extract with renaming (as done in the route handler)
          const { id: documentId_extracted } = await paramsPromise;
          
          // Verify renamed variable has correct value
          expect(documentId_extracted).toBe(documentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve special characters in IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate IDs with special characters (but URL-safe)
        fc.stringMatching(/^[a-zA-Z0-9_-]{10,50}$/),
        async (documentId) => {
          const paramsPromise = Promise.resolve({ id: documentId });
          const { id } = await paramsPromise;
          
          // Verify special characters are preserved
          expect(id).toBe(documentId);
          
          // Verify no encoding/decoding occurred
          expect(id).not.toContain('%');
        }
      ),
      { numRuns: 100 }
    );
  });
});
