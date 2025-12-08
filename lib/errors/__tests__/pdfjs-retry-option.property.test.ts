/**
 * Property-Based Tests for PDF.js Retry Option Availability
 * 
 * Feature: pdf-iframe-blocking-fix, Property 24: Retry option availability
 * Validates: Requirements 7.5
 * 
 * Tests that for any error state, a retry option should be available
 * to the user when appropriate.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  PDFJSErrorCode,
  createPDFJSError,
  isRetryable,
  getMaxRetryAttempts,
} from '../pdfjs-errors';

describe('Property 24: Retry option availability', () => {
  /**
   * Property: For any error state, if the error is retryable,
   * then a retry option should be available (maxRetryAttempts > 0)
   * 
   * Requirements: 7.5
   */
  it('should provide retry option for all retryable errors', () => {
    fc.assert(
      fc.property(
        // Generate all possible error codes
        fc.constantFrom(...Object.values(PDFJSErrorCode)),
        (errorCode) => {
          // Create error
          const error = createPDFJSError(errorCode);
          
          // Get retry properties
          const retryable = isRetryable(errorCode);
          const maxAttempts = getMaxRetryAttempts(errorCode);
          
          // Property: If error is retryable, max attempts should be > 0
          if (retryable) {
            expect(maxAttempts).toBeGreaterThan(0);
            expect(error.retryable).toBe(true);
          } else {
            // If not retryable, max attempts should be 0
            expect(maxAttempts).toBe(0);
            expect(error.retryable).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: For any retryable error, the error object should
   * have retryable flag set to true
   * 
   * Requirements: 7.5
   */
  it('should set retryable flag correctly for all error codes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(PDFJSErrorCode)),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          const expectedRetryable = isRetryable(errorCode);
          
          // Property: retryable flag should match isRetryable function
          expect(error.retryable).toBe(expectedRetryable);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: For any error with custom message, retry availability
   * should be determined by error code, not message content
   * 
   * Requirements: 7.5
   */
  it('should determine retry availability by error code regardless of message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(PDFJSErrorCode)),
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorCode, customMessage) => {
          const error = createPDFJSError(errorCode, customMessage);
          const expectedRetryable = isRetryable(errorCode);
          
          // Property: Custom message should not affect retryable status
          expect(error.retryable).toBe(expectedRetryable);
          
          if (expectedRetryable) {
            expect(getMaxRetryAttempts(errorCode)).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Network errors should always be retryable
   * 
   * Requirements: 7.5, 7.2
   */
  it('should make all network errors retryable', () => {
    const networkErrors = [
      PDFJSErrorCode.TIMEOUT,
      PDFJSErrorCode.NETWORK_ERROR,
      PDFJSErrorCode.MISSING_PDF,
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...networkErrors),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          
          // Property: All network errors should be retryable
          expect(error.retryable).toBe(true);
          expect(getMaxRetryAttempts(errorCode)).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: File errors should not be retryable
   * 
   * Requirements: 7.5, 7.4
   */
  it('should make file errors non-retryable', () => {
    const fileErrors = [
      PDFJSErrorCode.INVALID_PDF,
      PDFJSErrorCode.CORRUPTED_FILE,
      PDFJSErrorCode.UNSUPPORTED_FORMAT,
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...fileErrors),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          
          // Property: File errors should not be retryable
          expect(error.retryable).toBe(false);
          expect(getMaxRetryAttempts(errorCode)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Permission errors should not be retryable
   * 
   * Requirements: 7.5, 7.3
   */
  it('should make permission errors non-retryable', () => {
    const permissionErrors = [
      PDFJSErrorCode.PERMISSION_DENIED,
      PDFJSErrorCode.CORS_ERROR,
      PDFJSErrorCode.PASSWORD_REQUIRED,
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...permissionErrors),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          
          // Property: Permission errors should not be retryable
          expect(error.retryable).toBe(false);
          expect(getMaxRetryAttempts(errorCode)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Rendering errors should be retryable
   * 
   * Requirements: 7.5
   */
  it('should make rendering errors retryable', () => {
    const renderingErrors = [
      PDFJSErrorCode.RENDER_ERROR,
      PDFJSErrorCode.CANVAS_CONTEXT_ERROR,
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...renderingErrors),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          
          // Property: Rendering errors should be retryable
          expect(error.retryable).toBe(true);
          expect(getMaxRetryAttempts(errorCode)).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Library errors should be retryable
   * 
   * Requirements: 7.5
   */
  it('should make library errors retryable', () => {
    const libraryErrors = [
      PDFJSErrorCode.LIBRARY_UNAVAILABLE,
      PDFJSErrorCode.WORKER_INIT_ERROR,
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...libraryErrors),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          
          // Property: Library errors should be retryable
          expect(error.retryable).toBe(true);
          expect(getMaxRetryAttempts(errorCode)).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Max retry attempts should be reasonable (1-5)
   * for retryable errors
   * 
   * Requirements: 7.5
   */
  it('should provide reasonable retry attempts for retryable errors', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(PDFJSErrorCode)),
        (errorCode) => {
          const maxAttempts = getMaxRetryAttempts(errorCode);
          const retryable = isRetryable(errorCode);
          
          if (retryable) {
            // Property: Retryable errors should have 1-5 retry attempts
            expect(maxAttempts).toBeGreaterThanOrEqual(1);
            expect(maxAttempts).toBeLessThanOrEqual(5);
          } else {
            // Property: Non-retryable errors should have 0 attempts
            expect(maxAttempts).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  /**
   * Property: Consistency between error object and helper functions
   * 
   * Requirements: 7.5
   */
  it('should maintain consistency between error object and helper functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(PDFJSErrorCode)),
        (errorCode) => {
          const error = createPDFJSError(errorCode);
          const helperRetryable = isRetryable(errorCode);
          const helperMaxAttempts = getMaxRetryAttempts(errorCode);
          
          // Property: Error object should match helper functions
          expect(error.retryable).toBe(helperRetryable);
          
          if (helperRetryable) {
            expect(helperMaxAttempts).toBeGreaterThan(0);
          } else {
            expect(helperMaxAttempts).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
