/**
 * Property-Based Test: Error Detection Accuracy
 * 
 * **Feature: document-conversion-reliability-fix, Property 8: Error detection accuracy**
 * **Validates: Requirements 2.4**
 * 
 * Tests that for any corrupted or invalid PDF, the system detects the issue 
 * and provides specific error feedback.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  RenderingErrorType,
  createRenderingError,
  parseRenderingError,
  isRecoverable,
  isRetryable,
} from '../rendering-errors';
import { createErrorDiagnostics } from '../rendering-diagnostics';

describe('Property Test: Error Detection Accuracy', () => {
  /**
   * Property: Corrupted PDF detection must be accurate
   * For any PDF with corruption indicators, the system should detect and classify it correctly
   */
  it('should accurately detect corrupted PDF files', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorMessage: fc.oneof(
            fc.constant('PDF file is corrupted'),
            fc.constant('File appears to be damaged'),
            fc.constant('Corrupted PDF data detected'),
            fc.constant('PDF structure is damaged'),
            fc.constant('Invalid PDF header - file may be corrupted'),
            fc.constant('PDF parsing failed due to corruption')
          ),
          errorName: fc.constantFrom('Error', 'PDFError', 'ParseError', 'FileError'),
        }),
        (errorData) => {
          const originalError = new Error(errorData.errorMessage);
          originalError.name = errorData.errorName;
          
          const parsedError = parseRenderingError(originalError);
          
          // Should be classified as corrupted PDF
          expect(parsedError.type).toBe(RenderingErrorType.PDF_CORRUPTED);
          
          // Should not be recoverable (corrupted files can't be fixed by retrying)
          expect(parsedError.recoverable).toBe(false);
          expect(parsedError.retryable).toBe(false);
          
          // Should have high severity
          expect(parsedError.severity).toBe('high');
          
          // Should provide specific user message
          expect(parsedError.userMessage).toContain('corrupted');
          
          // Should provide actionable suggestion
          expect(parsedError.suggestion).toBeDefined();
          expect(parsedError.suggestion.length).toBeGreaterThan(20);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid PDF format detection must be accurate
   * For any file with invalid PDF format indicators, the system should detect it correctly
   */
  it('should accurately detect invalid PDF format', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorMessage: fc.oneof(
            fc.constant('Invalid PDF format'),
            fc.constant('Not a valid PDF file'),
            fc.constant('PDF format not recognized'),
            fc.constant('Invalid PDF document structure'),
            fc.constant('File is not a PDF document'),
            fc.constant('Unsupported file format - expected PDF')
          ),
          errorName: fc.constantFrom('Error', 'TypeError', 'FormatError', 'ValidationError'),
        }),
        (errorData) => {
          const originalError = new Error(errorData.errorMessage);
          originalError.name = errorData.errorName;
          
          const parsedError = parseRenderingError(originalError);
          
          // Should be classified as invalid PDF format
          expect(parsedError.type).toBe(RenderingErrorType.PDF_INVALID_FORMAT);
          
          // Should not be recoverable (invalid format can't be fixed by retrying)
          expect(parsedError.recoverable).toBe(false);
          expect(parsedError.retryable).toBe(false);
          
          // Should have high severity
          expect(parsedError.severity).toBe('high');
          
          // Should provide specific user message
          expect(parsedError.userMessage).toContain('valid');
          
          // Should provide actionable suggestion
          expect(parsedError.suggestion).toBeDefined();
          expect(parsedError.suggestion).toContain('PDF');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Password-protected PDF detection must be accurate
   * For any PDF with password protection indicators, the system should detect it correctly
   */
  it('should accurately detect password-protected PDFs', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorMessage: fc.oneof(
            fc.constant('PDF is password protected'),
            fc.constant('Password required to open PDF'),
            fc.constant('Document requires password'),
            fc.constant('Encrypted PDF - password needed'),
            fc.constant('Cannot open password-protected document'),
            fc.constant('PDF encryption detected')
          ),
          errorName: fc.constantFrom('PasswordException', 'SecurityError', 'EncryptionError', 'Error'),
        }),
        (errorData) => {
          const originalError = new Error(errorData.errorMessage);
          originalError.name = errorData.errorName;
          
          const parsedError = parseRenderingError(originalError);
          
          // Should be classified as password protected
          expect(parsedError.type).toBe(RenderingErrorType.PDF_PASSWORD_PROTECTED);
          
          // Should not be recoverable (password protection can't be bypassed)
          expect(parsedError.recoverable).toBe(false);
          expect(parsedError.retryable).toBe(false);
          
          // Should have high severity
          expect(parsedError.severity).toBe('high');
          
          // Should provide specific user message
          expect(parsedError.userMessage).toContain('password');
          
          // Should provide actionable suggestion
          expect(parsedError.suggestion).toBeDefined();
          expect(parsedError.suggestion).toContain('password');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error detection must distinguish between different error types
   * For any set of different error patterns, each should be classified uniquely
   */
  it('should distinguish between different error types accurately', () => {
    fc.assert(
      fc.property(
        fc.record({
          corruptedMessage: fc.constant('PDF file is corrupted'),
          invalidMessage: fc.constant('Invalid PDF format'),
          passwordMessage: fc.constant('PDF is password protected'),
          networkMessage: fc.constant('Network timeout occurred'),
          memoryMessage: fc.constant('Out of memory error'),
        }),
        (messages) => {
          const errors = [
            { message: messages.corruptedMessage, expectedType: RenderingErrorType.PDF_CORRUPTED },
            { message: messages.invalidMessage, expectedType: RenderingErrorType.PDF_INVALID_FORMAT },
            { message: messages.passwordMessage, expectedType: RenderingErrorType.PDF_PASSWORD_PROTECTED },
            { message: messages.networkMessage, expectedType: RenderingErrorType.NETWORK_TIMEOUT },
            { message: messages.memoryMessage, expectedType: RenderingErrorType.MEMORY_EXHAUSTED },
          ];
          
          const parsedErrors = errors.map(({ message, expectedType }) => {
            const originalError = new Error(message);
            const parsedError = parseRenderingError(originalError);
            return { parsedError, expectedType };
          });
          
          // Each error should be classified correctly
          parsedErrors.forEach(({ parsedError, expectedType }) => {
            expect(parsedError.type).toBe(expectedType);
          });
          
          // All error types should be different
          const types = parsedErrors.map(({ parsedError }) => parsedError.type);
          const uniqueTypes = new Set(types);
          expect(uniqueTypes.size).toBe(types.length);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error detection must be consistent across multiple attempts
   * For any error, multiple parsing attempts should yield identical results
   */
  it('should provide consistent error detection across multiple attempts', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.oneof(
            fc.constant('PDF file is corrupted'),
            fc.constant('Invalid PDF format'),
            fc.constant('PDF is password protected'),
            fc.constant('Network timeout occurred'),
            fc.constant('Canvas context creation failed')
          ),
          name: fc.constantFrom('Error', 'PDFError', 'NetworkError', 'SecurityError'),
          attempts: fc.integer({ min: 2, max: 5 }),
        }),
        (errorData) => {
          const results = Array.from({ length: errorData.attempts }, () => {
            const originalError = new Error(errorData.message);
            originalError.name = errorData.name;
            return parseRenderingError(originalError);
          });
          
          // All results should be identical
          const firstResult = results[0];
          results.forEach(result => {
            expect(result.type).toBe(firstResult.type);
            expect(result.severity).toBe(firstResult.severity);
            expect(result.userMessage).toBe(firstResult.userMessage);
            expect(result.suggestion).toBe(firstResult.suggestion);
            expect(result.recoverable).toBe(firstResult.recoverable);
            expect(result.retryable).toBe(firstResult.retryable);
          });
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error detection must handle edge cases gracefully
   * For any unusual error patterns, the system should still provide meaningful classification
   */
  it('should handle edge cases in error detection gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.oneof(
            fc.constant(''), // Empty message
            fc.constant('   '), // Whitespace only
            fc.constant('Unknown error'), // Generic message
            fc.constant('Something went wrong'), // Vague message
            fc.constant('Error: null'), // Null reference
            fc.constant('undefined is not a function'), // JavaScript error
            fc.constant('CORS policy blocked the request'), // Browser security
          ),
          name: fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'SecurityError'),
        }),
        (errorData) => {
          const originalError = new Error(errorData.message);
          originalError.name = errorData.name;
          
          const parsedError = parseRenderingError(originalError);
          
          // Should always produce a valid error type
          expect(parsedError.type).toBeDefined();
          expect(Object.values(RenderingErrorType)).toContain(parsedError.type);
          
          // Should always have a user message
          expect(parsedError.userMessage).toBeDefined();
          expect(parsedError.userMessage.length).toBeGreaterThan(0);
          
          // Should always have a suggestion
          expect(parsedError.suggestion).toBeDefined();
          expect(parsedError.suggestion.length).toBeGreaterThan(0);
          
          // Should have valid severity
          expect(['low', 'medium', 'high', 'critical']).toContain(parsedError.severity);
          
          // Should have boolean flags
          expect(typeof parsedError.recoverable).toBe('boolean');
          expect(typeof parsedError.retryable).toBe('boolean');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error detection with diagnostic context must enhance accuracy
   * For any error with additional context, detection should be more accurate
   */
  it('should enhance error detection accuracy with diagnostic context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          pdfUrl: fc.webUrl(),
          errorMessage: fc.oneof(
            fc.constant('PDF file is corrupted'),
            fc.constant('Invalid PDF format'),
            fc.constant('Network timeout occurred')
          ),
          fileSize: fc.integer({ min: 0, max: 100 * 1024 * 1024 }),
          pageCount: fc.integer({ min: 0, max: 1000 }),
        }),
        async (testData) => {
          const originalError = new Error(testData.errorMessage);
          
          // Create diagnostics with context
          const diagnostics = await createErrorDiagnostics(
            testData.documentId,
            testData.pdfUrl,
            RenderingErrorType.UNKNOWN_ERROR, // Will be determined by parsing
            undefined, // pdfDocument
            undefined, // response
            { 
              fileSize: testData.fileSize,
              pageCount: testData.pageCount,
            }
          );
          
          const parsedErrorWithContext = parseRenderingError(originalError, diagnostics);
          const parsedErrorWithoutContext = parseRenderingError(originalError);
          
          // Both should have the same classification (context doesn't change type)
          expect(parsedErrorWithContext.type).toBe(parsedErrorWithoutContext.type);
          
          // Error with context should have diagnostic information
          expect(parsedErrorWithContext.diagnostics).toBeDefined();
          expect(parsedErrorWithContext.diagnostics?.documentId).toBe(testData.documentId);
          expect(parsedErrorWithContext.diagnostics?.pdfUrl).toBe(testData.pdfUrl);
          
          // Both should have the same user-facing properties
          expect(parsedErrorWithContext.userMessage).toBe(parsedErrorWithoutContext.userMessage);
          expect(parsedErrorWithContext.suggestion).toBe(parsedErrorWithoutContext.suggestion);
          expect(parsedErrorWithContext.severity).toBe(parsedErrorWithoutContext.severity);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error detection must preserve original error information
   * For any error, the parsed result should maintain reference to original error
   */
  it('should preserve original error information during detection', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 5, maxLength: 100 }),
          name: fc.string({ minLength: 3, maxLength: 20 }),
          stack: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
        }),
        (errorData) => {
          const originalError = new Error(errorData.message);
          originalError.name = errorData.name;
          if (errorData.stack) {
            originalError.stack = errorData.stack;
          }
          
          const parsedError = parseRenderingError(originalError);
          
          // Should preserve original error
          expect(parsedError.originalError).toBe(originalError);
          
          // Should preserve original message in technical message
          expect(parsedError.technicalMessage).toContain(errorData.message);
          
          // Should have error name in technical message
          expect(parsedError.technicalMessage).toContain(parsedError.type);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});