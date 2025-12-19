/**
 * Rendering Method Chain Property-Based Tests
 * 
 * Property-based tests for the rendering method chain using fast-check
 * 
 * Feature: PDF Rendering Reliability Fix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { RenderingMethodChain } from '../pdf-reliability/rendering-method-chain';
import type { RenderingMethod } from '../pdf-reliability/types';

// Mock DOM APIs for testing
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      src: '',
      style: {},
      onload: null,
      onerror: null,
    })),
  },
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-agent',
    platform: 'test-platform',
    language: 'en-US',
  },
});

// Mock fetch
global.fetch = vi.fn();

describe('Rendering Method Chain - Property-Based Tests', () => {
  let methodChain: RenderingMethodChain;

  beforeEach(() => {
    vi.clearAllMocks();
    methodChain = new RenderingMethodChain();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * PDF Rendering Reliability Fix, Property 2: Fallback method progression
   * 
   * Property: For any PDF rendering failure, the system should automatically 
   * attempt the next available rendering method in the fallback chain until 
   * all methods are exhausted
   * 
   * Validates: Requirements 1.3, 6.1, 6.2, 6.3, 6.4
   */
  describe('Property 2: Fallback method progression', () => {
    it('should systematically progress through fallback methods', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'pdfjs-canvas' as RenderingMethod,
            'native-browser' as RenderingMethod,
            'server-conversion' as RenderingMethod,
            'image-based' as RenderingMethod
          ),
          (failingMethod) => {
            // Test that getNextMethod returns the correct next method
            const nextMethod = methodChain.getNextMethod(failingMethod);
            
            // Property: Should either return next method or null if chain exhausted
            if (nextMethod !== null) {
              expect(typeof nextMethod).toBe('string');
              expect(nextMethod).not.toBe(failingMethod);
              
              // Verify it's a valid rendering method
              const validMethods = [
                'pdfjs-canvas',
                'native-browser', 
                'server-conversion',
                'image-based',
                'download-fallback'
              ];
              expect(validMethods).toContain(nextMethod);
            } else {
              // If no next method, we should be at the end of the chain
              expect(failingMethod).toBe('download-fallback');
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should exhaust all methods in the fallback chain', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('small', 'medium', 'large'), // Document types
          (docType) => {
            const allMethods: RenderingMethod[] = [
              'pdfjs-canvas',
              'native-browser',
              'server-conversion', 
              'image-based',
              'download-fallback'
            ];

            // Test progression through entire chain
            let currentMethod: RenderingMethod | null = allMethods[0];
            const attemptedMethods: RenderingMethod[] = [];
            
            while (currentMethod !== null && attemptedMethods.length < 10) { // Safety limit
              attemptedMethods.push(currentMethod);
              currentMethod = methodChain.getNextMethod(currentMethod);
            }

            // Property: Should attempt all methods in order
            expect(attemptedMethods.length).toBeGreaterThan(0);
            expect(attemptedMethods.length).toBeLessThanOrEqual(allMethods.length);
            
            // Should not repeat methods
            const uniqueMethods = new Set(attemptedMethods);
            expect(uniqueMethods.size).toBe(attemptedMethods.length);
            
            // Should end with null (chain exhausted)
            expect(currentMethod).toBeNull();
            
            // Last attempted method should be the final fallback
            if (attemptedMethods.length === allMethods.length) {
              expect(attemptedMethods[attemptedMethods.length - 1]).toBe('download-fallback');
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should maintain consistent fallback order', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'pdfjs-canvas' as RenderingMethod,
            'native-browser' as RenderingMethod,
            'server-conversion' as RenderingMethod,
            'image-based' as RenderingMethod
          ),
          (startMethod) => {
            // Get the fallback chain starting from this method
            const chain: RenderingMethod[] = [];
            let currentMethod: RenderingMethod | null = startMethod;
            
            while (currentMethod !== null && chain.length < 10) {
              chain.push(currentMethod);
              currentMethod = methodChain.getNextMethod(currentMethod);
            }
            
            // Property: Chain should be consistent across calls
            const secondChain: RenderingMethod[] = [];
            currentMethod = startMethod;
            
            while (currentMethod !== null && secondChain.length < 10) {
              secondChain.push(currentMethod);
              currentMethod = methodChain.getNextMethod(currentMethod);
            }
            
            expect(chain).toEqual(secondChain);
            
            // Property: Should follow expected order
            const expectedOrder = [
              'pdfjs-canvas',
              'native-browser',
              'server-conversion',
              'image-based',
              'download-fallback'
            ];
            
            // Find start index
            const startIndex = expectedOrder.indexOf(startMethod);
            expect(startIndex).toBeGreaterThanOrEqual(0);
            
            // Verify order matches expected sequence
            for (let i = 0; i < chain.length; i++) {
              const expectedIndex = (startIndex + i) % expectedOrder.length;
              if (expectedIndex < expectedOrder.length) {
                expect(chain[i]).toBe(expectedOrder[expectedIndex]);
              }
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });

  /**
   * PDF Rendering Reliability Fix, Property 15: Method preference learning
   * 
   * Property: For any successful rendering, the system should record the 
   * successful method and prefer it for similar document types in future renders
   * 
   * Validates: Requirements 6.5
   */
  describe('Property 15: Method preference learning', () => {
    it('should record successful methods and prefer them for similar documents', () => {
      fc.assert(
        fc.property(
          fc.record({
            size: fc.constantFrom('small', 'medium', 'large'),
            method: fc.constantFrom(
              'pdfjs-canvas' as RenderingMethod,
              'native-browser' as RenderingMethod,
              'server-conversion' as RenderingMethod,
              'image-based' as RenderingMethod
            ),
            renderTime: fc.integer({ min: 100, max: 5000 }),
          }),
          fc.integer({ min: 1, max: 5 }), // Number of successful attempts
          (docInfo, successCount) => {
            // Clear any existing history
            methodChain.clearMethodHistory();
            
            // Record multiple successes for the same document type and method
            for (let i = 0; i < successCount; i++) {
              methodChain.recordMethodSuccess(
                docInfo.method, 
                docInfo.size, 
                docInfo.renderTime + (i * 10) // Slight variation in render time
              );
            }
            
            // Property: Preferred method should be the one we recorded successes for
            const preferredMethod = methodChain.getPreferredMethod(docInfo.size);
            expect(preferredMethod).toBe(docInfo.method);
            
            // Get statistics to verify learning
            const stats = methodChain.getMethodStatistics();
            const key = `${docInfo.method}-${docInfo.size}`;
            const methodStats = stats.get(key);
            
            expect(methodStats).toBeDefined();
            expect(methodStats!.successCount).toBe(successCount);
            expect(methodStats!.totalAttempts).toBe(successCount);
            expect(methodStats!.method).toBe(docInfo.method);
            expect(methodStats!.documentType).toBe(docInfo.size);
            expect(methodStats!.averageRenderTime).toBeGreaterThan(0);
            expect(methodStats!.lastUsed).toBeInstanceOf(Date);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should prefer methods with higher success rates', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('small', 'medium', 'large'),
          fc.record({
            method1: fc.constantFrom(
              'pdfjs-canvas' as RenderingMethod,
              'native-browser' as RenderingMethod
            ),
            method2: fc.constantFrom(
              'server-conversion' as RenderingMethod,
              'image-based' as RenderingMethod
            ),
            method1Successes: fc.integer({ min: 5, max: 10 }),
            method1Failures: fc.integer({ min: 0, max: 2 }),
            method2Successes: fc.integer({ min: 1, max: 3 }),
            method2Failures: fc.integer({ min: 3, max: 8 }),
          }),
          (docType, methodData) => {
            // Clear history
            methodChain.clearMethodHistory();
            
            // Record successes and failures for method1 (higher success rate)
            for (let i = 0; i < methodData.method1Successes; i++) {
              methodChain.recordMethodSuccess(methodData.method1, docType, 1000);
            }
            for (let i = 0; i < methodData.method1Failures; i++) {
              methodChain.recordMethodFailure(methodData.method1, docType);
            }
            
            // Record successes and failures for method2 (lower success rate)
            for (let i = 0; i < methodData.method2Successes; i++) {
              methodChain.recordMethodSuccess(methodData.method2, docType, 1500);
            }
            for (let i = 0; i < methodData.method2Failures; i++) {
              methodChain.recordMethodFailure(methodData.method2, docType);
            }
            
            // Calculate success rates
            const method1Rate = methodData.method1Successes / 
              (methodData.method1Successes + methodData.method1Failures);
            const method2Rate = methodData.method2Successes / 
              (methodData.method2Successes + methodData.method2Failures);
            
            // Property: Should prefer method with higher success rate
            const preferredMethod = methodChain.getPreferredMethod(docType);
            
            if (method1Rate > method2Rate) {
              expect(preferredMethod).toBe(methodData.method1);
            } else if (method2Rate > method1Rate) {
              expect(preferredMethod).toBe(methodData.method2);
            } else {
              // If equal success rates, should prefer faster method (method1 has 1000ms vs 1500ms)
              expect(preferredMethod).toBe(methodData.method1);
            }
            
            // Verify statistics are properly recorded
            const stats = methodChain.getMethodStatistics();
            
            const method1Key = `${methodData.method1}-${docType}`;
            const method1Stats = stats.get(method1Key);
            expect(method1Stats).toBeDefined();
            expect(method1Stats!.successCount).toBe(methodData.method1Successes);
            expect(method1Stats!.totalAttempts).toBe(
              methodData.method1Successes + methodData.method1Failures
            );
            
            const method2Key = `${methodData.method2}-${docType}`;
            const method2Stats = stats.get(method2Key);
            expect(method2Stats).toBeDefined();
            expect(method2Stats!.successCount).toBe(methodData.method2Successes);
            expect(method2Stats!.totalAttempts).toBe(
              methodData.method2Successes + methodData.method2Failures
            );
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle new document types with default preferences', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9_-]+$/), // Generate random document type
          (newDocType) => {
            // Ensure this is a new document type by clearing history
            methodChain.clearMethodHistory();
            
            // Property: Should return a valid default method for unknown document types
            const preferredMethod = methodChain.getPreferredMethod(newDocType);
            
            expect(typeof preferredMethod).toBe('string');
            const validMethods = [
              'pdfjs-canvas',
              'native-browser',
              'server-conversion',
              'image-based',
              'download-fallback'
            ];
            expect(validMethods).toContain(preferredMethod);
            
            // Should have reasonable defaults based on document type patterns
            if (newDocType === 'small') {
              expect(preferredMethod).toBe('pdfjs-canvas');
            } else if (newDocType === 'large') {
              expect(preferredMethod).toBe('server-conversion');
            } else {
              // For unknown types, should default to pdfjs-canvas
              expect(preferredMethod).toBe('pdfjs-canvas');
            }
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should update preferences as new data is recorded', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('small', 'medium', 'large'),
          fc.record({
            initialMethod: fc.constantFrom(
              'pdfjs-canvas' as RenderingMethod,
              'native-browser' as RenderingMethod
            ),
            betterMethod: fc.constantFrom(
              'server-conversion' as RenderingMethod,
              'image-based' as RenderingMethod
            ),
            initialSuccesses: fc.integer({ min: 2, max: 5 }),
            betterSuccesses: fc.integer({ min: 6, max: 10 }),
          }),
          (docType, testData) => {
            // Clear history
            methodChain.clearMethodHistory();
            
            // Initially record some successes for the first method
            for (let i = 0; i < testData.initialSuccesses; i++) {
              methodChain.recordMethodSuccess(testData.initialMethod, docType, 2000);
            }
            
            // Should prefer initial method
            let preferredMethod = methodChain.getPreferredMethod(docType);
            expect(preferredMethod).toBe(testData.initialMethod);
            
            // Now record more successes for the better method with faster render time
            for (let i = 0; i < testData.betterSuccesses; i++) {
              methodChain.recordMethodSuccess(testData.betterMethod, docType, 1000);
            }
            
            // Property: Should update preference to the better performing method
            preferredMethod = methodChain.getPreferredMethod(docType);
            
            // Calculate success rates
            const initialRate = testData.initialSuccesses / testData.initialSuccesses; // 100%
            const betterRate = testData.betterSuccesses / testData.betterSuccesses; // 100%
            
            // Since both have 100% success rate, should prefer the faster one (betterMethod has 1000ms)
            expect(preferredMethod).toBe(testData.betterMethod);
            
            // Verify both methods are tracked
            const stats = methodChain.getMethodStatistics();
            expect(stats.size).toBeGreaterThanOrEqual(2);
            
            const initialKey = `${testData.initialMethod}-${docType}`;
            const betterKey = `${testData.betterMethod}-${docType}`;
            
            expect(stats.has(initialKey)).toBe(true);
            expect(stats.has(betterKey)).toBe(true);
            
            const betterStats = stats.get(betterKey)!;
            expect(betterStats.averageRenderTime).toBeLessThan(2000);
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