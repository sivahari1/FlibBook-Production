/**
 * Property-Based Tests for Error Recovery System - Fresh Context on Retry
 * 
 * **PDF Rendering Reliability Fix, Property 3: Fresh context on retry**
 * **Validates: Requirements 1.5**
 * 
 * Tests that retry operations create completely new rendering contexts,
 * ensuring no state pollution from previous attempts.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ErrorRecoverySystem } from '../pdf-reliability/error-recovery-system';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { createReliabilityConfig } from '../pdf-reliability/config';
import type { RenderContext, RenderingMethod, RenderingStage } from '../pdf-reliability/types';
import { RenderingMethod as Method, RenderingStage as Stage } from '../pdf-reliability/types';

describe('Error Recovery System - Fresh Context Property Tests', () => {
  let errorRecoverySystem: ErrorRecoverySystem;
  let diagnosticsCollector: DiagnosticsCollector;

  beforeEach(() => {
    const config = createReliabilityConfig();
    diagnosticsCollector = new DiagnosticsCollector(config);
    errorRecoverySystem = new ErrorRecoverySystem(config, diagnosticsCollector);
  });

  /**
   * **PDF Rendering Reliability Fix, Property 3: Fresh context on retry**
   * **Validates: Requirements 1.5**
   * 
   * For any retry operation, the system should create a completely new rendering context,
   * ensuring no state pollution from previous attempts
   */
  test('fresh context on retry creates completely new context', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random render contexts
        fc.record({
          renderingId: fc.string({ minLength: 1, maxLength: 20 }),
          url: fc.webUrl(),
          options: fc.record({
            timeout: fc.integer({ min: 1000, max: 60000 }),
            preferredMethod: fc.constantFrom(...Object.values(Method)),
            fallbackEnabled: fc.boolean(),
            diagnosticsEnabled: fc.boolean(),
          }),
          currentMethod: fc.constantFrom(...Object.values(Method)),
          attemptCount: fc.integer({ min: 0, max: 10 }),
          progressState: fc.record({
            percentage: fc.integer({ min: 0, max: 100 }),
            stage: fc.constantFrom(...Object.values(Stage)),
            bytesLoaded: fc.integer({ min: 0, max: 1000000 }),
            totalBytes: fc.integer({ min: 0, max: 1000000 }),
            timeElapsed: fc.integer({ min: 0, max: 60000 }),
            isStuck: fc.boolean(),
            lastUpdate: fc.date(),
          }),
          errorHistory: fc.array(fc.record({
            type: fc.string(),
            message: fc.string(),
            stage: fc.constantFrom(...Object.values(Stage)),
            method: fc.constantFrom(...Object.values(Method)),
            timestamp: fc.date(),
            context: fc.object(),
            recoverable: fc.boolean(),
          })),
        }),
        async (contextData) => {
          // Create original context with current timestamp
          const originalContext: RenderContext = {
            ...contextData,
            startTime: new Date(),
            canvas: undefined,
            pdfDocument: undefined,
          };

          // Create fresh context
          const freshContext = errorRecoverySystem.createFreshContext(originalContext);

          // Property: Fresh context should have completely new identity
          expect(freshContext.renderingId).not.toBe(originalContext.renderingId);
          expect(freshContext.renderingId).toBeTruthy();

          // Property: Fresh context should have new start time
          expect(freshContext.startTime.getTime()).toBeGreaterThanOrEqual(originalContext.startTime.getTime());

          // Property: Fresh context should reset attempt count
          expect(freshContext.attemptCount).toBe(0);

          // Property: Fresh context should clear canvas reference
          expect(freshContext.canvas).toBeUndefined();

          // Property: Fresh context should clear PDF document reference
          expect(freshContext.pdfDocument).toBeUndefined();

          // Property: Fresh context should reset progress state
          expect(freshContext.progressState.percentage).toBe(0);
          expect(freshContext.progressState.stage).toBe(Stage.INITIALIZING);
          expect(freshContext.progressState.bytesLoaded).toBe(0);
          expect(freshContext.progressState.totalBytes).toBe(0);
          expect(freshContext.progressState.timeElapsed).toBe(0);
          expect(freshContext.progressState.isStuck).toBe(false);

          // Property: Fresh context should clear error history
          expect(freshContext.errorHistory).toEqual([]);

          // Property: Fresh context should preserve URL and options
          expect(freshContext.url).toBe(originalContext.url);
          expect(freshContext.options).toEqual(originalContext.options);
          expect(freshContext.currentMethod).toBe(originalContext.currentMethod);

          // Property: Fresh context should not share object references
          expect(freshContext.options).not.toBe(originalContext.options);
          expect(freshContext.progressState).not.toBe(originalContext.progressState);
          expect(freshContext.errorHistory).not.toBe(originalContext.errorHistory);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('fresh context maintains independence from original context mutations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          renderingId: fc.string({ minLength: 1, maxLength: 20 }),
          url: fc.webUrl(),
          options: fc.record({
            timeout: fc.integer({ min: 1000, max: 60000 }),
            preferredMethod: fc.constantFrom(...Object.values(Method)),
          }),
          currentMethod: fc.constantFrom(...Object.values(Method)),
          attemptCount: fc.integer({ min: 1, max: 5 }),
        }),
        async (contextData) => {
          // Create original context
          const originalContext: RenderContext = {
            ...contextData,
            startTime: new Date(),
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
            errorHistory: [{
              type: 'network-error' as any,
              message: 'Test error',
              stage: Stage.FETCHING,
              method: Method.PDFJS_CANVAS,
              timestamp: new Date(),
              context: {},
              recoverable: true,
            }],
          };

          // Create fresh context
          const freshContext = errorRecoverySystem.createFreshContext(originalContext);

          // Mutate original context
          originalContext.attemptCount = 999;
          originalContext.progressState.percentage = 99;
          originalContext.errorHistory.push({
            type: 'timeout-error' as any,
            message: 'Another error',
            stage: Stage.PARSING,
            method: Method.NATIVE_BROWSER,
            timestamp: new Date(),
            context: {},
            recoverable: true,
          });

          // Property: Fresh context should be unaffected by original context mutations
          expect(freshContext.attemptCount).toBe(0);
          expect(freshContext.progressState.percentage).toBe(0);
          expect(freshContext.errorHistory).toEqual([]);

          // Property: Options mutations should not affect fresh context
          originalContext.options.timeout = 999999;
          expect(freshContext.options.timeout).not.toBe(999999);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('fresh context creation is deterministic for same input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          renderingId: fc.string({ minLength: 1, maxLength: 20 }),
          url: fc.webUrl(),
          options: fc.record({
            timeout: fc.integer({ min: 1000, max: 60000 }),
          }),
          currentMethod: fc.constantFrom(...Object.values(Method)),
        }),
        async (contextData) => {
          // Create original context
          const originalContext: RenderContext = {
            ...contextData,
            startTime: new Date(2024, 0, 1), // Fixed date for deterministic test
            attemptCount: 5,
            canvas: undefined,
            pdfDocument: undefined,
            progressState: {
              percentage: 75,
              stage: Stage.RENDERING,
              bytesLoaded: 1500,
              totalBytes: 2000,
              timeElapsed: 10000,
              isStuck: true,
              lastUpdate: new Date(2024, 0, 1),
            },
            errorHistory: [],
          };

          // Create multiple fresh contexts
          const freshContext1 = errorRecoverySystem.createFreshContext(originalContext);
          const freshContext2 = errorRecoverySystem.createFreshContext(originalContext);

          // Property: Fresh contexts should have consistent reset values
          expect(freshContext1.attemptCount).toBe(freshContext2.attemptCount);
          expect(freshContext1.progressState.percentage).toBe(freshContext2.progressState.percentage);
          expect(freshContext1.progressState.stage).toBe(freshContext2.progressState.stage);
          expect(freshContext1.progressState.bytesLoaded).toBe(freshContext2.progressState.bytesLoaded);
          expect(freshContext1.progressState.totalBytes).toBe(freshContext2.progressState.totalBytes);
          expect(freshContext1.progressState.timeElapsed).toBe(freshContext2.progressState.timeElapsed);
          expect(freshContext1.progressState.isStuck).toBe(freshContext2.progressState.isStuck);

          // Property: Fresh contexts should preserve same URL and options
          expect(freshContext1.url).toBe(freshContext2.url);
          expect(freshContext1.currentMethod).toBe(freshContext2.currentMethod);
          expect(freshContext1.options.timeout).toBe(freshContext2.options.timeout);

          // Property: Fresh contexts should have different rendering IDs
          expect(freshContext1.renderingId).not.toBe(freshContext2.renderingId);
        }
      ),
      { numRuns: 100 }
    );
  });
});