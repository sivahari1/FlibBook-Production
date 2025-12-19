import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { NextRequest } from 'next/server';
import { GET } from '../route';

/**
 * Feature: document-preview-fix, Property 4: Page data structure validity
 * Validates: Requirements 1.4
 * 
 * Property: For any document with cached pages, the API response should contain
 * an array of page objects with pageNumber, pageUrl, and dimensions properties
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

describe('Property 4: Page data structure validity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return valid page data structure for documents with cached pages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        // Generate random number of pages (1-100)
        fc.integer({ min: 1, max: 100 }),
        async (documentId, userId, pageCount) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock document
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
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

          // Generate page URLs
          const pageUrls = Array.from({ length: pageCount }, (_, i) => 
            `https://storage.example.com/${documentId}/page-${i + 1}.jpg`
          );

          vi.mocked(hasCachedPages).mockResolvedValue(true);
          vi.mocked(getCachedPageUrls).mockResolvedValue(pageUrls);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Verify response structure
          expect(data.success).toBe(true);
          expect(data.pages).toBeDefined();
          expect(Array.isArray(data.pages)).toBe(true);
          expect(data.pages.length).toBe(pageCount);
          expect(data.totalPages).toBe(pageCount);

          // Verify each page has required properties
          data.pages.forEach((page: unknown, index: number) => {
            expect(page).toHaveProperty('pageNumber');
            expect(page).toHaveProperty('pageUrl');
            expect(page).toHaveProperty('dimensions');

            // Verify pageNumber is correct (1-indexed)
            expect(page).toHaveProperty('pageNumber');
            expect((page as { pageNumber: number }).pageNumber).toBe(index + 1);
            expect(typeof page.pageNumber).toBe('number');

            // Verify pageUrl is a string
            expect(typeof page.pageUrl).toBe('string');
            expect(page.pageUrl.length).toBeGreaterThan(0);

            // Verify dimensions object
            expect(page.dimensions).toHaveProperty('width');
            expect(page.dimensions).toHaveProperty('height');
            expect(typeof page.dimensions.width).toBe('number');
            expect(typeof page.dimensions.height).toBe('number');
            expect(page.dimensions.width).toBeGreaterThan(0);
            expect(page.dimensions.height).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty pages array when no cached pages exist', async () => {
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

          // Mock document
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
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

          // No cached pages
          vi.mocked(hasCachedPages).mockResolvedValue(false);
          vi.mocked(getCachedPageUrls).mockResolvedValue([]);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Verify response structure with empty pages
          expect(data.success).toBe(true);
          expect(data.pages).toBeDefined();
          expect(Array.isArray(data.pages)).toBe(true);
          expect(data.pages.length).toBe(0);
          expect(data.totalPages).toBe(0);
          expect(data.cached).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain page order and sequential numbering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 2, max: 50 }),
        async (documentId, userId, pageCount) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock document
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
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

          // Generate page URLs
          const pageUrls = Array.from({ length: pageCount }, (_, i) => 
            `https://storage.example.com/${documentId}/page-${i + 1}.jpg`
          );

          vi.mocked(hasCachedPages).mockResolvedValue(true);
          vi.mocked(getCachedPageUrls).mockResolvedValue(pageUrls);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Verify sequential page numbering
          for (let i = 0; i < data.pages.length; i++) {
            expect(data.pages[i].pageNumber).toBe(i + 1);
            
            // Verify no gaps in numbering
            if (i > 0) {
              expect(data.pages[i].pageNumber).toBe(data.pages[i - 1].pageNumber + 1);
            }
          }

          // Verify first page is 1
          if (data.pages.length > 0) {
            expect(data.pages[0].pageNumber).toBe(1);
          }

          // Verify last page number equals total pages
          if (data.pages.length > 0) {
            expect(data.pages[data.pages.length - 1].pageNumber).toBe(pageCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all required metadata fields in response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 10 }),
        async (documentId, userId, pageCount) => {
          // Mock authenticated session
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: userId, email: 'test@example.com' },
            expires: new Date(Date.now() + 86400000).toISOString(),
          });

          // Mock document
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
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

          const pageUrls = Array.from({ length: pageCount }, (_, i) => 
            `https://storage.example.com/${documentId}/page-${i + 1}.jpg`
          );

          vi.mocked(hasCachedPages).mockResolvedValue(true);
          vi.mocked(getCachedPageUrls).mockResolvedValue(pageUrls);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Verify top-level response fields
          expect(data).toHaveProperty('success');
          expect(data).toHaveProperty('documentId');
          expect(data).toHaveProperty('totalPages');
          expect(data).toHaveProperty('pages');
          expect(data).toHaveProperty('cached');
          expect(data).toHaveProperty('processingTime');

          // Verify values
          expect(data.documentId).toBe(documentId);
          expect(data.totalPages).toBe(pageCount);
          expect(data.cached).toBe(true);
          expect(typeof data.processingTime).toBe('number');
          expect(data.processingTime).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case of single page document', async () => {
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

          // Mock document
          vi.mocked(prisma.document.findUnique).mockResolvedValue({
            id: documentId,
            userId: userId,
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

          // Single page
          const pageUrls = [`https://storage.example.com/${documentId}/page-1.jpg`];

          vi.mocked(hasCachedPages).mockResolvedValue(true);
          vi.mocked(getCachedPageUrls).mockResolvedValue(pageUrls);

          const request = new NextRequest('http://localhost:3000/api/documents/' + documentId + '/pages');
          const paramsPromise = Promise.resolve({ id: documentId });

          const response = await GET(request, { params: paramsPromise });
          const data = await response.json();

          // Verify single page structure
          expect(data.success).toBe(true);
          expect(data.pages.length).toBe(1);
          expect(data.totalPages).toBe(1);
          expect(data.pages[0].pageNumber).toBe(1);
          expect(data.pages[0]).toHaveProperty('pageUrl');
          expect(data.pages[0]).toHaveProperty('dimensions');
        }
      ),
      { numRuns: 100 }
    );
  });
});
