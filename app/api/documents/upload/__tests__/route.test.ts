/**
 * Tests for enhanced upload API
 * Requirements: 1.1, 1.4, 3.1, 4.1, 5.1, 9.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { ContentType } from '@/lib/types/content';
import * as fc from 'fast-check';
import { checkUploadPermission, getUploadQuotaRemaining } from '@/lib/rbac/admin-privileges';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    document: {
      create: vi.fn()
    }
  }
}));
vi.mock('@/lib/role-check', () => ({
  requirePlatformUser: vi.fn().mockResolvedValue(null)
}));
vi.mock('@/lib/content-processor');
vi.mock('@/lib/link-processor');
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('POST /api/documents/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const formData = new FormData();
    formData.append('contentType', ContentType.PDF);
    formData.append('title', 'Test Document');

    const request = new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject requests with invalid content type', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any);

    const formData = new FormData();
    formData.append('contentType', 'INVALID_TYPE');
    formData.append('title', 'Test Document');

    const request = new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid or missing content type');
  });

  it('should reject requests without title', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any);

    const formData = new FormData();
    formData.append('contentType', ContentType.PDF);

    const request = new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Title is required');
  });

  it('should reject LINK content type without URL', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any);

    const formData = new FormData();
    formData.append('contentType', ContentType.LINK);
    formData.append('title', 'Test Link');

    const request = new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Link URL is required for LINK content type');
  });

  it('should reject file content types without file', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' }
    } as any);

    const formData = new FormData();
    formData.append('contentType', ContentType.PDF);
    formData.append('title', 'Test PDF');

    const request = new NextRequest('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('File is required');
  });
});

/**
 * Property-Based Tests for Upload API
 * Feature: admin-enhanced-privileges
 */
describe('Property-Based Tests - Upload API', () => {
  /**
   * **Feature: admin-enhanced-privileges, Property 1: Admin upload quota bypass**
   * For any admin user and any document count, uploading a document should succeed without quota validation errors
   * **Validates: Requirements 1.1, 1.4**
   */
  it('Property 1: Admin upload quota bypass', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary document counts (including very large numbers)
        fc.nat({ max: 1000000 }),
        // Generate all possible content types
        fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
        // Generate arbitrary file sizes
        fc.nat({ max: 1024 * 1024 * 1024 }), // Up to 1GB
        (docCount, contentType, fileSize) => {
          // Check upload permission for ADMIN role
          const result = checkUploadPermission('ADMIN', docCount, contentType, fileSize);
          
          // Property: Admin should ALWAYS be allowed to upload, regardless of document count
          expect(result.allowed).toBe(true);
          expect(result.reason).toBeUndefined();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * **Feature: admin-enhanced-privileges, Property 2: Admin quota counter invariance**
   * For any admin user, the quota counter value before and after uploading a document should remain unchanged
   * **Validates: Requirements 1.3**
   */
  it('Property 2: Admin quota counter invariance', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary document counts
        fc.nat({ max: 1000000 }),
        (docCount) => {
          // Get quota before "upload"
          const quotaBefore = getUploadQuotaRemaining('ADMIN', docCount);
          
          // Get quota after "upload" (simulated by incrementing count)
          const quotaAfter = getUploadQuotaRemaining('ADMIN', docCount + 1);
          
          // Property: Admin quota should remain 'unlimited' regardless of document count
          expect(quotaBefore).toBe('unlimited');
          expect(quotaAfter).toBe('unlimited');
          expect(quotaBefore).toBe(quotaAfter);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: admin-enhanced-privileges, Property 26: Content type validation**
   * For any selected content type, the upload validation should apply the correct rules for that type
   * **Validates: Requirements 9.3**
   */
  it('Property 26: Content type validation', () => {
    fc.assert(
      fc.property(
        // Generate all possible content types
        fc.constantFrom(ContentType.PDF, ContentType.IMAGE, ContentType.VIDEO, ContentType.LINK),
        // Generate arbitrary document counts
        fc.nat({ max: 100 }),
        // Generate file sizes
        fc.nat({ max: 100 * 1024 * 1024 }), // Up to 100MB
        (contentType, docCount, fileSize) => {
          // Test for ADMIN role (should accept all content types)
          const adminResult = checkUploadPermission('ADMIN', docCount, contentType, fileSize);
          expect(adminResult.allowed).toBe(true);
          
          // Test for PLATFORM_USER role (should only accept PDF)
          const platformUserResult = checkUploadPermission('PLATFORM_USER', docCount, contentType, fileSize);
          
          if (contentType === ContentType.PDF) {
            // PLATFORM_USER should be allowed to upload PDFs (if within quota and size limits)
            if (docCount < 10 && fileSize <= 50 * 1024 * 1024) {
              expect(platformUserResult.allowed).toBe(true);
            }
          } else {
            // PLATFORM_USER should NOT be allowed to upload other content types
            // (unless they've hit quota limit first)
            if (docCount < 10) {
              expect(platformUserResult.allowed).toBe(false);
              expect(platformUserResult.reason).toContain('not allowed');
            }
          }
          
          // Test for MEMBER role (should not accept any content types)
          // Note: MEMBER has maxDocuments=0, so will fail quota check before content type check
          const memberResult = checkUploadPermission('MEMBER', docCount, contentType, fileSize);
          expect(memberResult.allowed).toBe(false);
          // The reason will be either quota limit or content type not allowed
          expect(memberResult.reason).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
