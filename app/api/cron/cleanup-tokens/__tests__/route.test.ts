import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import * as tokens from '@/lib/tokens';

// Mock the tokens module
vi.mock('@/lib/tokens', () => ({
  cleanupExpiredTokens: vi.fn(),
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Token Cleanup Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.CRON_SECRET;
  });

  describe('GET /api/cron/cleanup-tokens', () => {
    it('should successfully clean up tokens when authorized', async () => {
      // Mock the cleanup function to return 5 deleted tokens
      vi.mocked(tokens.cleanupExpiredTokens).mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(5);
      expect(data.message).toBe('Token cleanup completed');
      expect(tokens.cleanupExpiredTokens).toHaveBeenCalledOnce();
    });

    it('should require authorization when CRON_SECRET is set', async () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(tokens.cleanupExpiredTokens).not.toHaveBeenCalled();
    });

    it('should accept valid authorization header', async () => {
      process.env.CRON_SECRET = 'test-secret-123';
      vi.mocked(tokens.cleanupExpiredTokens).mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-secret-123',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(3);
      expect(tokens.cleanupExpiredTokens).toHaveBeenCalledOnce();
    });

    it('should reject invalid authorization header', async () => {
      process.env.CRON_SECRET = 'test-secret-123';

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer wrong-secret',
        },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(tokens.cleanupExpiredTokens).not.toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(tokens.cleanupExpiredTokens).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Token cleanup failed');
      expect(data.message).toBe('Database connection failed');
    });

    it('should return zero when no tokens are deleted', async () => {
      vi.mocked(tokens.cleanupExpiredTokens).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(0);
    });
  });

  describe('POST /api/cron/cleanup-tokens', () => {
    it('should work the same as GET', async () => {
      vi.mocked(tokens.cleanupExpiredTokens).mockResolvedValue(7);

      const request = new NextRequest('http://localhost:3000/api/cron/cleanup-tokens', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(7);
    });
  });
});
