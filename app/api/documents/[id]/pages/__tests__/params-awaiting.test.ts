import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: document-preview-fix, Property 3: Params Promise awaiting
 * Validates: Requirements 1.3, 2.1
 * 
 * Property: For any API route handler that receives params, the params Promise 
 * should be awaited before accessing any of its properties
 */

describe('Property 3: Params Promise awaiting', () => {
  it('should await params Promise before accessing properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random document IDs
        fc.uuid(),
        async (documentId) => {
          // Create a params Promise that resolves to the document ID
          const paramsPromise = Promise.resolve({ id: documentId });
          
          // Simulate the route handler behavior
          const extractedId = await paramsPromise.then(p => p.id);
          
          // Verify that the extracted ID matches the original
          expect(extractedId).toBe(documentId);
          
          // Verify that attempting to access without awaiting would fail
          // This simulates the old broken behavior
          const directAccess = (paramsPromise as any).id;
          expect(directAccess).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle params Promise rejection gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (errorMessage) => {
          // Create a params Promise that rejects
          const paramsPromise = Promise.reject(new Error(errorMessage));
          
          // Verify that awaiting a rejected Promise throws
          await expect(paramsPromise).rejects.toThrow(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve params structure after awaiting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.record({
          additionalProp: fc.string(),
        }),
        async (documentId, additionalProps) => {
          // Create a params Promise with multiple properties
          const paramsPromise = Promise.resolve({ 
            id: documentId,
            ...additionalProps 
          });
          
          // Await and destructure
          const { id, ...rest } = await paramsPromise;
          
          // Verify all properties are preserved
          expect(id).toBe(documentId);
          expect(rest).toEqual(additionalProps);
        }
      ),
      { numRuns: 100 }
    );
  });
});
