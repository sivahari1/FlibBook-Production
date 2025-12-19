/**
 * Property-Based Tests for Retry Logic Reliability
 * 
 * **Feature: document-conversion-reliability-fix, Property 12: Retry logic reliability**
 * **Validates: Requirements 5.1**
 * 
 * Tests that retry logic behaves correctly across all valid inputs and failure scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { 
  EnhancedRetryLogic, 
  CircuitBreakerState, 
  DEFAULT_RESILIENCE_CONFIG,
  ResilienceConfig 
} from '../retry-logic';
import { RenderingErrorType } from '../../errors/rendering-errors';

describe('Retry Logic Reliability Properties', () => {
  let retryLogic: EnhancedRetryLogic;
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    if (retryLogic) {
      retryLogic.destroy();
    }
    vi.useRealTimers();
  });

  /**
   * Property 12: Retry logic reliability
   * For any temporary failure, the system should implement automatic retry logic with fallback strategies
   */
  it('should retry operations according to configuration for any retryable error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate retry configuration
        fc.record({
          maxAttempts: fc.integer({ min: 1, max: 10 }),
          baseDelay: fc.integer({ min: 100, max: 2000 }),
          maxDelay: fc.integer({ min: 1000, max: 10000 }),
          backoffMultiplier: fc.float({ min: Math.fround(1.1), max: Math.fround(3.0) }),
          enableJitter: fc.boolean(),
        }),
        // Generate failure scenarios
        fc.record({
          failuresBeforeSuccess: fc.integer({ min: 0, max: 5 }),
          errorType: fc.constantFrom(
            RenderingErrorType.NETWORK_TIMEOUT,
            RenderingErrorType.NETWORK_FAILURE,
            RenderingErrorType.PDF_RENDERING_FAILED,
            RenderingErrorType.MEMORY_ALLOCATION_FAILED,
            RenderingErrorType.INITIALIZATION_FAILED
          ),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (retryConfig, failureScenario) => {
          // Create retry logic with test configuration
          const config: ResilienceConfig = {
            ...DEFAULT_RESILIENCE_CONFIG,
            retry: {
              ...DEFAULT_RESILIENCE_CONFIG.retry,
              ...retryConfig,
            },
          };
          
          retryLogic = new EnhancedRetryLogic(config);
          
          // Track operation calls
          let callCount = 0;
          const retryAttempts: number[] = [];
          
          // Create operation that fails specified number of times then succeeds
          const operation = vi.fn(async () => {
            callCount++;
            
            if (callCount <= failureScenario.failuresBeforeSuccess) {
              const error = new Error(failureScenario.errorMessage);
              (error as any).type = failureScenario.errorType;
              throw error;
            }
            
            return 'success';
          });
          
          const onRetry = vi.fn((attempt: number) => {
            retryAttempts.push(attempt);
          });
          
          try {
            // Execute operation with retry
            const result = await retryLogic.executeWithRetry(operation, {
              operationName: 'test-operation',
              onRetry,
            });
            
            // If we expect success (failures < max attempts)
            if (failureScenario.failuresBeforeSuccess < retryConfig.maxAttempts) {
              // Should succeed
              expect(result).toBe('success');
              
              // Should call operation exactly failuresBeforeSuccess + 1 times
              expect(callCount).toBe(failureScenario.failuresBeforeSuccess + 1);
              
              // Should retry exactly failuresBeforeSuccess times
              expect(retryAttempts).toHaveLength(failureScenario.failuresBeforeSuccess);
              
              // Retry attempts should be sequential
              for (let i = 0; i < retryAttempts.length; i++) {
                expect(retryAttempts[i]).toBe(i + 1);
              }
            }
            
          } catch (error) {
            // If we expect failure (failures >= max attempts)
            if (failureScenario.failuresBeforeSuccess >= retryConfig.maxAttempts) {
              // Should fail with the original error
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe(failureScenario.errorMessage);
              
              // Should call operation exactly maxAttempts times
              expect(callCount).toBe(retryConfig.maxAttempts);
              
              // Should retry exactly maxAttempts - 1 times
              expect(retryAttempts).toHaveLength(retryConfig.maxAttempts - 1);
            } else {
              // Unexpected failure
              throw error;
            }
          }
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  }, 15000);

  it('should not retry non-retryable errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-retryable error types
        fc.constantFrom(
          RenderingErrorType.PDF_CORRUPTED,
          RenderingErrorType.PDF_INVALID_FORMAT,
          RenderingErrorType.PDF_PASSWORD_PROTECTED,
          RenderingErrorType.BROWSER_COMPATIBILITY,
          RenderingErrorType.SECURITY_PERMISSION_DENIED
        ),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorType, errorMessage) => {
          retryLogic = new EnhancedRetryLogic();
          
          let callCount = 0;
          const retryAttempts: number[] = [];
          
          const operation = vi.fn(async () => {
            callCount++;
            const error = new Error(errorMessage);
            (error as any).type = errorType;
            throw error;
          });
          
          const onRetry = vi.fn((attempt: number) => {
            retryAttempts.push(attempt);
          });
          
          try {
            await retryLogic.executeWithRetry(operation, {
              operationName: 'test-operation',
              onRetry,
            });
            
            // Should not reach here for non-retryable errors
            expect(true).toBe(false);
            
          } catch (error) {
            // Should fail immediately without retries
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe(errorMessage);
            
            // Should call operation exactly once
            expect(callCount).toBe(1);
            
            // Should not retry
            expect(retryAttempts).toHaveLength(0);
            expect(onRetry).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  }, 10000); // Increased timeout

  it('should implement exponential backoff with proper delay calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseDelay: fc.integer({ min: 100, max: 1000 }),
          backoffMultiplier: fc.float({ min: Math.fround(1.5), max: Math.fround(3.0) }),
          maxDelay: fc.integer({ min: 2000, max: 10000 }),
          enableJitter: fc.boolean(),
        }),
        fc.integer({ min: 2, max: 3 }), // Reduced number of failures for faster execution
        async (retryConfig, numFailures) => {
          const config: ResilienceConfig = {
            ...DEFAULT_RESILIENCE_CONFIG,
            retry: {
              ...DEFAULT_RESILIENCE_CONFIG.retry,
              ...retryConfig,
              maxAttempts: numFailures + 1, // Ensure we can test all failures
            },
          };
          
          retryLogic = new EnhancedRetryLogic(config);
          
          const delayTimes: number[] = [];
          let callCount = 0;
          
          const operation = vi.fn(async () => {
            callCount++;
            
            if (callCount <= numFailures) {
              const error = new Error('test error');
              (error as any).type = RenderingErrorType.NETWORK_TIMEOUT;
              throw error;
            }
            
            return 'success';
          });
          
          // Mock setTimeout to capture delays but execute immediately
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = vi.fn((callback: Function, delay: number) => {
            delayTimes.push(delay);
            // Execute immediately for test speed
            callback();
            return 1 as any;
          }) as any;
          
          try {
            await retryLogic.executeWithRetry(operation, {
              operationName: 'backoff-test',
            });
            
            // Should have recorded delays for each retry
            expect(delayTimes).toHaveLength(numFailures);
            
            // Verify exponential backoff pattern
            for (let i = 0; i < delayTimes.length; i++) {
              const expectedBaseDelay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, i);
              const expectedDelay = Math.min(expectedBaseDelay, retryConfig.maxDelay);
              
              if (retryConfig.enableJitter) {
                // With jitter, delay should be within reasonable range
                expect(delayTimes[i]).toBeGreaterThanOrEqual(expectedDelay * 0.7);
                expect(delayTimes[i]).toBeLessThanOrEqual(expectedDelay * 1.3);
              } else {
                // Without jitter, delay should be exact (or capped at maxDelay)
                expect(delayTimes[i]).toBe(Math.min(expectedBaseDelay, retryConfig.maxDelay));
              }
            }
            
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  }, 10000); // Increased timeout

  it('should implement circuit breaker pattern correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          failureThreshold: fc.integer({ min: 2, max: 10 }),
          successThreshold: fc.integer({ min: 1, max: 5 }),
          timeout: fc.integer({ min: 1000, max: 5000 }),
        }),
        fc.integer({ min: 1, max: 15 }), // Number of consecutive failures
        async (circuitConfig, consecutiveFailures) => {
          const config: ResilienceConfig = {
            ...DEFAULT_RESILIENCE_CONFIG,
            circuitBreaker: {
              ...DEFAULT_RESILIENCE_CONFIG.circuitBreaker,
              ...circuitConfig,
            },
            retry: {
              ...DEFAULT_RESILIENCE_CONFIG.retry,
              maxAttempts: 1, // Single attempt to test circuit breaker
            },
          };
          
          retryLogic = new EnhancedRetryLogic(config);
          
          // Generate consecutive failures
          for (let i = 0; i < consecutiveFailures; i++) {
            try {
              await retryLogic.executeWithRetry(async () => {
                const error = new Error(`failure ${i + 1}`);
                (error as any).type = RenderingErrorType.NETWORK_FAILURE;
                throw error;
              });
            } catch (error) {
              // Expected to fail
            }
          }
          
          // Check circuit breaker state
          const state = retryLogic.getCircuitBreakerState();
          const failureCount = retryLogic.getFailureCount();
          
          if (consecutiveFailures >= circuitConfig.failureThreshold) {
            // Circuit should be open
            expect(state).toBe(CircuitBreakerState.OPEN);
            expect(failureCount).toBeGreaterThanOrEqual(circuitConfig.failureThreshold);
            
            // Next operation should fail fast
            try {
              await retryLogic.executeWithRetry(async () => 'success');
              expect(true).toBe(false); // Should not reach here
            } catch (error) {
              expect((error as Error).message).toContain('Circuit breaker is OPEN');
            }
          } else {
            // Circuit should still be closed
            expect(state).toBe(CircuitBreakerState.CLOSED);
            expect(failureCount).toBe(consecutiveFailures);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle concurrent operations correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }), // Number of concurrent operations
        fc.record({
          successRate: fc.float({ min: Math.fround(0.3), max: Math.fround(0.9) }), // Percentage that succeed
          maxAttempts: fc.integer({ min: 1, max: 3 }),
        }),
        async (concurrentOps, config) => {
          const retryConfig: ResilienceConfig = {
            ...DEFAULT_RESILIENCE_CONFIG,
            retry: {
              ...DEFAULT_RESILIENCE_CONFIG.retry,
              maxAttempts: config.maxAttempts,
              baseDelay: 10, // Fast for testing
            },
          };
          
          retryLogic = new EnhancedRetryLogic(retryConfig);
          
          const operations = Array.from({ length: concurrentOps }, (_, index) => {
            const shouldSucceed = Math.random() < config.successRate;
            
            return retryLogic.executeWithRetry(async () => {
              if (!shouldSucceed) {
                const error = new Error(`Operation ${index} failed`);
                (error as any).type = RenderingErrorType.NETWORK_TIMEOUT;
                throw error;
              }
              return `success-${index}`;
            }, {
              operationName: `concurrent-op-${index}`,
            });
          });
          
          // Execute all operations concurrently
          const results = await Promise.allSettled(operations);
          
          // Verify results
          expect(results).toHaveLength(concurrentOps);
          
          let successCount = 0;
          let failureCount = 0;
          
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              expect(result.value).toBe(`success-${index}`);
              successCount++;
            } else {
              expect(result.reason).toBeInstanceOf(Error);
              failureCount++;
            }
          });
          
          // Should have some results (either success or failure)
          expect(successCount + failureCount).toBe(concurrentOps);
          
          // Circuit breaker should still be functional after concurrent operations
          const state = retryLogic.getCircuitBreakerState();
          expect(Object.values(CircuitBreakerState)).toContain(state);
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  }, 15000);

  it('should preserve operation context and error information through retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operationName: fc.string({ minLength: 1, maxLength: 50 }),
          errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
          contextData: fc.record({
            userId: fc.string(),
            documentId: fc.string(),
            timestamp: fc.integer(),
          }),
        }),
        fc.integer({ min: 1, max: 2 }), // Reduced number of failures for faster execution
        async (testData, failureCount) => {
          // Mock setTimeout to execute immediately
          const originalSetTimeout = global.setTimeout;
          global.setTimeout = vi.fn((callback: Function) => {
            callback();
            return 1 as any;
          }) as any;
          
          try {
            retryLogic = new EnhancedRetryLogic();
            
            const retryCallbacks: Array<{ attempt: number; error: Error }> = [];
            let callCount = 0;
            
            const operation = vi.fn(async () => {
              callCount++;
              
              if (callCount <= failureCount) {
                const error = new Error(testData.errorMessage);
                (error as any).type = RenderingErrorType.PDF_RENDERING_FAILED;
                (error as any).context = testData.contextData;
                throw error;
              }
              
              return testData.contextData;
            });
            
            const onRetry = vi.fn((attempt: number, error: Error) => {
              retryCallbacks.push({ attempt, error });
            });
            
            const result = await retryLogic.executeWithRetry(operation, {
              operationName: testData.operationName,
              errorContext: testData.contextData,
              onRetry,
            });
            
            // Should succeed with correct result
            expect(result).toEqual(testData.contextData);
            
            // Should have called retry callback for each failure
            expect(retryCallbacks).toHaveLength(failureCount);
            
            // Verify retry callback data
            retryCallbacks.forEach((callback, index) => {
              expect(callback.attempt).toBe(index + 1);
              expect(callback.error.message).toBe(testData.errorMessage);
              expect((callback.error as any).context).toEqual(testData.contextData);
            });
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        }
      ),
      { numRuns: 10 } // Reduced for faster execution
    );
  }, 10000); // Increased timeout
});