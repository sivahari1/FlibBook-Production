/**
 * Unit tests for Conversion Cache API endpoints
 * 
 * Tests cache management operations including statistics,
 * warming, cleanup, and invalidation.
 */

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { getConversionManager } from '@/lib/services/centralized-conversion-manager';
import { getServerSession } from 'next-auth';

import { vi } from 'vitest';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
vi.mock('@/lib/services/centralized-conversion-manager');
vi.mock('next-auth');

const mockGetConversionManager = getConversionManager as any;
const mockGetServerSession = getServerSession as any;

// Mock conversion manager
const mockConversionManager = {
  getCacheStats: vi.fn(),
  warmCache: vi.fn(),
  cleanupExpiredCache: vi.fn(),
  invalidateCache: vi.fn(),
  invalidateCacheMultiple: vi.fn(),
};

// Mock session data
const mockUserSession = {
  user: {
    id: 'user-123',
    email: 'user@example.com',
    role: 'member',
  },
};

const mockAdminSession = {
  user: {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  },
};

// Mock cache stats
const mockCacheStats = {
  totalEntries: 25,
  hitRate: 85.5,
  totalSizeBytes: 1024000,
  popularDocuments: [
    {
      documentId: 'doc-1',
      accessCount: 15,
      lastAccessed: new Date(),
    },
    {
      documentId: 'doc-2',
      accessCount: 12,
      lastAccessed: new Date(),
    },
  ],
  efficiency: {
    avgAccessCount: 3.2,
    storageSaved: 50000000,
    timeSaved: 125000,
  },
};

describe('/api/conversion/cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConversionManager.mockReturnValue(mockConversionManager as any);
  });

  describe('GET /api/conversion/cache', () => {
    test('should return cache statistics for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.getCacheStats.mockResolvedValue(mockCacheStats);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stats).toMatchObject({
        totalEntries: mockCacheStats.totalEntries,
        hitRate: mockCacheStats.hitRate,
        totalSizeBytes: mockCacheStats.totalSizeBytes,
        efficiency: mockCacheStats.efficiency,
      });
      expect(data.data.stats.popularDocuments).toHaveLength(2);
      expect(data.data.timestamp).toBeDefined();
      expect(mockConversionManager.getCacheStats).toHaveBeenCalled();
    });

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
      expect(mockConversionManager.getCacheStats).not.toHaveBeenCalled();
    });

    test('should handle cache stats error', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.getCacheStats.mockRejectedValue(new Error('Cache error'));

      const request = new NextRequest('http://localhost:3000/api/conversion/cache');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve cache statistics');
      expect(data.details).toBe('Cache error');
    });
  });

  describe('POST /api/conversion/cache', () => {
    test('should warm cache successfully', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.warmCache.mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'warm',
          documentIds: ['doc-1', 'doc-2', 'doc-3'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('warm');
      expect(data.data.warmedDocuments).toBe(5);
      expect(data.data.message).toContain('5 documents');
      expect(mockConversionManager.warmCache).toHaveBeenCalledWith(['doc-1', 'doc-2', 'doc-3']);
    });

    test('should cleanup expired cache entries', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.cleanupExpiredCache.mockResolvedValue(8);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'cleanup',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('cleanup');
      expect(data.data.cleanedEntries).toBe(8);
      expect(data.data.message).toContain('8 expired cache entries');
      expect(mockConversionManager.cleanupExpiredCache).toHaveBeenCalled();
    });

    test('should invalidate cache for specific documents', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.invalidateCacheMultiple.mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalidate',
          documentIds: ['doc-1', 'doc-2', 'doc-3'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('invalidate');
      expect(data.data.invalidatedEntries).toBe(3);
      expect(data.data.documentIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
      expect(mockConversionManager.invalidateCacheMultiple).toHaveBeenCalledWith(['doc-1', 'doc-2', 'doc-3']);
    });

    test('should require admin role for cache clearing', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession); // Regular user

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clear',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required for cache clearing');
    });

    test('should allow admin to clear cache', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'clear',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.action).toBe('clear');
    });

    test('should return 400 for missing action', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Action is required');
    });

    test('should return 400 for unknown action', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'unknown',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unknown action: unknown');
    });

    test('should return 400 for invalidate without document IDs', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalidate',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document IDs array is required for invalidation');
    });

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'warm',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should handle cache operation errors', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.warmCache.mockRejectedValue(new Error('Warming failed'));

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'warm',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cache operation failed');
      expect(data.details).toBe('Warming failed');
    });
  });

  describe('DELETE /api/conversion/cache', () => {
    test('should invalidate single document cache', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.invalidateCache.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache?documentId=doc-123');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.documentId).toBe('doc-123');
      expect(data.data.invalidated).toBe(true);
      expect(data.data.message).toBe('Cache invalidated successfully');
      expect(mockConversionManager.invalidateCache).toHaveBeenCalledWith('doc-123');
    });

    test('should invalidate multiple document caches', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.invalidateCacheMultiple.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache?documentIds=doc-1,doc-2,doc-3');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.documentIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
      expect(data.data.invalidatedEntries).toBe(2);
      expect(data.data.message).toContain('2 documents');
      expect(mockConversionManager.invalidateCacheMultiple).toHaveBeenCalledWith(['doc-1', 'doc-2', 'doc-3']);
    });

    test('should handle no cache entry found', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.invalidateCache.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache?documentId=nonexistent');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.invalidated).toBe(false);
      expect(data.data.message).toBe('No cache entry found');
    });

    test('should return 400 for missing parameters', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Document ID or document IDs parameter is required');
    });

    test('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache?documentId=doc-123');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should handle invalidation errors', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.invalidateCache.mockRejectedValue(new Error('Invalidation failed'));

      const request = new NextRequest('http://localhost:3000/api/conversion/cache?documentId=doc-123');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cache invalidation failed');
      expect(data.details).toBe('Invalidation failed');
    });

    test('should filter empty document IDs', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.invalidateCacheMultiple.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache?documentIds=doc-1,,doc-2, ,doc-3');
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.documentIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
      expect(mockConversionManager.invalidateCacheMultiple).toHaveBeenCalledWith(['doc-1', 'doc-2', 'doc-3']);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON in POST request', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cache operation failed');
    });

    test('should handle session retrieval errors', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session error'));

      const request = new NextRequest('http://localhost:3000/api/conversion/cache');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to retrieve cache statistics');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle cache warming for popular documents', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockConversionManager.warmCache.mockResolvedValue(10);

      const request = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'warm',
          // No documentIds provided - should warm popular documents
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.warmedDocuments).toBe(10);
      expect(mockConversionManager.warmCache).toHaveBeenCalledWith(undefined);
    });

    test('should handle batch cache invalidation workflow', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      
      // First, get cache stats
      mockConversionManager.getCacheStats.mockResolvedValue(mockCacheStats);
      const statsRequest = new NextRequest('http://localhost:3000/api/conversion/cache');
      const statsResponse = await GET(statsRequest);
      const statsData = await statsResponse.json();
      
      expect(statsData.data.stats.totalEntries).toBe(25);
      
      // Then, invalidate some documents
      mockConversionManager.invalidateCacheMultiple.mockResolvedValue(5);
      const invalidateRequest = new NextRequest('http://localhost:3000/api/conversion/cache', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalidate',
          documentIds: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5'],
        }),
      });
      
      const invalidateResponse = await POST(invalidateRequest);
      const invalidateData = await invalidateResponse.json();
      
      expect(invalidateData.success).toBe(true);
      expect(invalidateData.data.invalidatedEntries).toBe(5);
    });
  });
});