/**
 * Integration tests for cache optimization in pages API
 * 
 * Tests the complete caching workflow including:
 * - Multi-layer cache checking
 * - Cache strategy optimization
 * - Performance monitoring
 * - Cache invalidation
 */

import { NextRequest } from 'next/server';
import { GET } from '../route';
import { documentCacheManager } from '@/lib/cache/document-cache-manager';
import { cacheOptimizationService } from '@/lib/cache/cache-optimization-service';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { getCachedPageUrls, hasCachedPages } from '@/lib/services/page-cache';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/db');
jest.mock('@/lib/services/page-cache');
jest.mock('@/lib/cache/document-cache-manager');
jest.mock('@/lib/cache/cache-optimization-service');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockHasCachedPages = hasCachedPages as jest.MockedFunction<typeof hasCachedPages>;
const mockGetCachedPageUrls = getCachedPageUrls as jest.MockedFunction<typeof getCachedPageUrls>;
const mockDocumentCacheManager = documentCacheManager as jest.Mocked<typeof documentCacheManager>;
const mockCacheOptimizationService = cacheOptimizationService as jest.Mocked<typeof cacheOptimizationService>;

describe('Pages API Cache Optimization Integration', () => {
  const mockDocumentId = 'test-doc-123';
  const mockUserId = 'user-456';
  const mockPageUrls = [
    'https://example.com/page1.jpg',
    'https://example.com/page2.jpg',
    'https://example.com/page3.jpg',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId },
    } as any);

    // Mock document
    mockPrisma.document.findUnique.mockResolvedValue({
      id: mockDocumentId,
      userId: mockUserId,
      filename: 'test.pdf',
      mimeType: 'application/pdf',
    } as any);

    // Mock cache optimization service
    mockCacheOptimizationService.optimizeCacheStrategy.mockResolvedValue({
      browserCacheStrategy: 'conservative',
      memoryCacheSize: 50,
      memoryCacheTTL: 30 * 60 * 1000,
    } as any);

    // Mock document cache manager
    mockDocumentCacheManager.getDocumentCache.mockResolvedValue(null);
    mockDocumentCacheManager.setDocumentCache.mockResolvedValue(undefined);
    mockDocumentCacheManager.getBrowserCacheHeaders.mockReturnValue({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=604800',
      'ETag': '"test-etag"',
    });
    mockDocumentCacheManager.getCDNCacheHeaders.mockReturnValue({
      'Cache-Control': 'public, max-age=2592000',
      'Expires': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString(),
    });
  });

  describe('Memory Cache Integration', () => {
    it('should check memory cache first for faster response', async () => {
      // Mock memory cache hit
      mockDocumentCacheManager.getDocumentCache.mockResolvedValue({
        pageUrls: mockPageUrls,
        totalPages: mockPageUrls.length,
        lastAccessed: Date.now(),
      });

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });
      const data = await response.json();

      expect(mockDocumentCacheManager.getDocumentCache).toHaveBeenCalledWith(mockDocumentId);
      expect(data.success).toBe(true);
      expect(data.pages).toHaveLength(mockPageUrls.length);
      expect(data.cached).toBe(true);
    });

    it('should fall back to database cache when memory cache misses', async () => {
      // Mock memory cache miss, database cache hit
      mockDocumentCacheManager.getDocumentCache.mockResolvedValue(null);
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });
      const data = await response.json();

      expect(mockDocumentCacheManager.getDocumentCache).toHaveBeenCalledWith(mockDocumentId);
      expect(mockHasCachedPages).toHaveBeenCalledWith(mockDocumentId);
      expect(mockGetCachedPageUrls).toHaveBeenCalledWith(mockDocumentId);
      expect(mockDocumentCacheManager.setDocumentCache).toHaveBeenCalledWith(
        mockDocumentId,
        expect.objectContaining({
          pageUrls: mockPageUrls,
          totalPages: mockPageUrls.length,
        })
      );
      expect(data.success).toBe(true);
    });
  });

  describe('Cache Strategy Optimization', () => {
    it('should optimize cache strategy based on user and document', async () => {
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(mockCacheOptimizationService.optimizeCacheStrategy).toHaveBeenCalledWith(
        mockDocumentId,
        mockUserId
      );
    });

    it('should apply optimized cache headers to response', async () => {
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(mockDocumentCacheManager.getBrowserCacheHeaders).toHaveBeenCalledWith('application/json');
      expect(mockDocumentCacheManager.getCDNCacheHeaders).toHaveBeenCalled();
      
      // Check that optimized headers are applied
      expect(response.headers.get('Cache-Control')).toBeTruthy();
      expect(response.headers.get('X-Cache-Strategy')).toBe('conservative');
    });
  });

  describe('ETag and Conditional Requests', () => {
    it('should return 304 Not Modified for matching ETag', async () => {
      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`, {
        headers: {
          'if-none-match': '"test-doc-123-pages-v3"',
        },
      });

      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(response.status).toBe(304);
      expect(response.headers.get('ETag')).toBe('"test-doc-123-pages-v3"');
    });

    it('should include cache headers in 304 response', async () => {
      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`, {
        headers: {
          'if-none-match': '"test-doc-123-pages-v3"',
        },
      });

      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(response.status).toBe(304);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Cache-Control')).toBeTruthy();
    });
  });

  describe('Automatic Conversion with Caching', () => {
    beforeEach(() => {
      // Mock fetch for conversion API
      global.fetch = jest.fn();
    });

    it('should cache converted pages after successful conversion', async () => {
      // Mock no cached pages initially
      mockDocumentCacheManager.getDocumentCache.mockResolvedValue(null);
      mockHasCachedPages.mockResolvedValue(false);
      mockGetCachedPageUrls.mockResolvedValue([]);

      // Mock successful conversion
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          pageUrls: mockPageUrls,
        }),
      });

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });
      const data = await response.json();

      expect(mockDocumentCacheManager.setDocumentCache).toHaveBeenCalledWith(
        mockDocumentId,
        expect.objectContaining({
          pageUrls: mockPageUrls,
          totalPages: mockPageUrls.length,
          conversionTimestamp: expect.any(Number),
        })
      );
      expect(data.success).toBe(true);
      expect(data.pages).toHaveLength(mockPageUrls.length);
    });

    it('should handle conversion failures gracefully', async () => {
      // Mock no cached pages
      mockDocumentCacheManager.getDocumentCache.mockResolvedValue(null);
      mockHasCachedPages.mockResolvedValue(false);
      mockGetCachedPageUrls.mockResolvedValue([]);

      // Mock conversion failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Conversion failed'),
      });

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });
      const data = await response.json();

      expect(data.success).toBe(true); // API should still succeed
      expect(data.pages).toHaveLength(0);
      expect(data.message).toContain('conversion was triggered');
    });
  });

  describe('Performance Monitoring', () => {
    it('should include processing time in response', async () => {
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });
      const data = await response.json();

      expect(data.processingTime).toBeDefined();
      expect(typeof data.processingTime).toBe('number');
      expect(response.headers.get('X-Processing-Time')).toContain('ms');
    });

    it('should include cache strategy in response headers', async () => {
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(response.headers.get('X-Cache-Strategy')).toBe('conservative');
    });
  });

  describe('Error Handling', () => {
    it('should handle cache optimization errors gracefully', async () => {
      mockCacheOptimizationService.optimizeCacheStrategy.mockRejectedValue(
        new Error('Cache optimization failed')
      );
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      // Should still succeed despite cache optimization failure
      expect(response.status).toBe(200);
    });

    it('should handle memory cache errors gracefully', async () => {
      mockDocumentCacheManager.getDocumentCache.mockRejectedValue(
        new Error('Memory cache error')
      );
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      // Should fall back to database cache
      expect(mockHasCachedPages).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('Cache Headers Optimization', () => {
    it('should include CDN cache headers for better performance', async () => {
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(response.headers.get('Cache-Control')).toContain('public');
      expect(response.headers.get('Expires')).toBeTruthy();
    });

    it('should include resource timing headers', async () => {
      mockHasCachedPages.mockResolvedValue(true);
      mockGetCachedPageUrls.mockResolvedValue(mockPageUrls);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });

      expect(response.headers.get('Timing-Allow-Origin')).toBe('*');
    });
  });

  describe('Cache Invalidation Integration', () => {
    it('should handle cache misses after invalidation', async () => {
      // Simulate cache invalidation by returning null from memory cache
      mockDocumentCacheManager.getDocumentCache.mockResolvedValue(null);
      mockHasCachedPages.mockResolvedValue(false);
      mockGetCachedPageUrls.mockResolvedValue([]);

      const request = new NextRequest(`http://localhost/api/documents/${mockDocumentId}/pages`);
      const response = await GET(request, { params: Promise.resolve({ id: mockDocumentId }) });
      const data = await response.json();

      // Should trigger conversion when no cache is available
      expect(data.message).toContain('conversion was triggered');
    });
  });
});