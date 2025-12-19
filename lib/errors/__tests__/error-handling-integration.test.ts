/**
 * Integration Test: Error Handling System
 * 
 * Tests the complete error handling and diagnostics system integration
 * Requirements: 1.3, 2.4, 3.3
 */

import { describe, it, expect } from 'vitest';
import {
  RenderingErrorType,
  createRenderingError,
  parseRenderingError,
} from '../rendering-errors';
import { createErrorDiagnostics } from '../rendering-diagnostics';
import { DefaultErrorRecoveryStrategy, retryWithRecovery } from '../error-recovery';

describe('Error Handling System Integration', () => {
  it('should handle complete error workflow from detection to recovery', async () => {
    // 1. Simulate a network timeout error
    const originalError = new Error('Network timeout occurred while loading PDF');
    originalError.name = 'NetworkError';
    
    // 2. Parse the error
    const parsedError = parseRenderingError(originalError);
    
    // 3. Verify error classification
    expect(parsedError.type).toBe(RenderingErrorType.NETWORK_TIMEOUT);
    expect(parsedError.severity).toBe('medium');
    expect(parsedError.retryable).toBe(true);
    expect(parsedError.recoverable).toBe(true);
    
    // 4. Test error recovery
    const recoveryStrategy = new DefaultErrorRecoveryStrategy();
    expect(recoveryStrategy.canRecover(parsedError)).toBe(true);
    
    const fallbackOptions = recoveryStrategy.getFallbackOptions(parsedError);
    expect(fallbackOptions.length).toBeGreaterThan(0);
    expect(fallbackOptions[0].type).toBe('retry');
    
    // 5. Test retry with recovery
    let attemptCount = 0;
    const mockOperation = async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw parsedError;
      }
      return 'success';
    };
    
    const result = await retryWithRecovery(mockOperation, recoveryStrategy, 3);
    expect(result).toBe('success');
    expect(attemptCount).toBe(3);
  }, 10000);

  it('should handle non-recoverable errors correctly', async () => {
    // 1. Simulate a corrupted PDF error
    const originalError = new Error('PDF file is corrupted and cannot be read');
    originalError.name = 'PDFError';
    
    // 2. Parse the error
    const parsedError = parseRenderingError(originalError);
    
    // 3. Verify error classification
    expect(parsedError.type).toBe(RenderingErrorType.PDF_CORRUPTED);
    expect(parsedError.severity).toBe('high');
    expect(parsedError.retryable).toBe(false);
    expect(parsedError.recoverable).toBe(false);
    
    // 4. Test error recovery
    const recoveryStrategy = new DefaultErrorRecoveryStrategy();
    expect(recoveryStrategy.canRecover(parsedError)).toBe(false);
    
    const fallbackOptions = recoveryStrategy.getFallbackOptions(parsedError);
    expect(fallbackOptions.length).toBeGreaterThan(0);
    expect(fallbackOptions[0].type).toBe('contact_support');
    
    // 5. Test that retry with recovery doesn't retry non-retryable errors
    let attemptCount = 0;
    const mockOperation = async () => {
      attemptCount++;
      throw parsedError;
    };
    
    await expect(retryWithRecovery(mockOperation, recoveryStrategy, 3))
      .rejects.toThrow('PDF file is corrupted and cannot be read');
    expect(attemptCount).toBe(1); // Should not retry
  });

  it('should provide specific error messages and suggestions', () => {
    const testCases = [
      {
        error: new Error('PDF file is corrupted'),
        expectedType: RenderingErrorType.PDF_CORRUPTED,
        expectedMessageContains: 'corrupted',
        expectedSuggestionContains: 'damaged',
      },
      {
        error: new Error('Invalid PDF format'),
        expectedType: RenderingErrorType.PDF_INVALID_FORMAT,
        expectedMessageContains: 'valid',
        expectedSuggestionContains: 'pdf',
      },
      {
        error: new Error('PDF is password protected'),
        expectedType: RenderingErrorType.PDF_PASSWORD_PROTECTED,
        expectedMessageContains: 'password',
        expectedSuggestionContains: 'password',
      },
      {
        error: new Error('Network timeout occurred'),
        expectedType: RenderingErrorType.NETWORK_TIMEOUT,
        expectedMessageContains: 'long',
        expectedSuggestionContains: 'connection',
      },
    ];

    testCases.forEach(({ error, expectedType, expectedMessageContains, expectedSuggestionContains }) => {
      const parsedError = parseRenderingError(error);
      
      expect(parsedError.type).toBe(expectedType);
      expect(parsedError.userMessage.toLowerCase()).toContain(expectedMessageContains);
      expect(parsedError.suggestion.toLowerCase()).toContain(expectedSuggestionContains);
      expect(parsedError.userMessage.length).toBeGreaterThan(10);
      expect(parsedError.suggestion.length).toBeGreaterThan(20);
    });
  });

  it('should handle error classification edge cases', () => {
    const edgeCases = [
      {
        name: 'NetworkError',
        message: 'Out of memory error', // Network error name but memory message
        expectedType: RenderingErrorType.MEMORY_EXHAUSTED,
      },
      {
        name: 'Error',
        message: 'CORS policy blocked the request', // Generic error name but CORS message
        expectedType: RenderingErrorType.SECURITY_CORS_ERROR,
      },
      {
        name: 'SecurityError',
        message: 'PDF file is corrupted', // Security error name but corruption message
        expectedType: RenderingErrorType.PDF_CORRUPTED,
      },
    ];

    edgeCases.forEach(({ name, message, expectedType }) => {
      const error = new Error(message);
      error.name = name;
      
      const parsedError = parseRenderingError(error);
      expect(parsedError.type).toBe(expectedType);
    });
  });
});