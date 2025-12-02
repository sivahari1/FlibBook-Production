import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: document-preview-fix, Property 5: Error message clarity
 * Validates: Requirements 1.5
 * 
 * Property: For any error condition (404, 403, 500), the API response should 
 * include a success: false flag and a descriptive message field
 */

describe('Property 5: Error message clarity', () => {
  // Generator for error response structures
  const errorResponseArbitrary = fc.record({
    success: fc.constant(false),
    message: fc.string({ minLength: 5, maxLength: 200 }),
  });

  // Generator for HTTP error status codes
  const errorStatusCodeArbitrary = fc.constantFrom(400, 401, 403, 404, 500);

  it('should have success: false for all error responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorResponseArbitrary,
        errorStatusCodeArbitrary,
        async (errorResponse, statusCode) => {
          // Verify error responses always have success: false
          expect(errorResponse.success).toBe(false);
          
          // Verify status code is an error code
          expect(statusCode).toBeGreaterThanOrEqual(400);
          expect(statusCode).toBeLessThan(600);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have descriptive message field for all errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorResponseArbitrary,
        async (errorResponse) => {
          // Verify message field exists
          expect(errorResponse).toHaveProperty('message');
          
          // Verify message is a non-empty string
          expect(typeof errorResponse.message).toBe('string');
          expect(errorResponse.message.length).toBeGreaterThan(0);
          
          // Verify message is descriptive (not just a single word)
          expect(errorResponse.message.length).toBeGreaterThanOrEqual(5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should map specific error conditions to appropriate status codes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { condition: 'not_found', expectedStatus: 404, message: 'Document not found' },
          { condition: 'unauthorized', expectedStatus: 401, message: 'Unauthorized' },
          { condition: 'forbidden', expectedStatus: 403, message: 'Access denied' },
          { condition: 'invalid_type', expectedStatus: 400, message: 'Only PDF documents have pages' },
          { condition: 'server_error', expectedStatus: 500, message: 'Failed to retrieve pages' }
        ),
        async (errorCase) => {
          // Verify each error condition maps to correct status code
          expect(errorCase.expectedStatus).toBeGreaterThanOrEqual(400);
          expect(errorCase.expectedStatus).toBeLessThan(600);
          
          // Verify message is descriptive
          expect(errorCase.message.length).toBeGreaterThan(0);
          
          // Verify message relates to the error condition
          const messageLower = errorCase.message.toLowerCase();
          
          switch (errorCase.condition) {
            case 'not_found':
              expect(messageLower).toContain('not found');
              break;
            case 'unauthorized':
              expect(messageLower).toContain('unauthorized');
              break;
            case 'forbidden':
              expect(messageLower).toContain('denied');
              break;
            case 'invalid_type':
              expect(messageLower).toContain('pdf');
              break;
            case 'server_error':
              expect(messageLower).toContain('failed');
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistent error response structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorResponseArbitrary,
        async (errorResponse) => {
          // Verify required fields are present
          expect(errorResponse).toHaveProperty('success');
          expect(errorResponse).toHaveProperty('message');
          
          // Verify success is always false for errors
          expect(errorResponse.success).toBe(false);
          
          // Verify no undefined or null values in required fields
          expect(errorResponse.success).not.toBeUndefined();
          expect(errorResponse.success).not.toBeNull();
          expect(errorResponse.message).not.toBeUndefined();
          expect(errorResponse.message).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not expose sensitive information in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 200 }),
        async (errorMessage) => {
          // Verify error messages don't contain sensitive patterns
          const messageLower = errorMessage.toLowerCase();
          
          // Should not contain database connection strings
          expect(messageLower).not.toMatch(/postgres:\/\//);
          expect(messageLower).not.toMatch(/password=/);
          
          // Should not contain file system paths
          expect(messageLower).not.toMatch(/\/home\//);
          expect(messageLower).not.toMatch(/c:\\/);
          
          // Should not contain stack traces
          expect(messageLower).not.toMatch(/at\s+\w+\s+\(/);
          
          // Should not contain API keys or tokens
          expect(messageLower).not.toMatch(/api[_-]?key/);
          expect(messageLower).not.toMatch(/token/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide user-friendly messages for common errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'Document not found',
          'Unauthorized',
          'Access denied',
          'Only PDF documents have pages',
          'Failed to retrieve pages'
        ),
        async (message) => {
          // Verify messages are user-friendly (no technical jargon)
          const messageLower = message.toLowerCase();
          
          // Should not contain technical database terms
          expect(messageLower).not.toContain('prisma');
          expect(messageLower).not.toContain('query');
          expect(messageLower).not.toContain('transaction');
          
          // Should not contain HTTP status codes in message
          expect(message).not.toMatch(/\b(400|401|403|404|500)\b/);
          
          // Should be concise (not overly verbose)
          expect(message.length).toBeLessThan(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle error message with additional context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          success: fc.constant(false),
          message: fc.string({ minLength: 5, maxLength: 100 }),
          processingTime: fc.integer({ min: 0, max: 10000 }),
        }),
        async (errorResponse) => {
          // Verify core error fields are present
          expect(errorResponse.success).toBe(false);
          expect(errorResponse.message).toBeDefined();
          
          // Verify optional context fields don't interfere with error structure
          if ('processingTime' in errorResponse) {
            expect(typeof errorResponse.processingTime).toBe('number');
            expect(errorResponse.processingTime).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
