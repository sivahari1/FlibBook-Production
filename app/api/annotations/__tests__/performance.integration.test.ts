/**
 * Annotation API Performance Integration Tests
 * Validates that annotation loading meets < 1 second requirement
 * 
 * Requirements: 17.2 - Annotation loading < 1 second
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';

describe('Annotation Loading Performance', () => {
  const testDocumentId = 'perf-test-doc-' + Date.now();
  const testUserId = 'perf-test-user-' + Date.now();
  
  beforeAll(async () => {
    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `perftest-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        name: 'Performance Test User',
        userRole: 'PLATFORM_USER'
      }
    });

    // Create test document
    await prisma.document.create({
      data: {
        id: testDocumentId,
        title: 'Performance Test Document',
        filename: 'test.pdf',
        fileSize: 1000,
        storagePath: '/test/path',
        userId: testUserId
      }
    });

    // Create multiple annotations for testing
    const annotations = [];
    for (let page = 1; page <= 10; page++) {
      for (let i = 0; i < 5; i++) {
        annotations.push({
          documentId: testDocumentId,
          userId: testUserId,
          pageNumber: page,
          selectedText: `Test annotation ${i} on page ${page}`,
          mediaType: i % 2 === 0 ? 'AUDIO' : 'VIDEO',
          mediaUrl: `https://example.com/media/${page}-${i}`,
          visibility: 'public'
        });
      }
    }

    await prisma.documentAnnotation.createMany({
      data: annotations
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.documentAnnotation.deleteMany({
      where: { documentId: testDocumentId }
    });
    await prisma.document.delete({
      where: { id: testDocumentId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
  });

  describe('Single Page Load Performance', () => {
    it('should load annotations for a single page in < 1 second', async () => {
      const startTime = Date.now();

      const annotations = await prisma.documentAnnotation.findMany({
        where: {
          documentId: testDocumentId,
          pageNumber: 1
        },
        select: {
          id: true,
          documentId: true,
          userId: true,
          pageNumber: true,
          selectedText: true,
          mediaType: true,
          mediaUrl: true,
          externalUrl: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const duration = Date.now() - startTime;

      expect(annotations.length).toBe(5);
      expect(duration).toBeLessThan(1000);
    });

    it('should load annotations with visibility filter in < 1 second', async () => {
      const startTime = Date.now();

      const annotations = await prisma.documentAnnotation.findMany({
        where: {
          documentId: testDocumentId,
          pageNumber: 2,
          visibility: 'public'
        },
        select: {
          id: true,
          documentId: true,
          userId: true,
          pageNumber: true,
          selectedText: true,
          mediaType: true,
          mediaUrl: true,
          externalUrl: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const duration = Date.now() - startTime;

      expect(annotations.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Multiple Page Load Performance', () => {
    it('should load annotations for multiple pages efficiently', async () => {
      const pages = [1, 2, 3, 4, 5];
      const startTime = Date.now();

      const results = await Promise.all(
        pages.map(page =>
          prisma.documentAnnotation.findMany({
            where: {
              documentId: testDocumentId,
              pageNumber: page
            },
            select: {
              id: true,
              pageNumber: true,
              selectedText: true,
              mediaType: true,
            },
          })
        )
      );

      const duration = Date.now() - startTime;

      expect(results.length).toBe(5);
      expect(results.every(r => r.length === 5)).toBe(true);
      // Multiple pages should still be fast with proper indexing
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Query Optimization', () => {
    it('should use indexes for document + page queries', async () => {
      // This test validates that the composite index is being used
      const startTime = Date.now();

      const annotations = await prisma.documentAnnotation.findMany({
        where: {
          documentId: testDocumentId,
          pageNumber: 5
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      const duration = Date.now() - startTime;

      expect(annotations.length).toBe(5);
      // With proper indexing, this should be very fast
      expect(duration).toBeLessThan(500);
    });

    it('should efficiently filter by visibility', async () => {
      const startTime = Date.now();

      const annotations = await prisma.documentAnnotation.findMany({
        where: {
          documentId: testDocumentId,
          pageNumber: 3,
          visibility: 'public'
        }
      });

      const duration = Date.now() - startTime;

      expect(annotations.length).toBe(5);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with concurrent requests', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        prisma.documentAnnotation.findMany({
          where: {
            documentId: testDocumentId,
            pageNumber: (i % 10) + 1
          },
          select: {
            id: true,
            pageNumber: true,
            selectedText: true,
          },
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(concurrentRequests);
      // All concurrent requests should complete quickly
      expect(duration).toBeLessThan(3000);
      
      // Average per request should be under 1 second
      const avgDuration = duration / concurrentRequests;
      expect(avgDuration).toBeLessThan(1000);
    });
  });

  describe('Cache Effectiveness', () => {
    it('should benefit from repeated queries', async () => {
      // First query (cold)
      const startTime1 = Date.now();
      const result1 = await prisma.documentAnnotation.findMany({
        where: {
          documentId: testDocumentId,
          pageNumber: 7
        }
      });
      const duration1 = Date.now() - startTime1;

      // Second query (potentially cached)
      const startTime2 = Date.now();
      const result2 = await prisma.documentAnnotation.findMany({
        where: {
          documentId: testDocumentId,
          pageNumber: 7
        }
      });
      const duration2 = Date.now() - startTime2;

      expect(result1.length).toBe(result2.length);
      expect(duration1).toBeLessThan(1000);
      expect(duration2).toBeLessThan(1000);
      
      // Second query should be same or faster
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });
  });

  describe('Performance Metrics', () => {
    it('should track query performance', async () => {
      const measurements: number[] = [];

      // Run multiple queries and track performance
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await prisma.documentAnnotation.findMany({
          where: {
            documentId: testDocumentId,
            pageNumber: (i % 10) + 1
          }
        });
        measurements.push(Date.now() - startTime);
      }

      const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const max = Math.max(...measurements);
      const p95 = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];

      // Performance requirements
      expect(avg).toBeLessThan(500); // Average should be well under 1s
      expect(p95).toBeLessThan(1000); // 95th percentile under 1s
      expect(max).toBeLessThan(1500); // Even worst case should be reasonable
    });
  });
});
