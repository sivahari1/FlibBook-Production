/**
 * PDF.js Authentication Handling Property-Based Tests
 * 
 * Feature: pdf-iframe-blocking-fix, Property 28: Authentication handling
 * 
 * Property: For any authenticated PDF.js request, the authentication should be handled correctly
 * 
 * Validates: Requirements 8.4
 * 
 * These property-based tests verify that authentication is properly handled
 * for PDF.js requests, including:
 * - Signed URL authentication
 * - Token expiration detection
 * - Token refresh when needed
 * - Authentication error handling
 * - Retry with refreshed authentication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createAuthenticatedPDFSource,
  isSignedUrlExpired,
  refreshSignedUrl,
  getValidSignedUrl,
  retryWithAuth,
  isAuthenticationError,
  type AuthenticatedPDFSource,
} from '../pdfjs-auth';
import { loadPDFDocument } from '../pdfjs-integration';

// Mock the storage module
vi.mock('../storage', () => ({
  getSignedUrl: vi.fn(),
  getBucketForContentType: vi.fn(),
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
  deleteFile: vi.fn(),
  getPublicUrl: vi.fn(),
  listFiles: vi.fn(),
}));

// Mock the network module
vi.mock('../pdfjs-network', () => ({
  optimizedFetch: vi.fn(),
}));

describe('PDF.js Authentication Handling - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: pdf-iframe-blocking-fix, Property 28: Authentication handling
   * 
   * Property: For any authenticated PDF.js request, the authentication should be handled correctly
   * 
   * Validates: Requirements 8.4
   * 
   * This property tests that authentication is properly handled for all PDF.js requests:
   * 1. Signed URLs include authentication tokens
   * 2. Token expiration is detected
   * 3. Expired tokens are refreshed automatically
   * 4. Authentication errors are properly identified
   * 5. Requests are retried with refreshed authentication
   */
  describe('Property 28: Authentication handling', () => {
    it('should handle authentication correctly for any PDF.js request with signed URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various storage paths
          fc.record({
            userId: fc.uuid(),
            documentId: fc.uuid(),
            filename: fc.stringMatching(/^[a-zA-Z0-9_-]+\.pdf$/),
          }),
          // Generate expiration times (1 minute to 1 hour)
          fc.integer({ min: 60, max: 3600 }),
          async (pathData, expiresIn) => {
            const storagePath = `${pathData.userId}/${pathData.documentId}/${pathData.filename}`;
            const bucket = 'documents';
            
            // Mock storage to return signed URL with authentication
            const mockToken = `auth-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const expiresAt = Date.now() + (expiresIn * 1000);
            const mockSignedUrl = `https://test.supabase.co/storage/v1/object/sign/${bucket}/${storagePath}?token=${mockToken}&expires=${expiresAt}`;
            
            const { getSignedUrl } = await import('../storage');
            vi.mocked(getSignedUrl).mockResolvedValue({
              url: mockSignedUrl,
              error: undefined,
            });
            
            // Create authenticated PDF source
            const authSource = await createAuthenticatedPDFSource(storagePath, expiresIn, bucket);
            
            // Verify authentication source was created
            expect(authSource).not.toBeNull();
            expect(authSource!.url).toBe(mockSignedUrl);
            expect(authSource!.expiresAt).toBeGreaterThan(Date.now());
            expect(authSource!.storagePath).toBe(storagePath);
            expect(authSource!.bucket).toBe(bucket);
            
            // Verify signed URL includes authentication token
            expect(authSource!.url).toContain('token=');
            expect(authSource!.url).toContain(mockToken);
            
            // Verify getSignedUrl was called with correct parameters
            expect(getSignedUrl).toHaveBeenCalledWith(
              storagePath,
              expiresIn,
              bucket,
              expect.objectContaining({
                download: false, // Critical for fetch API
              })
            );
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in design
          verbose: true,
        }
      );
    });

    it('should detect token expiration correctly for any authenticated source', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate storage paths
          fc.uuid().map(id => `user/${id}/document.pdf`),
          // Generate expiration times (past, present, future)
          fc.integer({ min: -3600, max: 3600 }), // -1 hour to +1 hour
          // Generate buffer times
          fc.integer({ min: 0, max: 300 }), // 0 to 5 minutes
          async (storagePath, expiresInSeconds, bufferSeconds) => {
            const expiresAt = Date.now() + (expiresInSeconds * 1000);
            
            const authSource: AuthenticatedPDFSource = {
              url: `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=test`,
              expiresAt,
              storagePath,
              bucket: 'documents',
            };
            
            // Check expiration
            const isExpired = isSignedUrlExpired(authSource, bufferSeconds);
            
            // Verify expiration detection is correct
            const timeUntilExpiration = expiresAt - Date.now();
            const bufferMs = bufferSeconds * 1000;
            const expectedExpired = timeUntilExpiration <= bufferMs;
            
            expect(isExpired).toBe(expectedExpired);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should refresh expired tokens automatically for any authenticated source', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate storage paths
          fc.record({
            userId: fc.uuid(),
            documentId: fc.uuid(),
          }).map(ids => `${ids.userId}/${ids.documentId}/doc.pdf`),
          // Generate new expiration time
          fc.integer({ min: 60, max: 7200 }),
          async (storagePath, newExpiresIn) => {
            // Create an expired source
            const expiredSource: AuthenticatedPDFSource = {
              url: `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=old-token`,
              expiresAt: Date.now() - 1000, // Expired 1 second ago
              storagePath,
              bucket: 'documents',
            };
            
            // Verify it's expired
            expect(isSignedUrlExpired(expiredSource)).toBe(true);
            
            // Mock storage to return refreshed URL
            const newToken = `refreshed-token-${Date.now()}`;
            const newExpiresAt = Date.now() + (newExpiresIn * 1000);
            const refreshedUrl = `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=${newToken}&expires=${newExpiresAt}`;
            
            const { getSignedUrl } = await import('../storage');
            vi.mocked(getSignedUrl).mockResolvedValue({
              url: refreshedUrl,
              error: undefined,
            });
            
            // Refresh the signed URL
            const refreshedSource = await refreshSignedUrl(expiredSource, newExpiresIn);
            
            // Verify refresh was successful
            expect(refreshedSource).not.toBeNull();
            expect(refreshedSource!.url).toBe(refreshedUrl);
            expect(refreshedSource!.expiresAt).toBeGreaterThan(Date.now());
            expect(refreshedSource!.storagePath).toBe(storagePath);
            
            // Verify new URL has new token
            expect(refreshedSource!.url).toContain(newToken);
            expect(refreshedSource!.url).not.toContain('old-token');
            
            // Verify refreshed source is not expired (with 0 buffer to avoid edge cases)
            expect(isSignedUrlExpired(refreshedSource!, 0)).toBe(false);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should get valid signed URL by refreshing if needed for any source', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate storage paths
          fc.uuid().map(id => `documents/${id}.pdf`),
          // Generate expiration status (expired or valid)
          fc.boolean(),
          async (storagePath, isExpired) => {
            const expiresAt = isExpired 
              ? Date.now() - 1000 // Expired
              : Date.now() + 3600000; // Valid for 1 hour
            
            const authSource: AuthenticatedPDFSource = {
              url: `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=original`,
              expiresAt,
              storagePath,
              bucket: 'documents',
            };
            
            if (isExpired) {
              // Mock refresh for expired URLs
              const refreshedUrl = `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=refreshed`;
              const { getSignedUrl } = await import('../storage');
              vi.mocked(getSignedUrl).mockResolvedValue({
                url: refreshedUrl,
                error: undefined,
              });
            }
            
            // Get valid signed URL (should refresh if expired)
            const validUrl = await getValidSignedUrl(authSource);
            
            // Verify we got a valid URL
            expect(validUrl).not.toBeNull();
            expect(validUrl).toMatch(/^https?:\/\//);
            expect(validUrl).toContain('token=');
            
            if (isExpired) {
              // Should have refreshed
              expect(validUrl).toContain('refreshed');
              expect(authSource.url).toContain('refreshed'); // Source should be updated
            } else {
              // Should use original
              expect(validUrl).toContain('original');
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should identify authentication errors correctly for any error type', async () => {
      await fc.assert(
        fc.property(
          // Generate various error messages
          fc.oneof(
            fc.constant('401 Unauthorized'),
            fc.constant('403 Forbidden'),
            fc.constant('Authentication failed'),
            fc.constant('Access denied'),
            fc.constant('Unauthorized access'),
            fc.constant('Network timeout'), // Non-auth error
            fc.constant('File not found'), // Non-auth error
            fc.constant('Invalid PDF'), // Non-auth error
          ),
          (errorMessage) => {
            const error = new Error(errorMessage);
            const isAuthError = isAuthenticationError(error);
            
            // Verify correct identification
            const shouldBeAuthError = 
              errorMessage.includes('401') ||
              errorMessage.includes('403') ||
              errorMessage.toLowerCase().includes('unauthorized') ||
              errorMessage.toLowerCase().includes('forbidden') ||
              errorMessage.toLowerCase().includes('authentication') ||
              errorMessage.toLowerCase().includes('access denied');
            
            expect(isAuthError).toBe(shouldBeAuthError);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should retry with refreshed authentication on auth errors for any request', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate storage paths
          fc.uuid().map(id => `user/${id}/test.pdf`),
          // Generate number of retries before success
          fc.integer({ min: 0, max: 2 }),
          async (storagePath, failuresBeforeSuccess) => {
            const authSource: AuthenticatedPDFSource = {
              url: `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=initial`,
              expiresAt: Date.now() + 3600000,
              storagePath,
              bucket: 'documents',
            };
            
            let attemptCount = 0;
            const mockLoadFn = vi.fn(async (url: string) => {
              attemptCount++;
              
              if (attemptCount <= failuresBeforeSuccess) {
                // Fail with auth error
                throw new Error('401 Unauthorized');
              }
              
              // Success
              return { success: true, url };
            });
            
            // Mock refresh to return new URLs
            const { getSignedUrl } = await import('../storage');
            vi.mocked(getSignedUrl).mockImplementation(async () => ({
              url: `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=refreshed-${attemptCount}`,
              error: undefined,
            }));
            
            // Retry with auth
            const result = await retryWithAuth(authSource, mockLoadFn, 2);
            
            // Verify success after retries
            expect(result.success).toBe(true);
            expect(attemptCount).toBe(failuresBeforeSuccess + 1);
            
            // Verify load function was called at least the expected number of times
            // (may be called more due to retry logic)
            expect(mockLoadFn).toHaveBeenCalled();
            expect(attemptCount).toBeGreaterThanOrEqual(failuresBeforeSuccess + 1);
            
            if (failuresBeforeSuccess > 0) {
              // Verify refresh was called for failures
              expect(getSignedUrl).toHaveBeenCalled();
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle authentication correctly when loading PDFs with signed URLs', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate document identifiers
          fc.record({
            userId: fc.uuid(),
            documentId: fc.uuid(),
          }),
          // Generate expiration times
          fc.integer({ min: 300, max: 7200 }), // 5 minutes to 2 hours
          async (ids, expiresIn) => {
            const storagePath = `${ids.userId}/${ids.documentId}/document.pdf`;
            const authToken = `auth-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const expiresAt = Date.now() + (expiresIn * 1000);
            const signedUrl = `https://test.supabase.co/storage/v1/object/sign/documents/${storagePath}?token=${authToken}&expires=${expiresAt}`;
            
            // Mock storage
            const { getSignedUrl } = await import('../storage');
            vi.mocked(getSignedUrl).mockResolvedValue({
              url: signedUrl,
              error: undefined,
            });
            
            // Create minimal valid PDF
            const minimalPDF = new Uint8Array([
              0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, // %PDF-1.4\n
              0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, // Binary comment
              0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, // 1 0 obj\n
              0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, // <</Type/Catalog/Pages 2 0 R>>\n
              0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, // endobj\n
              0x32, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, // 2 0 obj\n
              0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x2f, 0x4b, 0x69, 0x64, 0x73, 0x5b, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5d, 0x2f, 0x43, 0x6f, 0x75, 0x6e, 0x74, 0x20, 0x31, 0x3e, 0x3e, 0x0a, // <</Type/Pages/Kids[3 0 R]/Count 1>>\n
              0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, // endobj\n
              0x33, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, // 3 0 obj\n
              0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x2f, 0x50, 0x61, 0x72, 0x65, 0x6e, 0x74, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x2f, 0x4d, 0x65, 0x64, 0x69, 0x61, 0x42, 0x6f, 0x78, 0x5b, 0x30, 0x20, 0x30, 0x20, 0x36, 0x31, 0x32, 0x20, 0x37, 0x39, 0x32, 0x5d, 0x3e, 0x3e, 0x0a, // <</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>\n
              0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, // endobj\n
              0x78, 0x72, 0x65, 0x66, 0x0a, // xref\n
              0x30, 0x20, 0x34, 0x0a, // 0 4\n
              0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x20, 0x0a, // 0000000000 65535 f \n
              0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x35, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x20, 0x0a, // 0000000015 00000 n \n
              0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x37, 0x34, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x20, 0x0a, // 0000000074 00000 n \n
              0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x33, 0x38, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x20, 0x0a, // 0000000138 00000 n \n
              0x74, 0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a, // trailer\n
              0x3c, 0x3c, 0x2f, 0x53, 0x69, 0x7a, 0x65, 0x20, 0x34, 0x2f, 0x52, 0x6f, 0x6f, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, // <</Size 4/Root 1 0 R>>\n
              0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0a, // startxref\n
              0x32, 0x32, 0x38, 0x0a, // 228\n
              0x25, 0x25, 0x45, 0x4f, 0x46, 0x0a, // %%EOF\n
            ]);
            
            // Mock network fetch
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(minimalPDF.buffer, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                  'Content-Length': minimalPDF.length.toString(),
                  'Access-Control-Allow-Origin': '*',
                }),
              })
            );
            
            // Load PDF with authenticated URL
            const result = await loadPDFDocument({
              source: signedUrl,
              timeout: 5000,
            });
            
            // Verify successful load with authentication
            expect(result).toBeDefined();
            expect(result.document).toBeDefined();
            expect(result.numPages).toBeGreaterThan(0);
            
            // Verify the authenticated URL was used
            expect(optimizedFetch).toHaveBeenCalledWith(
              signedUrl,
              expect.objectContaining({
                timeout: 5000,
              })
            );
            
            // Verify URL contains authentication token
            expect(signedUrl).toContain(`token=${authToken}`);
            expect(signedUrl).toContain(`expires=${expiresAt}`);
            
            // Clean up
            result.document.destroy();
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle authentication across different bucket configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various bucket names
          fc.constantFrom('documents', 'pdfs', 'files', 'media', 'storage'),
          // Generate storage paths
          fc.uuid().map(id => `user/${id}/doc.pdf`),
          // Generate expiration times
          fc.integer({ min: 60, max: 3600 }),
          async (bucket, storagePath, expiresIn) => {
            const authToken = `token-${bucket}-${Date.now()}`;
            const expiresAt = Date.now() + (expiresIn * 1000);
            const signedUrl = `https://test.supabase.co/storage/v1/object/sign/${bucket}/${storagePath}?token=${authToken}&expires=${expiresAt}`;
            
            const { getSignedUrl } = await import('../storage');
            vi.mocked(getSignedUrl).mockResolvedValue({
              url: signedUrl,
              error: undefined,
            });
            
            // Create authenticated source
            const authSource = await createAuthenticatedPDFSource(storagePath, expiresIn, bucket);
            
            // Verify authentication works for any bucket
            expect(authSource).not.toBeNull();
            expect(authSource!.url).toContain(`/${bucket}/`);
            expect(authSource!.url).toContain(`token=${authToken}`);
            expect(authSource!.bucket).toBe(bucket);
            expect(authSource!.expiresAt).toBeGreaterThan(Date.now());
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});
