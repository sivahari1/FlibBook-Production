/**
 * Property-Based Tests for PDF.js Error Messages
 * 
 * Feature: pdf-iframe-blocking-fix, Property 4: Error message clarity
 * 
 * Property: For any PDF.js error, the system should display a user-friendly
 * error message that explains the issue
 * 
 * Validates: Requirements 2.4, 7.1
 * 
 * This property tests that all error messages are clear, user-friendly,
 * and provide actionable information to users. It verifies that error
 * messages meet clarity criteria across all error types.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  PDFJSErrorCode,
  PDFJSErrorCategory,
  createPDFJSError,
  parsePDFJSError,
  getUserMessage,
  getErrorSuggestion,
} from '../pdfjs-errors';

/**
 * Check if a message is clear and user-friendly
 * 
 * Criteria for clarity:
 * 1. Non-empty
 * 2. Reasonable length (not too short, not too long)
 * 3. No technical jargon or error codes in user message
 * 4. Starts with capital letter
 * 5. Contains meaningful words
 */
function isMessageClear(message: string): boolean {
  // Must be non-empty
  if (!message || message.trim().length === 0) {
    return false;
  }

  // Must be reasonable length (at least 10 characters, max 200)
  if (message.length < 10 || message.length > 200) {
    return false;
  }

  // Should start with capital letter
  if (!/^[A-Z]/.test(message)) {
    return false;
  }

  // Should not contain technical error codes or stack traces
  if (/\b(0x[0-9a-fA-F]+|Error:|at\s+\w+\s+\(|stack trace)/i.test(message)) {
    return false;
  }

  // Should contain at least one meaningful word (3+ letters)
  if (!/\b\w{3,}\b/.test(message)) {
    return false;
  }

  return true;
}

/**
 * Check if a suggestion is helpful
 * 
 * Criteria for helpful suggestions:
 * 1. Non-empty
 * 2. Provides actionable advice
 * 3. Uses friendly language
 * 4. Reasonable length
 */
function isSuggestionHelpful(suggestion: string): boolean {
  // Must be non-empty
  if (!suggestion || suggestion.trim().length === 0) {
    return false;
  }

  // Must be reasonable length (at least 20 characters)
  if (suggestion.length < 20) {
    return false;
  }

  // Should contain actionable words or helpful phrases
  const actionableWords = [
    'try',
    'check',
    'please',
    'ensure',
    'contact',
    'refresh',
    'reload',
    'verify',
    'may',
    'might',
    'could',
    'requires',
    'not currently supported',
    'moved or deleted',
    'expired',
    'owner',
    'support',
  ];
  const hasActionableWord = actionableWords.some((word) =>
    suggestion.toLowerCase().includes(word)
  );

  if (!hasActionableWord) {
    return false;
  }

  return true;
}

describe('PDF.js Error Messages - Property-Based Tests', () => {
  /**
   * Feature: pdf-iframe-blocking-fix, Property 4: Error message clarity
   * 
   * Property: For any PDF.js error code, the user message should be clear
   * and user-friendly
   * 
   * Validates: Requirements 2.4, 7.1
   */
  describe('Property 4: Error message clarity', () => {
    it('should provide clear user messages for all error codes', () => {
      fc.assert(
        fc.property(
          // Generate all possible error codes
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          (errorCode) => {
            // Get user message for this error code
            const userMessage = getUserMessage(errorCode);

            // Verify message is clear and user-friendly
            expect(isMessageClear(userMessage)).toBe(true);

            // Verify message is not empty
            expect(userMessage).toBeTruthy();
            expect(userMessage.length).toBeGreaterThan(0);

            // Verify message doesn't contain technical details
            expect(userMessage).not.toMatch(/\b(0x[0-9a-fA-F]+|Error:|stack)/i);

            // Verify message is concise (not too long)
            expect(userMessage.length).toBeLessThanOrEqual(200);

            // Verify message starts with capital letter
            expect(userMessage[0]).toMatch(/[A-Z]/);
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in design
          verbose: true,
        }
      );
    });

    it('should provide helpful suggestions for all error codes', () => {
      fc.assert(
        fc.property(
          // Generate all possible error codes
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          (errorCode) => {
            // Get suggestion for this error code
            const suggestion = getErrorSuggestion(errorCode);

            // Verify suggestion is helpful
            expect(isSuggestionHelpful(suggestion)).toBe(true);

            // Verify suggestion is not empty
            expect(suggestion).toBeTruthy();
            expect(suggestion.length).toBeGreaterThan(0);

            // Verify suggestion provides actionable advice or clear explanation
            const actionableWords = [
              'try',
              'check',
              'please',
              'ensure',
              'contact',
              'refresh',
              'reload',
              'verify',
              'may',
              'might',
              'could',
              'requires',
              'not currently supported',
              'not supported',
            ];
            const hasActionableWord = actionableWords.some((word) =>
              suggestion.toLowerCase().includes(word)
            );
            expect(hasActionableWord).toBe(true);

            // Verify suggestion is reasonably detailed
            expect(suggestion.length).toBeGreaterThanOrEqual(20);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should create error objects with clear messages for any error code', () => {
      fc.assert(
        fc.property(
          // Generate error code and optional custom message
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
          (errorCode, customMessage) => {
            // Create error object
            const error = createPDFJSError(errorCode, customMessage);

            // Verify user message is always clear
            expect(isMessageClear(error.userMessage)).toBe(true);

            // Verify suggestion is always helpful
            expect(isSuggestionHelpful(error.suggestion)).toBe(true);

            // Verify error has all required fields
            expect(error.code).toBe(errorCode);
            expect(error.category).toBeTruthy();
            expect(error.message).toBeTruthy();
            expect(error.userMessage).toBeTruthy();
            expect(error.suggestion).toBeTruthy();
            expect(typeof error.recoverable).toBe('boolean');
            expect(typeof error.retryable).toBe('boolean');

            // If custom message provided, it should be used as message
            if (customMessage) {
              expect(error.message).toBe(customMessage);
            }

            // User message should always be the standard friendly message
            expect(error.userMessage).toBe(getUserMessage(errorCode));
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should parse errors and provide clear messages for various error types', () => {
      fc.assert(
        fc.property(
          // Generate various error scenarios
          fc.oneof(
            // PDF.js specific errors
            fc.record({
              name: fc.constantFrom(
                'InvalidPDFException',
                'MissingPDFException',
                'UnexpectedResponseException',
                'PasswordException',
                'AbortException',
                'RenderingCancelledException'
              ),
              message: fc.string({ minLength: 10, maxLength: 100 }),
            }),
            // Generic errors with keywords
            fc.record({
              name: fc.constant('Error'),
              message: fc.oneof(
                fc.constant('Request timeout'),
                fc.constant('Network fetch failed'),
                fc.constant('CORS policy blocked'),
                fc.constant('Permission denied'),
                fc.constant('File is corrupted'),
                fc.constant('Canvas context error'),
                fc.constant('Worker initialization failed')
              ),
            }),
            // Unknown errors
            fc.record({
              name: fc.constant('Error'),
              message: fc.string({ minLength: 10, maxLength: 100 }),
            })
          ),
          (errorData) => {
            // Create Error object
            const error = new Error(errorData.message);
            error.name = errorData.name;

            // Parse error
            const parsedError = parsePDFJSError(error);

            // Verify parsed error has clear message
            expect(isMessageClear(parsedError.userMessage)).toBe(true);

            // Verify parsed error has helpful suggestion
            expect(isSuggestionHelpful(parsedError.suggestion)).toBe(true);

            // Verify all required fields are present
            expect(parsedError.code).toBeTruthy();
            expect(parsedError.category).toBeTruthy();
            expect(parsedError.message).toBeTruthy();
            expect(parsedError.userMessage).toBeTruthy();
            expect(parsedError.suggestion).toBeTruthy();
            expect(typeof parsedError.recoverable).toBe('boolean');
            expect(typeof parsedError.retryable).toBe('boolean');

            // Verify original error is preserved
            expect(parsedError.originalError).toBe(error);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should provide category-specific clear messages', () => {
      fc.assert(
        fc.property(
          // Generate error codes grouped by category
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          (errorCode) => {
            // Create error
            const error = createPDFJSError(errorCode);

            // Get expected category
            const category = error.category;

            // Verify message is appropriate for category
            switch (category) {
              case PDFJSErrorCategory.NETWORK:
                // Network errors should mention connection or network
                expect(
                  error.userMessage.toLowerCase().includes('network') ||
                    error.userMessage.toLowerCase().includes('connection') ||
                    error.userMessage.toLowerCase().includes('loading') ||
                    error.userMessage.toLowerCase().includes('timeout') ||
                    error.userMessage.toLowerCase().includes('not found')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.PERMISSION:
                // Permission errors should mention access or permission
                expect(
                  error.userMessage.toLowerCase().includes('access') ||
                    error.userMessage.toLowerCase().includes('permission') ||
                    error.userMessage.toLowerCase().includes('denied') ||
                    error.userMessage.toLowerCase().includes('blocked') ||
                    error.userMessage.toLowerCase().includes('password')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.FILE:
                // File errors should mention file or PDF
                expect(
                  error.userMessage.toLowerCase().includes('file') ||
                    error.userMessage.toLowerCase().includes('pdf') ||
                    error.userMessage.toLowerCase().includes('invalid') ||
                    error.userMessage.toLowerCase().includes('corrupted') ||
                    error.userMessage.toLowerCase().includes('format')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.RENDERING:
                // Rendering errors should mention render or display
                expect(
                  error.userMessage.toLowerCase().includes('render') ||
                    error.userMessage.toLowerCase().includes('display') ||
                    error.userMessage.toLowerCase().includes('canvas') ||
                    error.userMessage.toLowerCase().includes('page')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.LIBRARY:
                // Library errors should mention viewer or library
                expect(
                  error.userMessage.toLowerCase().includes('viewer') ||
                    error.userMessage.toLowerCase().includes('library') ||
                    error.userMessage.toLowerCase().includes('worker') ||
                    error.userMessage.toLowerCase().includes('unavailable')
                ).toBe(true);
                break;
            }

            // All messages should be clear regardless of category
            expect(isMessageClear(error.userMessage)).toBe(true);
            expect(isSuggestionHelpful(error.suggestion)).toBe(true);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should provide clear messages that avoid technical jargon', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          (errorCode) => {
            const error = createPDFJSError(errorCode);

            // Technical terms to avoid in user messages
            const technicalTerms = [
              'exception',
              'null pointer',
              'undefined',
              'stack trace',
              'heap',
              'buffer overflow',
              'segfault',
              'xhr',
              'http status',
              'errno',
              '0x',
            ];

            // User message should not contain technical jargon
            const userMessageLower = error.userMessage.toLowerCase();
            technicalTerms.forEach((term) => {
              expect(userMessageLower).not.toContain(term);
            });

            // Message should be clear
            expect(isMessageClear(error.userMessage)).toBe(true);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should provide suggestions that match the error category', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          (errorCode) => {
            const error = createPDFJSError(errorCode);

            // Verify suggestion is relevant to the error category
            switch (error.category) {
              case PDFJSErrorCategory.NETWORK:
                // Network suggestions should mention connection, retry, or file issues
                expect(
                  error.suggestion.toLowerCase().includes('connection') ||
                    error.suggestion.toLowerCase().includes('internet') ||
                    error.suggestion.toLowerCase().includes('try again') ||
                    error.suggestion.toLowerCase().includes('retry') ||
                    error.suggestion.toLowerCase().includes('moved') ||
                    error.suggestion.toLowerCase().includes('deleted') ||
                    error.suggestion.toLowerCase().includes('expired') ||
                    error.suggestion.toLowerCase().includes('link')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.PERMISSION:
                // Permission suggestions should mention access, contact, or password
                expect(
                  error.suggestion.toLowerCase().includes('permission') ||
                    error.suggestion.toLowerCase().includes('access') ||
                    error.suggestion.toLowerCase().includes('contact') ||
                    error.suggestion.toLowerCase().includes('owner') ||
                    error.suggestion.toLowerCase().includes('password') ||
                    error.suggestion.toLowerCase().includes('not currently supported') ||
                    error.suggestion.toLowerCase().includes('security')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.FILE:
                // File suggestions should mention file or upload
                expect(
                  error.suggestion.toLowerCase().includes('file') ||
                    error.suggestion.toLowerCase().includes('upload') ||
                    error.suggestion.toLowerCase().includes('pdf') ||
                    error.suggestion.toLowerCase().includes('document')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.RENDERING:
                // Rendering suggestions should mention refresh or browser
                expect(
                  error.suggestion.toLowerCase().includes('refresh') ||
                    error.suggestion.toLowerCase().includes('browser') ||
                    error.suggestion.toLowerCase().includes('page')
                ).toBe(true);
                break;

              case PDFJSErrorCategory.LIBRARY:
                // Library suggestions should mention refresh or reload
                expect(
                  error.suggestion.toLowerCase().includes('refresh') ||
                    error.suggestion.toLowerCase().includes('reload') ||
                    error.suggestion.toLowerCase().includes('page')
                ).toBe(true);
                break;
            }

            // All suggestions should be helpful
            expect(isSuggestionHelpful(error.suggestion)).toBe(true);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should maintain message clarity when errors are created with custom messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(PDFJSErrorCode)),
          fc.string({ minLength: 5, maxLength: 200 }),
          (errorCode, customMessage) => {
            // Create error with custom message
            const error = createPDFJSError(errorCode, customMessage);

            // User message should still be clear (uses standard message)
            expect(isMessageClear(error.userMessage)).toBe(true);

            // Suggestion should still be helpful
            expect(isSuggestionHelpful(error.suggestion)).toBe(true);

            // Custom message is stored in message field
            expect(error.message).toBe(customMessage);

            // But userMessage is always the standard friendly message
            expect(error.userMessage).toBe(getUserMessage(errorCode));

            // This ensures users always see clear messages
            // even if internal errors have technical details
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
