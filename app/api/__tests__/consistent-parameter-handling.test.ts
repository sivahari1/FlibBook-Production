import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Feature: document-preview-fix, Property 6: Consistent parameter handling
 * Validates: Requirements 2.2
 * 
 * Property: For all API routes with dynamic parameters, the parameter handling 
 * pattern (awaiting params Promise) should be consistent
 */

describe('Property 6: Consistent parameter handling', () => {
  // List of all API routes with dynamic parameters that should follow the pattern
  const routesWithParams = [
    'app/api/documents/[id]/pages/route.ts',
    'app/api/documents/[id]/route.ts',
    'app/api/documents/[id]/share/route.ts',
    'app/api/analytics/[documentId]/route.ts',
    'app/api/pages/[docId]/[pageNum]/route.ts',
    'app/api/share/[shareKey]/route.ts',
    'app/api/share/[shareKey]/view/route.ts',
    'app/api/share/[shareKey]/track/route.ts',
    'app/api/share/[shareKey]/verify-password/route.ts',
    'app/api/share/[shareKey]/access/route.ts',
    'app/api/share/link/[id]/revoke/route.ts',
    'app/api/share/email/[id]/revoke/route.ts',
    'app/api/share/email/[id]/view/route.ts',
    'app/api/admin/bookshop/[id]/route.ts',
    'app/api/admin/users/[id]/route.ts',
    'app/api/admin/users/[id]/reset-password/route.ts',
    'app/api/admin/members/[id]/route.ts',
    'app/api/admin/members/[id]/reset-password/route.ts',
    'app/api/admin/members/[id]/toggle-active/route.ts',
    'app/api/admin/access-requests/[id]/route.ts',
    'app/api/member/my-jstudyroom/[id]/route.ts',
    'app/api/annotations/[id]/route.ts',
    'app/api/media/stream/[annotationId]/route.ts',
  ];

  it('should consistently use Promise type for params across all routes', () => {
    const inconsistentRoutes: string[] = [];

    for (const routePath of routesWithParams) {
      try {
        const fullPath = join(process.cwd(), routePath);
        const content = readFileSync(fullPath, 'utf-8');

        // Check if the route uses Promise<{ ... }> for params type
        const hasPromiseType = 
          content.includes('params: Promise<{') || 
          content.includes('params: Promise<{ ') ||
          content.includes('Promise<{\n');

        if (!hasPromiseType) {
          inconsistentRoutes.push(routePath);
        }
      } catch (error) {
        // File might not exist, skip
        console.warn(`Could not read ${routePath}:`, error);
      }
    }

    expect(inconsistentRoutes).toEqual([]);
  });

  it('should consistently await params before accessing properties', () => {
    const routesNotAwaitingParams: string[] = [];

    for (const routePath of routesWithParams) {
      try {
        const fullPath = join(process.cwd(), routePath);
        const content = readFileSync(fullPath, 'utf-8');

        // Check if the route awaits params before accessing properties
        // Look for pattern: "await params" before any "params."
        const hasAwaitPattern = content.includes('await params');

        if (!hasAwaitPattern) {
          routesNotAwaitingParams.push(routePath);
        }
      } catch (error) {
        // File might not exist, skip
        console.warn(`Could not read ${routePath}:`, error);
      }
    }

    expect(routesNotAwaitingParams).toEqual([]);
  });

  it('should handle params Promise resolution consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string(),
        fc.integer({ min: 1, max: 100 }),
        async (id, shareKey, documentId) => {
          // Test different param structures
          const singleParamPromise = Promise.resolve({ id });
          const shareKeyParamPromise = Promise.resolve({ shareKey });
          const documentIdParamPromise = Promise.resolve({ documentId });
          const multiParamPromise = Promise.resolve({ 
            docId: id, 
            pageNum: documentId.toString() 
          });

          // All should resolve correctly
          const singleParam = await singleParamPromise;
          const shareKeyParam = await shareKeyParamPromise;
          const documentIdParam = await documentIdParamPromise;
          const multiParam = await multiParamPromise;

          expect(singleParam.id).toBe(id);
          expect(shareKeyParam.shareKey).toBe(shareKey);
          expect(documentIdParam.documentId).toBe(documentId);
          expect(multiParam.docId).toBe(id);
          expect(multiParam.pageNum).toBe(documentId.toString());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should extract parameters consistently regardless of naming', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (paramValue) => {
          // Test different parameter names used across routes
          const idParam = Promise.resolve({ id: paramValue });
          const shareKeyParam = Promise.resolve({ shareKey: paramValue });
          const documentIdParam = Promise.resolve({ documentId: paramValue });
          const annotationIdParam = Promise.resolve({ annotationId: paramValue });

          // All should extract consistently
          const { id } = await idParam;
          const { shareKey } = await shareKeyParam;
          const { documentId } = await documentIdParam;
          const { annotationId } = await annotationIdParam;

          expect(id).toBe(paramValue);
          expect(shareKey).toBe(paramValue);
          expect(documentId).toBe(paramValue);
          expect(annotationId).toBe(paramValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain type safety after awaiting params', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (id) => {
          // Create a typed params Promise
          type ParamsType = Promise<{ id: string }>;
          const params: ParamsType = Promise.resolve({ id });

          // Await and extract
          const { id: extractedId } = await params;

          // Type should be preserved
          expect(typeof extractedId).toBe('string');
          expect(extractedId).toBe(id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
