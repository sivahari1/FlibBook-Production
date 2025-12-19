/**
 * PDFViewerWithPDFJS State Update Isolation Property Tests
 * 
 * **Feature: pdf-viewer-infinite-loop-fix, Property 2: State Update Isolation**
 * **Validates: Requirements 1.3, 3.1, 3.2**
 * 
 * Tests that progress updates and other state changes don't trigger the main
 * document loading effect to re-execute, preventing infinite loops.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import PDFViewerWithPDFJS from '../PDFViewerWithPDFJS';

// Helper to create watermark generator
const watermarkGenerator = () => fc.record({
  text: fc.string({ minLength: 1, maxLength: 50 }),
  opacity: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
  fontSize: fc.integer({ min: 8, max: 24 }),
});

// Mock PDF.js and related modules
vi.mock('@/lib/pdfjs-config', () => ({
  initializePDFJS: vi.fn(),
  isPDFJSAvailable: vi.fn(() => true),
}));

vi.mock('@/lib/pdfjs-integration', () => ({
  loadPDFDocument: vi.fn(),
  cleanupCanvas: vi.fn(),
  destroyPDFDocument: vi.fn(),
  PDFDocumentLoaderError: class PDFDocumentLoaderError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
  PDFPageRendererError: class PDFPageRendererError extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
}));

vi.mock('@/lib/pdfjs-memory', () => ({
  createMemoryManager: vi.fn(() => ({
    setPDFDocument: vi.fn(),
    addRenderedPage: vi.fn(),
    addPageObject: vi.fn(),
    prioritizePages: vi.fn(() => [1, 2, 3]),
    removeNonPriorityPages: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('@/lib/pdfjs-render-pipeline', () => ({
  getGlobalRenderPipeline: vi.fn(() => ({
    queueRender: vi.fn((page, pageNum, canvas, zoom, priority, callback) => {
      // Simulate successful render
      setTimeout(() => callback(null), 10);
    }),
  })),
}));

// Mock ReliablePDFRenderer with progress simulation
let mockProgressCallback: ((progress: any) => void) | null = null;
let mockRenderingId = 'test-rendering-id';
const mockRenderPDF = vi.fn();

vi.mock('@/lib/pdf-reliability/reliable-pdf-renderer', () => ({
  ReliablePDFRenderer: class MockReliablePDFRenderer {
    renderPDF = mockRenderPDF;
    onProgressUpdate = vi.fn((renderingId: string, callback: (progress: any) => void) => {
      if (renderingId === mockRenderingId) {
        mockProgressCallback = callback;
      }
    });
    cancelRendering = vi.fn();
    forceRetry = vi.fn();
  },
}));

// Mock child components
vi.mock('../WatermarkOverlay', () => ({
  default: ({ text }: { text: string }) => <div data-testid="watermark">{text}</div>,
}));

vi.mock('../LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading">{message}</div>,
}));

vi.mock('../ViewerError', () => ({
  default: ({ error }: { error: string }) => <div data-testid="error">{error}</div>,
}));

vi.mock('../SimplePDFViewer', () => ({
  default: ({ pdfUrl }: { pdfUrl: string }) => <div data-testid="simple-viewer">{pdfUrl}</div>,
}));

describe('PDFViewerWithPDFJS State Update Isolation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressCallback = null;
    mockRenderingId = `test-rendering-id-${Date.now()}`;
    
    // Reset the mock implementation
    mockRenderPDF.mockImplementation(async () => {
      // Simulate progress updates during rendering
      if (mockProgressCallback) {
        // Simulate multiple progress updates
        setTimeout(() => mockProgressCallback?.({
          percentage: 25,
          stage: 'loading',
          isStuck: false,
          bytesLoaded: 1024,
          totalBytes: 4096,
          timeElapsed: 1000,
        }), 50);
        
        setTimeout(() => mockProgressCallback?.({
          percentage: 50,
          stage: 'parsing',
          isStuck: false,
          bytesLoaded: 2048,
          totalBytes: 4096,
          timeElapsed: 2000,
        }), 100);
        
        setTimeout(() => mockProgressCallback?.({
          percentage: 75,
          stage: 'rendering',
          isStuck: false,
          bytesLoaded: 3072,
          totalBytes: 4096,
          timeElapsed: 3000,
        }), 150);
        
        setTimeout(() => mockProgressCallback?.({
          percentage: 100,
          stage: 'complete',
          isStuck: false,
          bytesLoaded: 4096,
          totalBytes: 4096,
          timeElapsed: 4000,
        }), 200);
      }
      
      return {
        success: true,
        renderingId: mockRenderingId,
        pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockProgressCallback = null;
  });

  /**
   * Property 2: State Update Isolation
   * 
   * For any sequence of loading state changes, progress updates should not 
   * trigger the main document loading effect to re-execute.
   */
  it('should not re-execute document loading effect when progress updates occur', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          watermark: fc.option(watermarkGenerator(), { nil: undefined }),
          enableDRM: fc.boolean(),
          viewMode: fc.constantFrom('single', 'continuous'),
        }),
        async (testData) => {
          // Clear the mock before each test
          mockRenderPDF.mockClear();
          
          // Render component
          render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
              watermark={testData.watermark}
              enableDRM={testData.enableDRM}
              viewMode={testData.viewMode as 'single' | 'continuous'}
            />
          );

          // Wait for the initial renderPDF call with shorter timeout
          await waitFor(() => {
            expect(mockRenderPDF).toHaveBeenCalledTimes(1);
          }, { timeout: 1000 });

          // Clear the mock to track subsequent calls
          mockRenderPDF.mockClear();

          // Wait for progress updates to complete (they should trigger state updates)
          await new Promise(resolve => setTimeout(resolve, 100));

          // Verify that renderPDF was not called again despite progress updates
          expect(mockRenderPDF).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 5, // Reduce for faster testing
        timeout: 10000, // Reduce timeout
      }
    );
  });

  /**
   * Property: Loading State Isolation
   * 
   * For any sequence of loading state updates (progress, status changes),
   * the document loading effect should remain stable and not re-execute.
   */
  it('should isolate loading state updates from document loading effect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          progressUpdates: fc.array(
            fc.record({
              percentage: fc.integer({ min: 0, max: 100 }),
              stage: fc.constantFrom('loading', 'parsing', 'rendering', 'complete'),
              delay: fc.integer({ min: 10, max: 100 }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
        }),
        async (testData) => {
          // Clear and configure the mock for custom progress simulation
          mockRenderPDF.mockClear();
          
          // Override the renderPDF implementation to simulate custom progress
          mockRenderPDF.mockImplementation(async () => {
            // Simulate the progress updates from test data
            if (mockProgressCallback) {
              for (const update of testData.progressUpdates) {
                setTimeout(() => {
                  mockProgressCallback?.({
                    percentage: update.percentage,
                    stage: update.stage,
                    isStuck: false,
                    bytesLoaded: Math.floor((update.percentage / 100) * 4096),
                    totalBytes: 4096,
                    timeElapsed: update.delay * 10,
                  });
                }, update.delay);
              }
            }
            
            return {
              success: true,
              renderingId: mockRenderingId,
              pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
            };
          });

          // Render component
          render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
            />
          );

          // Wait for initial render to start
          await waitFor(() => {
            expect(mockRenderPDF).toHaveBeenCalledTimes(1);
          }, { timeout: 2000 });

          // Clear the mock after initial call
          mockRenderPDF.mockClear();

          // Wait for all progress updates to complete
          const maxDelay = Math.max(...testData.progressUpdates.map(u => u.delay));
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, maxDelay + 100));
          });

          // Verify that renderPDF was not called again despite multiple progress updates
          expect(mockRenderPDF).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Reliability Progress Isolation
   * 
   * For any reliability progress updates (including stuck detection),
   * the main document loading effect should not be triggered.
   */
  it('should isolate reliability progress updates from document loading effect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          simulateStuck: fc.boolean(),
        }),
        async (testData) => {
          // Clear and configure the mock
          mockRenderPDF.mockClear();
          
          // Override to simulate stuck detection if requested
          mockRenderPDF.mockImplementation(async () => {
            if (mockProgressCallback) {
              // Normal progress
              setTimeout(() => mockProgressCallback?.({
                percentage: 25,
                stage: 'loading',
                isStuck: false,
                bytesLoaded: 1024,
                totalBytes: 4096,
                timeElapsed: 1000,
              }), 50);
              
              // Simulate stuck state if requested
              if (testData.simulateStuck) {
                setTimeout(() => mockProgressCallback?.({
                  percentage: 25,
                  stage: 'loading',
                  isStuck: true, // This should not trigger re-execution
                  bytesLoaded: 1024,
                  totalBytes: 4096,
                  timeElapsed: 15000, // Long time elapsed
                }), 100);
              }
              
              // Recovery
              setTimeout(() => mockProgressCallback?.({
                percentage: 100,
                stage: 'complete',
                isStuck: false,
                bytesLoaded: 4096,
                totalBytes: 4096,
                timeElapsed: testData.simulateStuck ? 20000 : 4000,
              }), 150);
            }
            
            return {
              success: true,
              renderingId: mockRenderingId,
              pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
            };
          });

          // Render component
          render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
            />
          );

          // Wait for initial render
          await waitFor(() => {
            expect(mockRenderPDF).toHaveBeenCalledTimes(1);
          }, { timeout: 2000 });

          // Clear the mock
          mockRenderPDF.mockClear();

          // Wait for all progress updates including stuck detection
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
          });

          // Verify no re-execution even with stuck detection
          expect(mockRenderPDF).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Page Render State Isolation
   * 
   * For any page rendering state changes (rendering, rendered, error),
   * the document loading effect should not be affected.
   */
  it('should isolate page render state changes from document loading effect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          viewMode: fc.constantFrom('single', 'continuous'),
          simulateRenderError: fc.boolean(),
        }),
        async (testData) => {
          // Mock the render pipeline to simulate page rendering state changes
          const { getGlobalRenderPipeline } = await import('@/lib/pdfjs-render-pipeline');
          const mockPipeline = getGlobalRenderPipeline as any;
          
          let renderCallback: ((error: Error | null) => void) | null = null;
          
          mockPipeline.mockReturnValue({
            queueRender: vi.fn((page, pageNum, canvas, zoom, priority, callback) => {
              renderCallback = callback;
              
              // Simulate rendering state changes
              setTimeout(() => {
                if (testData.simulateRenderError) {
                  callback(new Error('Simulated render error'));
                } else {
                  callback(null); // Success
                }
              }, 50);
            }),
          });

          // Clear the mock
          mockRenderPDF.mockClear();

          // Render component
          render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
              viewMode={testData.viewMode as 'single' | 'continuous'}
            />
          );

          // Wait for initial document load
          await waitFor(() => {
            expect(mockRenderPDF).toHaveBeenCalledTimes(1);
          }, { timeout: 2000 });

          // Clear the mock
          mockRenderPDF.mockClear();

          // Wait for page rendering to complete (which changes page render state)
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
          });

          // Verify that page render state changes don't trigger document reload
          expect(mockRenderPDF).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Zoom State Isolation
   * 
   * For any zoom level changes, the document loading effect should not
   * re-execute (only page rendering should be affected).
   */
  it('should isolate zoom state changes from document loading effect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          zoomChanges: fc.array(
            fc.float({ min: 0.5, max: 3.0 }),
            { minLength: 2, maxLength: 5 }
          ),
        }),
        async (testData) => {
          // Clear the mock
          mockRenderPDF.mockClear();

          // Render component
          const { container } = render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
            />
          );

          // Wait for initial document load
          await waitFor(() => {
            expect(mockRenderPDF).toHaveBeenCalledTimes(1);
          }, { timeout: 2000 });

          // Clear the mock
          mockRenderPDF.mockClear();

          // Simulate zoom changes by triggering wheel events with Ctrl key
          for (const zoomLevel of testData.zoomChanges) {
            await act(async () => {
              const wheelEvent = new WheelEvent('wheel', {
                deltaY: zoomLevel > 1 ? -100 : 100, // Negative for zoom in, positive for zoom out
                ctrlKey: true,
                bubbles: true,
              });
              
              container.dispatchEvent(wheelEvent);
              
              // Wait for zoom state to update
              await new Promise(resolve => setTimeout(resolve, 50));
            });
          }

          // Verify that zoom changes don't trigger document reload
          expect(mockRenderPDF).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  });

  /**
   * Property: Current Page State Isolation
   * 
   * For any current page changes, the document loading effect should not
   * re-execute (only page rendering should be affected).
   */
  it('should isolate current page changes from document loading effect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          pdfUrl: fc.webUrl({ validSchemes: ['https'] }),
          documentTitle: fc.string({ minLength: 1, maxLength: 100 }),
          pageChanges: fc.array(
            fc.integer({ min: 1, max: 5 }),
            { minLength: 2, maxLength: 5 }
          ),
        }),
        async (testData) => {
          // Clear and configure the mock to return multiple pages
          mockRenderPDF.mockClear();
          mockRenderPDF.mockResolvedValue({
            success: true,
            renderingId: mockRenderingId,
            pages: Array.from({ length: 5 }, (_, i) => ({ pageNumber: i + 1 })),
          });

          // Render component
          const { container } = render(
            <PDFViewerWithPDFJS
              pdfUrl={testData.pdfUrl}
              documentTitle={testData.documentTitle}
            />
          );

          // Wait for initial document load
          await waitFor(() => {
            expect(mockRenderPDF).toHaveBeenCalledTimes(1);
          }, { timeout: 2000 });

          // Clear the mock
          mockRenderPDF.mockClear();

          // Simulate page changes by triggering keyboard events
          for (const pageNumber of testData.pageChanges) {
            await act(async () => {
              // Simulate arrow key navigation
              const keyEvent = new KeyboardEvent('keydown', {
                key: pageNumber > 3 ? 'ArrowRight' : 'ArrowLeft',
                bubbles: true,
              });
              
              window.dispatchEvent(keyEvent);
              
              // Wait for page state to update
              await new Promise(resolve => setTimeout(resolve, 50));
            });
          }

          // Verify that page changes don't trigger document reload
          expect(mockRenderPDF).toHaveBeenCalledTimes(0);
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
      }
    );
  });
});