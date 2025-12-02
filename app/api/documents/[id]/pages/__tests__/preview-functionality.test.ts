import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET } from '../route';

/**
 * Feature: document-preview-fix, Property 1: Preview loads without Prisma errors
 * Validates: Requirements 1.1
 * 
 * Property: For any valid document ID and authenticated user who owns that document,
 * requesting the preview page should successfully load without Prisma validation errors
 */

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/page-cache', () => ({
  hasCachedPages: vi.fn(),
  getCachedPageUrls: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { hasCachedPages, getCachedPageUrls } from '@/lib/services/page-cache';

describe('Property 1: Preview loads without Prisma errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load preview without Prisma validation errors for valid document IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid UUIDs for document and user IDs
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 5, maxLength: 100 }),
        async (documentId, userId, filename) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock document exists and user owns it
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
            filename: filename,
            mimeType: 'application/pdf',
            title: filename,
            fileSize: BigInt(1000000),
            storagePath: `/documents/${documentId}.pdf`,
            contentType: 'PDF',
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
            linkUrl: null,
            thumbnailUrl: null,
          });

          // Mock page cache
          vi.mocked(hasCachedPages).mockResolvedValue(true);
          vi.mocked(getCachedPageUrls).mockResolvedValue([
            `https://storage.example.com/${documentId}/page-1.jpg`,
            `https://storage.example.com/${documentId}/page-2.jpg`,
          ]);

          // Create request with proper params Promise
          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          // Call the route handler
          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Verify no Prisma validation errors occurred
          expect(response.status).not.toBe(500);
          expect(data.success).toBe(true);
          expect(data.documentId).toBe(documentId);
          
          // Verify Prisma was called with the correct document ID (not undefined)
          expect(prisma.document.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { id: documentId },
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle document not found without Prisma errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (documentId, userId) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock document not found
          vi.mocked(prisma.document.findUnique).mockResolvedValue(null);
          vi.mocked(hasCachedPages).mockResolvedValue(false);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Should return 404, not 500 (Prisma validation error)
          expect(response.status).toBe(404);
          expect(data.success).toBe(false);
          expect(data.message).toBe('Document not found');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle access denied without Prisma errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        async (documentId, ownerId, requesterId) => {
          // Ensure owner and requester are different
          if (ownerId === requesterId) return;

          // Mock authenticated session with different user
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: requesterId, email: 'requester@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock document owned by different user
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: ownerId,
            filename: 'test.pdf',
            mimeType: 'application/pdf',
            title: 'test.pdf',
            fileSize: BigInt(1000000),
            storagePath: `/documents/${documentId}.pdf`,
            contentType: 'PDF',
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
            linkUrl: null,
            thumbnailUrl: null,
          });

          vi.mocked(hasCachedPages).mockResolvedValue(false);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Should return 403, not 500 (Prisma validation error)
          expect(response.status).toBe(403);
          expect(data.success).toBe(false);
          expect(data.message).toBe('Access denied');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle non-PDF documents without Prisma errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.constantFrom('image/jpeg', 'image/png', 'video/mp4', 'text/plain'),
        async (documentId, userId, mimeType) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock non-PDF document
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
            filename: 'test.jpg',
            mimeType: mimeType,
            title: 'test.jpg',
            fileSize: BigInt(1000000),
            storagePath: `/documents/${documentId}.jpg`,
            contentType: 'IMAGE',
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {},
            linkUrl: null,
            thumbnailUrl: null,
          });

          vi.mocked(hasCachedPages).mockResolvedValue(false);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Should return 400, not 500 (Prisma validation error)
          expect(response.status).toBe(400);
          expect(data.success).toBe(false);
          expect(data.message).toBe('Only PDF documents have pages');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should never pass undefined document ID to Prisma', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        async (documentId, userId) => {
          // Clear mocks before each property test iteration
          vi.clearAllMocks();

          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          vi.mocked(prisma.document.findUnique).mockResolvedValue(null);
          vi.mocked(hasCachedPages).mockResolvedValue(false);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          await GET(request, { params: paramsPromise });

          // Verify Prisma was called with a defined document ID (not undefined)
          const calls = vi.mocked(prisma.document.findUnique).mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          
          for (const call of calls) {
            const whereClause = call[0]?.where;
            expect(whereClause?.id).toBeDefined();
            expect(whereClause?.id).not.toBeUndefined();
            expect(typeof whereClause?.id).toBe('string');
            expect(whereClause?.id.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
