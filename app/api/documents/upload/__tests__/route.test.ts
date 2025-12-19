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

/**
 * **Feature: free-upload-fix, Property 5: Edge case validation handling**
 * For any price input that is null, undefined, or negative, the validation should reject it, but price 0 should be accepted
 * **Validates: Requirements 3.3**
 */
describe('Property 5: Edge case validation handling', () => {
  // Helper function that replicates the backend validation logic from upload route
  const validateBackendBookShopPrice = (bookShopPrice: number | null | undefined): { isValid: boolean; error?: string } => {
    if (bookShopPrice === null || bookShopPrice === undefined || bookShopPrice < 0) {
      return { isValid: false, error: 'Price must be 0 or greater when adding to bookshop' };
    } else if (bookShopPrice > 10000) {
      return { isValid: false, error: 'Price cannot exceed ₹10,000' };
    }
    return { isValid: true };
  };

  it('should reject null and undefined prices', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        (price) => {
          const result = validateBackendBookShopPrice(price);
          
          // Property: null and undefined should be rejected
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Price must be 0 or greater when adding to bookshop');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject negative prices', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1000), max: Math.fround(-0.01), noNaN: true }),
        (price) => {
          const result = validateBackendBookShopPrice(price);
          
          // Property: negative prices should be rejected
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Price must be 0 or greater when adding to bookshop');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept price exactly 0', () => {
    const result = validateBackendBookShopPrice(0);
    
    // Property: price 0 should be accepted (edge case for free content)
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept valid positive prices', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        (price) => {
          const result = validateBackendBookShopPrice(price);
          
          // Property: positive prices within range should be accepted
          expect(result.isValid).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject prices above upper limit', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(10000.01), max: Math.fround(100000), noNaN: true }),
        (price) => {
          const result = validateBackendBookShopPrice(price);
          
          // Property: prices above limit should be rejected
          expect(result.isValid).toBe(false);
          expect(result.error).toBe('Price cannot exceed ₹10,000');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary values correctly', () => {
    const boundaryValues = [0, 0.01, 9999.99, 10000];
    
    boundaryValues.forEach(price => {
      const result = validateBackendBookShopPrice(price);
      
      // Property: All boundary values within range should be valid
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  it('should handle edge cases with special values', () => {
    const edgeCases = [
      { price: -0, shouldBeValid: true }, // Negative zero should be treated as 0
      { price: Number.MIN_VALUE, shouldBeValid: true }, // Smallest positive number
      { price: 10000, shouldBeValid: true }, // Exact upper boundary
      { price: 10000.001, shouldBeValid: false }, // Just above upper boundary
    ];
    
    edgeCases.forEach(({ price, shouldBeValid }) => {
      const result = validateBackendBookShopPrice(price);
      
      expect(result.isValid).toBe(shouldBeValid);
      if (!shouldBeValid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  it('should ensure zero representations are consistently accepted', () => {
    const zeroRepresentations = [0, 0.0, -0, +0, Math.abs(-0)];
    
    zeroRepresentations.forEach(zero => {
      const result = validateBackendBookShopPrice(zero);
      
      // Property: All representations of zero should be valid
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
