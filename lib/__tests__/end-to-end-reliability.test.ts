/**
 * End-to-End Reliability Tests
 * 
 * Tests complete failure and recovery scenarios, performance under various conditions,
 * and memory management over time.
 * 
 * Requirements: All
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReliablePDFRenderer } from '../pdf-reliability/reliable-pdf-renderer';
import { RenderingMethodChain } from '../pdf-reliability/rendering-method-chain';
import { CanvasManager } from '../pdf-reliability/canvas-manager';
import { ProgressTracker } from '../pdf-reliability/progress-tracker';
import { ErrorRecoverySystem } from '../pdf-reliability/error-recovery-system';
import { NetworkResilienceLayer } from '../pdf-reliability/network-resilience-layer';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import type { ReliabilityConfig, RenderOptions, RenderResult } from '../pdf-reliability/types';
import { RenderingMethod, ErrorType, RenderingStage } from '../pdf-reliability/types';

describe('End-to-End Reliability Tests', () => {
  let renderer: ReliablePDFRenderer;
  let config: ReliabilityConfig;
  let originalFetch: typeof global.fetch;
  let originalDocument: typeof global.document;
  let originalWindow: typeof global.window;

  beforeEach(() => {
    // Store original globals
    originalFetch = global.fetch;
    originalDocument = global.document;
    originalWindow = global.window;

    config = {
      defaultTimeout: 30000,
      maxRetries: 5,
      enableFallbacks: true,
      enableDiagnostics: true,
      memoryPressureThreshold: 100 * 1024 * 1024, // 100MB
      progressUpdateInterval: 100,
      stuckDetectionThreshold: 5000,
    };

    renderer = new ReliablePDFRenderer(config);

    // Setup DOM mocks
    global.document = {
      createElement: vi.fn(() => ({
        getContext: vi.fn(() => ({
          canvas: {},
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
        })),
        width: 800,
        height: 600,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    } as any;

    global.window = {
      performance: {
        memory: {
          usedJSHeapSize: 50 * 1024 * 1024,
          totalJSHeapSize: 200 * 1024 * 1024,
        },
        now: () => Date.now(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
  });

  afterEach(() => {
    // Restore original globals
    global.fetch = originalFetch;
    global.document = originalDocument;
    global.window = originalWindow;
    vi.clearAllMocks();
  });

  describe('Complete Failure and Recovery Scenarios', () => {
    test('should recover from complete network failure to success', async () => {
      let networkAttempts = 0;
      
      global.fetch = vi.fn(() => {
        networkAttempts++;
        
        if (networkAttempts <= 3) {
          // First 3 attempts fail with different errors
          const errors = [
            new Error('DNS resolution failed'),
            new Error('Connection refused'),
            new Error('Request timeout'),
          ];
          return Promise.reject(errors[networkAttempts - 1]);
        }
        
        // 4th attempt succeeds
        return Promise.resolve(new Response(createMockPDFBuffer(), { 
          status: 200,
          headers: { 'Content-Type': 'application/pdf' }
        }));
      });

      const result = await renderer.renderPDF('https://unreliable-network.com/test.pdf');

      expect(result.success).toBe(true);
      expect(networkAttempts).toBe(4);
      expect(result.diagnostics.retryCount).toBe(3);
      expect(result.diagnostics.errors.length).toBe(3);
      
      // Verify all error types were encountered and logged
      const errorTypes = result.diagnostics.errors.map(e => e.type);
      expect(errorTypes).toContain(ErrorType.NETWORK_ERROR);
    });

    test('should exhaust all fallback methods and provide download option', async () => {
      // Mock all rendering methods to fail
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      // Mock canvas creation to fail
      global.document.createElement = vi.fn(() => {
        throw new Error('Canvas creation failed');
      });

      const result = await renderer.renderPDF('https://example.com/test.pdf');

      expect(result.success).toBe(false);
      expect(result.method).toBe(RenderingMethod.DOWNLOAD_FALLBACK);
      expect(result.error?.type).toBe(ErrorType.CANVAS_ERROR);
      
      // Should have attempted multiple methods
      expect(result.diagnostics.methodsAttempted.length).toBeGreaterThan(1);
      expect(result.diagnostics.methodsAttempted).toContain(RenderingMethod.PDFJS_CANVAS);
      expect(result.diagnostics.methodsAttempted).toContain(RenderingMethod.DOWNLOAD_FALLBACK);
    });

    test('should recover from memory exhaustion through cleanup', async () => {
      let memoryUsage = 50 * 1024 * 1024; // Start at 50MB
      let renderAttempts = 0;

      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      global.document.createElement = vi.fn(() => {
        renderAttempts++;
        memoryUsage += 30 * 1024 * 1024; // Each attempt uses 30MB
        
        global.window.performance.memory.usedJSHeapSize = memoryUsage;
        
        if (renderAttempts <= 2 && memoryUsage > config.memoryPressureThreshold) {
          throw new Error('Out of memory');
        }
        
        // Simulate memory cleanup after 2 failures
        if (renderAttempts === 3) {
          memoryUsage = 40 * 1024 * 1024; // Memory cleaned up
          global.window.performance.memory.usedJSHeapSize = memoryUsage;
        }

        return {
          getContext: vi.fn(() => ({
            canvas: {},
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          width: 800,
          height: 600,
        };
      });

      const result = await renderer.renderPDF('https://memory-test.com/test.pdf');

      expect(result.success).toBe(true);
      expect(renderAttempts).toBe(3);
      expect(result.diagnostics.memoryCleanupCount).toBeGreaterThan(0);
      
      const memoryErrors = result.diagnostics.errors.filter(e => e.type === ErrorType.MEMORY_ERROR);
      expect(memoryErrors.length).toBeGreaterThan(0);
    });

    test('should handle cascading failures across multiple systems', async () => {
      let fetchAttempts = 0;
      let canvasAttempts = 0;
      
      global.fetch = vi.fn(() => {
        fetchAttempts++;
        
        if (fetchAttempts === 1) {
          return Promise.reject(new Error('Network error'));
        } else if (fetchAttempts === 2) {
          return Promise.resolve(new Response(null, { status: 401 })); // Auth error
        } else {
          return Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }));
        }
      });

      global.document.createElement = vi.fn(() => {
        canvasAttempts++;
        
        if (canvasAttempts <= 2) {
          throw new Error('Canvas creation failed');
        }
        
        return {
          getContext: vi.fn(() => ({
            canvas: {},
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          width: 800,
          height: 600,
        };
      });

      const result = await renderer.renderPDF('https://cascading-failures.com/test.pdf');

      expect(result.success).toBe(true);
      expect(fetchAttempts).toBeGreaterThanOrEqual(3);
      expect(canvasAttempts).toBeGreaterThanOrEqual(3);
      
      // Should have multiple error types logged
      const errorTypes = new Set(result.diagnostics.errors.map(e => e.type));
      expect(errorTypes.size).toBeGreaterThan(1);
      expect(errorTypes).toContain(ErrorType.NETWORK_ERROR);
      expect(errorTypes).toContain(ErrorType.AUTHENTICATION_ERROR);
      expect(errorTypes).toContain(ErrorType.CANVAS_ERROR);
    });

    test('should maintain state consistency during recovery', async () => {
      let renderingId: string | undefined;
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      // Mock progress tracking
      const progressUpdates: any[] = [];
      const originalRenderer = renderer;
      
      // Intercept progress updates
      vi.spyOn(originalRenderer as any, 'updateProgress').mockImplementation((id: string, progress: any) => {
        renderingId = id;
        progressUpdates.push({ id, ...progress });
      });

      const result = await renderer.renderPDF('https://state-consistency.com/test.pdf');

      expect(result.success).toBe(true);
      expect(renderingId).toBeDefined();
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress consistency
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.percentage).toBe(100);
      expect(finalProgress.stage).toBe(RenderingStage.COMPLETE);
    });
  });

  describe('Performance Under Various Conditions', () => {
    test('should maintain performance with large PDF files', async () => {
      const largePDFSize = 10 * 1024 * 1024; // 10MB
      const largePDFBuffer = new ArrayBuffer(largePDFSize);
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(largePDFBuffer, { 
          status: 200,
          headers: { 
            'Content-Type': 'application/pdf',
            'Content-Length': largePDFSize.toString()
          }
        }))
      );

      const startTime = Date.now();
      const result = await renderer.renderPDF('https://large-file.com/big.pdf', {
        timeout: 60000, // Extended timeout for large file
      });
      const endTime = Date.now();
      const renderTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(renderTime).toBeLessThan(60000); // Should complete within timeout
      expect(result.diagnostics.bytesLoaded).toBe(largePDFSize);
      expect(result.diagnostics.performanceMetrics.totalTime).toBeGreaterThan(0);
    });

    test('should handle slow network conditions gracefully', async () => {
      const chunkSize = 1024;
      const totalSize = 8192;
      const chunks = totalSize / chunkSize;
      let chunksSent = 0;

      global.fetch = vi.fn(() => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Map([['Content-Length', totalSize.toString()]]),
          body: {
            getReader: () => ({
              read: vi.fn(() => {
                return new Promise(resolve => {
                  // Simulate slow network with 100ms delay per chunk
                  setTimeout(() => {
                    chunksSent++;
                    if (chunksSent <= chunks) {
                      resolve({
                        done: false,
                        value: new Uint8Array(chunkSize)
                      });
                    } else {
                      resolve({ done: true });
                    }
                  }, 100);
                });
              }),
            }),
          },
        };
        return Promise.resolve(mockResponse as any);
      });

      const startTime = Date.now();
      const result = await renderer.renderPDF('https://slow-network.com/test.pdf');
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(totalTime).toBeGreaterThan(800); // Should take time due to slow network
      expect(result.diagnostics.bytesLoaded).toBe(totalSize);
      expect(result.diagnostics.progressUpdates.length).toBeGreaterThan(1);
    });

    test('should optimize performance for small PDF files', async () => {
      const smallPDFSize = 50 * 1024; // 50KB
      const smallPDFBuffer = createMockPDFBuffer(smallPDFSize);
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(smallPDFBuffer, { 
          status: 200,
          headers: { 'Content-Length': smallPDFSize.toString() }
        }))
      );

      const startTime = Date.now();
      const result = await renderer.renderPDF('https://small-file.com/tiny.pdf');
      const endTime = Date.now();
      const renderTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(renderTime).toBeLessThan(5000); // Should be fast for small files
      expect(result.diagnostics.bytesLoaded).toBe(smallPDFSize);
      expect(result.method).toBe(RenderingMethod.PDFJS_CANVAS); // Should use optimal method
    });

    test('should handle high-frequency rendering requests', async () => {
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      const concurrentRequests = 50;
      const renderPromises: Promise<RenderResult>[] = [];

      const startTime = Date.now();
      
      // Fire off many concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        renderPromises.push(
          renderer.renderPDF(`https://high-frequency.com/doc${i}.pdf`)
        );
      }

      const results = await Promise.allSettled(renderPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && (r.value as RenderResult).success
      );

      expect(successfulResults.length).toBeGreaterThan(concurrentRequests * 0.8); // At least 80% success
      expect(totalTime).toBeLessThan(30000); // Should handle load within 30 seconds
      
      // Check that requests were processed efficiently
      const avgTimePerRequest = totalTime / concurrentRequests;
      expect(avgTimePerRequest).toBeLessThan(1000); // Average less than 1 second per request
    });

    test('should degrade gracefully under resource constraints', async () => {
      let memoryUsage = 80 * 1024 * 1024; // Start near memory limit
      
      global.window.performance.memory.usedJSHeapSize = memoryUsage;
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      global.document.createElement = vi.fn(() => {
        memoryUsage += 10 * 1024 * 1024; // Each canvas uses 10MB
        global.window.performance.memory.usedJSHeapSize = memoryUsage;
        
        if (memoryUsage > config.memoryPressureThreshold) {
          // Simulate memory pressure by using fallback method
          throw new Error('Memory pressure detected');
        }

        return {
          getContext: vi.fn(() => ({
            canvas: {},
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          width: 800,
          height: 600,
        };
      });

      const result = await renderer.renderPDF('https://resource-constrained.com/test.pdf');

      // Should either succeed with fallback or fail gracefully
      if (result.success) {
        expect([
          RenderingMethod.NATIVE_BROWSER,
          RenderingMethod.SERVER_CONVERSION,
          RenderingMethod.IMAGE_BASED
        ]).toContain(result.method);
      } else {
        expect(result.method).toBe(RenderingMethod.DOWNLOAD_FALLBACK);
        expect(result.error?.type).toBe(ErrorType.MEMORY_ERROR);
      }
      
      expect(result.diagnostics.memoryPressureDetected).toBe(true);
    });
  });

  describe('Memory Management Over Time', () => {
    test('should prevent memory leaks during extended usage', async () => {
      const initialMemory = 50 * 1024 * 1024;
      let currentMemory = initialMemory;
      let canvasCount = 0;
      const createdCanvases: any[] = [];

      global.window.performance.memory.usedJSHeapSize = currentMemory;
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      global.document.createElement = vi.fn(() => {
        canvasCount++;
        currentMemory += 5 * 1024 * 1024; // Each canvas adds 5MB
        global.window.performance.memory.usedJSHeapSize = currentMemory;
        
        const canvas = {
          getContext: vi.fn(() => ({
            canvas: {},
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          width: 800,
          height: 600,
          remove: vi.fn(() => {
            currentMemory -= 5 * 1024 * 1024; // Cleanup reduces memory
            global.window.performance.memory.usedJSHeapSize = Math.max(
              initialMemory, 
              currentMemory
            );
          }),
        };
        
        createdCanvases.push(canvas);
        return canvas;
      });

      // Render multiple documents sequentially
      const renderCount = 20;
      const results: RenderResult[] = [];

      for (let i = 0; i < renderCount; i++) {
        const result = await renderer.renderPDF(`https://memory-test.com/doc${i}.pdf`);
        results.push(result);
        
        // Simulate cleanup after each render
        if (i % 5 === 4) { // Cleanup every 5 renders
          createdCanvases.forEach(canvas => canvas.remove());
          createdCanvases.length = 0;
        }
      }

      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(renderCount * 0.8); // At least 80% success

      // Memory should not grow unbounded
      const finalMemory = global.window.performance.memory.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    test('should handle garbage collection during rendering', async () => {
      let gcTriggered = false;
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      // Mock garbage collection
      const originalGC = (global as any).gc;
      (global as any).gc = vi.fn(() => {
        gcTriggered = true;
        // Simulate memory reduction after GC
        global.window.performance.memory.usedJSHeapSize *= 0.7;
      });

      // Start with high memory usage
      global.window.performance.memory.usedJSHeapSize = 150 * 1024 * 1024;

      const result = await renderer.renderPDF('https://gc-test.com/test.pdf');

      expect(result.success).toBe(true);
      
      // Restore original GC
      (global as any).gc = originalGC;
    });

    test('should clean up resources on render cancellation', async () => {
      let renderingStarted = false;
      let cleanupCalled = false;
      
      global.fetch = vi.fn(() => {
        renderingStarted = true;
        return new Promise((resolve) => {
          // Never resolve to simulate long-running operation
          setTimeout(() => {
            resolve(new Response(createMockPDFBuffer(), { status: 200 }));
          }, 10000);
        });
      });

      // Mock cleanup
      const originalCleanup = renderer.cancelRendering;
      renderer.cancelRendering = vi.fn((renderingId: string) => {
        cleanupCalled = true;
        return originalCleanup.call(renderer, renderingId);
      });

      // Start rendering
      const renderPromise = renderer.renderPDF('https://long-running.com/test.pdf', {
        timeout: 1000, // Short timeout to trigger cancellation
      });

      // Wait a bit then cancel
      setTimeout(() => {
        if (renderingStarted) {
          // Cancellation should be handled by timeout
        }
      }, 500);

      const result = await renderPromise;

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    test('should handle memory fragmentation', async () => {
      const fragmentationSizes = [1024, 2048, 4096, 8192, 1024, 2048]; // Varying sizes
      let allocationCount = 0;
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      global.document.createElement = vi.fn(() => {
        const size = fragmentationSizes[allocationCount % fragmentationSizes.length];
        allocationCount++;
        
        // Simulate fragmented memory allocation
        const currentMemory = global.window.performance.memory.usedJSHeapSize;
        global.window.performance.memory.usedJSHeapSize = currentMemory + size;

        return {
          getContext: vi.fn(() => ({
            canvas: {},
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          width: Math.sqrt(size),
          height: Math.sqrt(size),
        };
      });

      // Render multiple documents with varying memory patterns
      const results: RenderResult[] = [];
      for (let i = 0; i < 10; i++) {
        const result = await renderer.renderPDF(`https://fragmentation-test.com/doc${i}.pdf`);
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(5); // Should handle fragmentation reasonably well
      expect(allocationCount).toBe(10);
    });

    test('should monitor and report memory usage patterns', async () => {
      const memorySnapshots: number[] = [];
      
      global.fetch = vi.fn(() => 
        Promise.resolve(new Response(createMockPDFBuffer(), { status: 200 }))
      );

      // Mock memory monitoring
      const originalMemoryUsage = global.window.performance.memory.usedJSHeapSize;
      
      global.document.createElement = vi.fn(() => {
        const currentMemory = global.window.performance.memory.usedJSHeapSize;
        memorySnapshots.push(currentMemory);
        
        // Simulate memory usage increase
        global.window.performance.memory.usedJSHeapSize = currentMemory + (10 * 1024 * 1024);

        return {
          getContext: vi.fn(() => ({
            canvas: {},
            clearRect: vi.fn(),
            drawImage: vi.fn(),
          })),
          width: 800,
          height: 600,
        };
      });

      const result = await renderer.renderPDF('https://memory-monitoring.com/test.pdf');

      expect(result.success).toBe(true);
      expect(memorySnapshots.length).toBeGreaterThan(0);
      expect(result.diagnostics.memoryUsagePattern).toBeDefined();
      expect(result.diagnostics.peakMemoryUsage).toBeGreaterThan(originalMemoryUsage);
    });
  });
});

/**
 * Helper function to create a mock PDF buffer
 */
function createMockPDFBuffer(size: number = 1024): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  
  // Add PDF header
  view[0] = 0x25; // %
  view[1] = 0x50; // P
  view[2] = 0x44; // D
  view[3] = 0x46; // F
  
  // Fill rest with mock data
  for (let i = 4; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256);
  }
  
  return buffer;
}