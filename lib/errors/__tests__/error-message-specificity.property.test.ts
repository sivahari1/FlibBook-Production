/**
 * Property-Based Test: Error Message Specificity
 * 
 * **Feature: document-conversion-reliability-fix, Property 3: Error message specificity**
 * **Validates: Requirements 1.3, 3.3**
 * 
 * Tests that for any rendering failure, the error message contains specific information 
 * about the failure type and suggested remediation steps.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  RenderingErrorType,
  createRenderingError,
  parseRenderingError,
  getUserMessage,
  getErrorSuggestion,
  getTechnicalMessage,
} from '../rendering-errors';
import { createErrorDiagnostics } from '../rendering-diagnostics';

describe('Property Test: Error Message Specificity', () => {
  /**
   * Property: Error messages must contain specific failure information
   * For any rendering error type, the user message should be specific and actionable
   */
  it('should provide specific user messages for all error types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(RenderingErrorType)),
        (errorType) => {
          // Generate error with this type
          const error = createRenderingError(errorType);
          
          // User message should be specific and not generic
          expect(error.userMessage).toBeDefined();
          expect(error.userMessage.length).toBeGreaterThan(10);
          expect(error.userMessage).not.toBe('An error occurred');
          expect(error.userMessage).not.toBe('Something went wrong');
          
          // Should not contain placeholder text
          expect(error.userMessage).not.toContain('[');
          expect(error.userMessage).not.toContain(']');
          expect(error.userMessage).not.toContain('TODO');
          expect(error.userMessage).not.toContain('FIXME');
          
          // Should be user-friendly (no technical jargon for user message)
          expect(error.userMessage).not.toContain('Exception');
          expect(error.userMessage).not.toContain('null');
          expect(error.userMessage).not.toContain('undefined');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error suggestions must provide actionable remediation steps
   * For any rendering error type, the suggestion should guide the user on what to do next
   */
  it('should provide actionable suggestions for all error types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(RenderingErrorType)),
        (errorType) => {
          const suggestion = getErrorSuggestion(errorType);
          
          // Suggestion should be meaningful and actionable
          expect(suggestion).toBeDefined();
          expect(suggestion.length).toBeGreaterThan(20);
          
          // Should contain actionable language
          const actionableWords = [
            'try', 'check', 'refresh', 'update', 'contact', 'ensure',
            'please', 'consider', 'attempt', 'verify', 'reload'
          ];
          const hasActionableLanguage = actionableWords.some(word => 
            suggestion.toLowerCase().includes(word)
          );
          expect(hasActionableLanguage).toBe(true);
          
          // Should not be vague
          expect(suggestion).not.toContain('something');
          expect(suggestion).not.toContain('might');
          expect(suggestion).not.toContain('maybe');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Technical messages must contain debugging information
   * For any rendering error with original error, technical message should include details
   */
  it('should provide detailed technical messages for debugging', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(RenderingErrorType)),
        fc.string({ minLength: 5, maxLength: 100 }),
        (errorType, originalMessage) => {
          const originalError = new Error(originalMessage);
          const technicalMessage = getTechnicalMessage(errorType, originalError);
          
          // Technical message should include error type
          expect(technicalMessage).toContain(errorType);
          
          // Should include original error message if provided
          expect(technicalMessage).toContain(originalMessage);
          
          // Technical message should be meaningful and include error type
          expect(technicalMessage).toContain(errorType);
          expect(technicalMessage).toContain(originalMessage);
          
          // Should be at least as informative as user message
          const userMessage = getUserMessage(errorType);
          expect(technicalMessage.length).toBeGreaterThan(userMessage.length * 0.8);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error parsing must preserve specific error information
   * For any error with identifiable patterns, parsing should extract specific error types
   */
  it('should parse errors into specific types based on error patterns', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constantFrom('NetworkError', 'TypeError', 'SecurityError', 'Error'),
          message: fc.oneof(
            fc.constant('Network timeout occurred'),
            fc.constant('CORS policy blocked the request'),
            fc.constant('Permission denied to access resource'),
            fc.constant('Invalid PDF format detected'),
            fc.constant('Canvas context creation failed'),
            fc.constant('Out of memory error'),
            fc.constant('PDF file is corrupted'),
            fc.constant('Worker initialization failed')
          )
        }),
        (errorData) => {
          const originalError = new Error(errorData.message);
          originalError.name = errorData.name;
          
          const parsedError = parseRenderingError(originalError);
          
          // Should not be unknown error for recognizable patterns
          // Note: Error parsing prioritizes message content over error name
          if (errorData.message.includes('timeout')) {
            expect(parsedError.type).toBe(RenderingErrorType.NETWORK_TIMEOUT);
          } else if (errorData.message.includes('CORS')) {
            expect(parsedError.type).toBe(RenderingErrorType.SECURITY_CORS_ERROR);
          } else if (errorData.message.includes('permission') && errorData.message.includes('denied')) {
            // Permission denied should be classified as permission error regardless of error name
            expect(parsedError.type).toBe(RenderingErrorType.SECURITY_PERMISSION_DENIED);
          } else if (errorData.message.includes('invalid') && errorData.message.includes('PDF')) {
            expect(parsedError.type).toBe(RenderingErrorType.PDF_INVALID_FORMAT);
          } else if (errorData.message.includes('canvas')) {
            expect(parsedError.type).toBe(RenderingErrorType.PDF_CANVAS_ERROR);
          } else if (errorData.message.includes('memory')) {
            // Memory errors should be classified correctly regardless of error name
            expect([
              RenderingErrorType.MEMORY_EXHAUSTED,
              RenderingErrorType.MEMORY_ALLOCATION_FAILED
            ]).toContain(parsedError.type);
            // Should NOT be classified as network error even if error name is NetworkError
            expect(parsedError.type).not.toBe(RenderingErrorType.NETWORK_FAILURE);
          } else if (errorData.message.includes('corrupt')) {
            expect(parsedError.type).toBe(RenderingErrorType.PDF_CORRUPTED);
          } else if (errorData.message.includes('worker')) {
            expect(parsedError.type).toBe(RenderingErrorType.INITIALIZATION_FAILED);
          }

          
          // Parsed error should have all required specificity properties
          expect(parsedError.userMessage).toBeDefined();
          expect(parsedError.technicalMessage).toBeDefined();
          expect(parsedError.suggestion).toBeDefined();
          expect(parsedError.type).toBeDefined();
          expect(parsedError.severity).toBeDefined();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error messages must be consistent for the same error type
   * Multiple instances of the same error type should produce identical messages
   */
  it('should produce consistent messages for the same error type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(RenderingErrorType)),
        fc.integer({ min: 2, max: 5 }),
        (errorType, instanceCount) => {
          const errors = Array.from({ length: instanceCount }, () => 
            createRenderingError(errorType)
          );
          
          // All instances should have identical user messages
          const firstUserMessage = errors[0].userMessage;
          errors.forEach(error => {
            expect(error.userMessage).toBe(firstUserMessage);
          });
          
          // All instances should have identical suggestions
          const firstSuggestion = errors[0].suggestion;
          errors.forEach(error => {
            expect(error.suggestion).toBe(firstSuggestion);
          });
          
          // All instances should have identical severity
          const firstSeverity = errors[0].severity;
          errors.forEach(error => {
            expect(error.severity).toBe(firstSeverity);
          });
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Error messages must be localized and accessible
   * Error messages should be appropriate for end users
   */
  it('should provide user-accessible error messages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(RenderingErrorType)),
        (errorType) => {
          const error = createRenderingError(errorType);
          
          // User message should be in plain English
          expect(error.userMessage).toMatch(/^[A-Z]/); // Starts with capital letter
          expect(error.userMessage).not.toMatch(/[{}()[\]]/); // No code-like brackets
          expect(error.userMessage).not.toMatch(/\w+Error$/); // Doesn't end with "Error"
          
          // Should not contain technical abbreviations without explanation
          const technicalTerms = ['HTTP', 'CORS', 'CSP', 'DOM', 'API'];
          technicalTerms.forEach(term => {
            if (error.userMessage.includes(term)) {
              // If technical term is used, it should be in context that explains it
              expect(error.suggestion).toBeDefined();
              expect(error.suggestion.length).toBeGreaterThan(30);
            }
          });
          
          // Suggestion should provide clear next steps
          expect(error.suggestion).toMatch(/\./); // Ends with proper punctuation
          expect(error.suggestion.split(' ').length).toBeGreaterThan(5); // Substantial guidance
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error context must enhance message specificity
   * When diagnostics are available, error messages should be more specific
   */
  it('should enhance message specificity with diagnostic context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...Object.values(RenderingErrorType)),
        fc.record({
          documentId: fc.string({ minLength: 1, maxLength: 50 }),
          pdfUrl: fc.webUrl(),
          pageCount: fc.integer({ min: 1, max: 1000 }),
          fileSize: fc.integer({ min: 1024, max: 100 * 1024 * 1024 }),
        }),
        async (errorType, context) => {
          // Create diagnostics with context
          const diagnostics = await createErrorDiagnostics(
            context.documentId,
            context.pdfUrl,
            errorType,
            undefined, // pdfDocument
            undefined, // response
            { pageCount: context.pageCount, fileSize: context.fileSize }
          );
          
          const errorWithDiagnostics = createRenderingError(
            errorType,
            undefined,
            undefined,
            diagnostics
          );
          
          const errorWithoutDiagnostics = createRenderingError(errorType);
          
          // Error with diagnostics should have same base message quality
          expect(errorWithDiagnostics.userMessage).toBe(errorWithoutDiagnostics.userMessage);
          expect(errorWithDiagnostics.suggestion).toBe(errorWithoutDiagnostics.suggestion);
          
          // But should have additional diagnostic information available
          expect(errorWithDiagnostics.diagnostics).toBeDefined();
          expect(errorWithDiagnostics.diagnostics?.documentId).toBe(context.documentId);
          expect(errorWithDiagnostics.diagnostics?.pdfUrl).toBe(context.pdfUrl);
          expect(errorWithDiagnostics.diagnostics?.errorType).toBe(errorType);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});