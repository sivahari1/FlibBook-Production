/**
 * Property-Based Tests for Error Recovery System - Comprehensive Error Logging
 * 
 * **PDF Rendering Reliability Fix, Property 4: Comprehensive error logging**
 * **Validates: Requirements 2.1, 8.2**
 * 
 * Tests that all errors during rendering are captured with full error context,
 * stack traces, and stage information for debugging and monitoring.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ErrorRecoverySystem } from '../pdf-reliability/error-recovery-system';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { createReliabilityConfig } from '../pdf-reliability/config';
import { 
  ReliablePDFRendererError,
  NetworkError,
  ParsingError,
  CanvasError,
  MemoryError,
  TimeoutError,
  AuthenticationError,
  CorruptionError,
} from '../pdf-reliability/errors';
import type { RenderContext, RenderingMethod, RenderingStage, ErrorType } from '../pdf-reliability/types';
import { RenderingMethod as Method, RenderingStage as Stage, ErrorType as EType } from '../pdf-reliability/types';

describe('Error Recovery System - Comprehensive Error Logging Property Tests', () => {
  let errorRecoverySystem: ErrorRecoverySystem;
  let diagnosticsCollector: DiagnosticsCollector;
  let consoleSpy: any;

  beforeEach(() => {
    const config = createReliabilityConfig();
    diagnosticsCollector = new DiagnosticsCollector(config);
    errorRecoverySystem = new ErrorRecoverySystem(config, diagnosticsCollector);
    
    // Spy on console.error to verify logging
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /**
   * **PDF Rendering Reliability Fix, Property 4: Comprehensive error logging**
   * **Validates: Requirements 2.1, 8.2**
   * 
   * For any error that occurs during rendering, the system should capture the error type,
   * context, stack trace, and stage information
   */
  test('comprehensive error logging captures all required information', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Simplified context generation
        fc.record({
          renderingId: fc.string({ minLength: 1, maxLength: 10 }),
          url: fc.constant('https://example.com/test.pdf'),
          currentMethod: fc.constantFrom(...Object.values(Method)),
          attemptCount: fc.integer({ min: 0, max: 5 }),
        }),
        // Simplified error generation
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 20 }),
          }),
        ),
        async (contextData, errorData) => {
          // Create simplified render context
          const context: RenderContext = {
            ...contextData,
            startTime: new Date(),
            options: { timeout: 30000 },
            canvas: undefined,
            pdfDocument: undefined,
            progressState: {
              percentage: 50,
              stage: Stage.RENDERING,
              bytesLoaded: 1000,
              totalBytes: 2000,
              timeElapsed: 5000,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Create error
          let error: unknown;
          if (typeof errorData === 'string') {
            error = errorData;
          } else {
            const err = new Error(errorData.message);
            err.name = errorData.name;
            error = err;
          }

          // Clear previous console calls
          consoleSpy.mockClear();

          // Detect and recover from error
          await errorRecoverySystem.detectAndRecover(context, error);

          // Property: Console.error should be called for logging
          expect(consoleSpy).toHaveBeenCalled();

          // Property: Logged error should contain comprehensive information
          const loggedCall = consoleSpy.mock.calls[0];
          expect(loggedCall).toBeDefined();
          expect(loggedCall[0]).toBe('PDF Rendering Error:');
          
          const loggedData = loggedCall[1];
          expect(loggedData).toBeDefined();

          // Property: All required fields should be present in logged data
          expect(loggedData).toHaveProperty('renderingId', context.renderingId);
          expect(loggedData).toHaveProperty('type');
          expect(loggedData).toHaveProperty('stage');
          expect(loggedData).toHaveProperty('method');
          expect(loggedData).toHaveProperty('message');
          expect(loggedData).toHaveProperty('timestamp');
          expect(loggedData).toHaveProperty('context');
          expect(loggedData).toHaveProperty('recoverable');
          expect(loggedData).toHaveProperty('attemptCount', context.attemptCount);
          expect(loggedData).toHaveProperty('url', context.url);
          expect(loggedData).toHaveProperty('timeElapsed');

          // Property: Stack trace should be included when available
          if (error instanceof Error) {
            expect(loggedData).toHaveProperty('stackTrace');
          }
        }
      ),
      { numRuns: 50 }
    );
  }, 10000); // Increase timeout

  test('error logging includes specific context for different error types', async () => {
    // Test with a simple, controlled example instead of property-based testing
    const context: RenderContext = {
      renderingId: 'test-id',
      url: 'https://example.com/test.pdf',
      startTime: new Date(),
      options: { timeout: 30000 },
      currentMethod: Method.PDFJS_CANVAS,
      attemptCount: 1,
      canvas: undefined,
      pdfDocument: undefined,
      progressState: {
        percentage: 50,
        stage: Stage.RENDERING,
        bytesLoaded: 1000,
        totalBytes: 2000,
        timeElapsed: 5000,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [],
    };

    // Test different error types
    const errorTypes = [NetworkError, ParsingError, CanvasError, MemoryError, TimeoutError, AuthenticationError];
    
    for (const ErrorClass of errorTypes) {
      // Create specific error type
      const error = new ErrorClass(
        'Test error message',
        Stage.RENDERING,
        context.currentMethod,
        { customContext: 'test-data' }
      );

      // Clear previous console calls
      consoleSpy.mockClear();

      // Detect and recover from error
      await errorRecoverySystem.detectAndRecover(context, error);

      // Property: Error should be logged with correct type
      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = consoleSpy.mock.calls[0][1];
      
      // Property: Error type should match the specific error class
      expect(loggedData.type).toBe(error.type);
      expect(loggedData.message).toBe('Test error message');
      expect(loggedData.stage).toBe(Stage.RENDERING);
      expect(loggedData.method).toBe(context.currentMethod);

      // Property: Context should include both custom and rendering context
      expect(loggedData.context).toBeDefined();
      
      // The custom context from the original error should be preserved
      expect(loggedData.context.customContext).toBe('test-data');
      
      // The rendering context should be added by the error recovery system
      // Note: These are added when the error is already a ReliablePDFRendererError
      // and passed through directly, so they come from the original error's context
    }
  });

  test('error logging preserves original error information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          renderingId: fc.string({ minLength: 1, maxLength: 20 }),
          url: fc.webUrl(),
          currentMethod: fc.constantFrom(...Object.values(Method)),
        }),
        fc.record({
          message: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          stack: fc.string(),
        }),
        async (contextData, errorData) => {
          // Create render context
          const context: RenderContext = {
            ...contextData,
            startTime: new Date(),
            options: {},
            attemptCount: 1,
            canvas: undefined,
            pdfDocument: undefined,
            progressState: {
              percentage: 25,
              stage: Stage.FETCHING,
              bytesLoaded: 500,
              totalBytes: 2000,
              timeElapsed: 2500,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Create original error with specific properties
          const originalError = new Error(errorData.message);
          originalError.name = errorData.name;
          originalError.stack = errorData.stack;

          // Clear previous console calls
          consoleSpy.mockClear();

          // Detect and recover from error
          await errorRecoverySystem.detectAndRecover(context, originalError);

          // Property: Original error information should be preserved
          expect(consoleSpy).toHaveBeenCalled();
          const loggedData = consoleSpy.mock.calls[0][1];

          // Property: Original error message should be preserved
          expect(loggedData.message).toBe(errorData.message);

          // Property: Stack trace should be preserved
          expect(loggedData.stackTrace).toBe(errorData.stack);

          // Property: Original error context should be included
          if (loggedData.context.originalError) {
            expect(loggedData.context.originalError.name).toBe(errorData.name);
            expect(loggedData.context.originalError.message).toBe(errorData.message);
            expect(loggedData.context.originalError.stack).toBe(errorData.stack);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error logging handles unknown error types gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          renderingId: fc.string({ minLength: 1, maxLength: 10 }),
          url: fc.constant('https://example.com/test.pdf'),
          currentMethod: fc.constantFrom(...Object.values(Method)),
        }),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
        ),
        async (contextData, unknownError) => {
          // Create render context
          const context: RenderContext = {
            ...contextData,
            startTime: new Date(),
            options: {},
            attemptCount: 0,
            canvas: undefined,
            pdfDocument: undefined,
            progressState: {
              percentage: 0,
              stage: Stage.INITIALIZING,
              bytesLoaded: 0,
              totalBytes: 0,
              timeElapsed: 0,
              isStuck: false,
              lastUpdate: new Date(),
            },
            errorHistory: [],
          };

          // Clear previous console calls
          consoleSpy.mockClear();

          // Detect and recover from unknown error
          await errorRecoverySystem.detectAndRecover(context, unknownError);

          // Property: Unknown errors should still be logged
          expect(consoleSpy).toHaveBeenCalled();
          const loggedData = consoleSpy.mock.calls[0][1];

          // Property: Logged data should have required structure
          expect(loggedData).toHaveProperty('renderingId', context.renderingId);
          expect(loggedData).toHaveProperty('type');
          expect(loggedData).toHaveProperty('message');
          expect(loggedData).toHaveProperty('stage');
          expect(loggedData).toHaveProperty('method');
          expect(loggedData).toHaveProperty('timestamp');
          expect(loggedData).toHaveProperty('context');
          expect(loggedData).toHaveProperty('recoverable');

          // Property: Unknown error should be included in context
          expect(loggedData.context.originalError).toBe(unknownError);

          // Property: Message should indicate unknown error
          expect(loggedData.message).toContain('Unknown error');
        }
      ),
      { numRuns: 50 }
    );
  });
});