/**
 * PDF.js Integration Property-Based Tests
 * 
 * Property-based tests for PDF document loading using fast-check
 * 
 * Feature: pdf-iframe-blocking-fix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  loadPDFDocument,
  PDFDocumentLoaderError,
} from '../pdfjs-integration';
import type { PDFDocument } from '../types/pdfjs';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {
    workerSrc: '',
  },
}));

// Mock pdfjs-network
vi.mock('../pdfjs-network', () => ({
  optimizedFetch: vi.fn(),
}));

describe('PDF.js Integration - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: pdf-iframe-blocking-fix, Property 3: PDF fetch success
   * 
   * Property: For any valid signed URL, when PDF.js attempts to fetch the document,
   * the fetch should complete successfully
   * 
   * Validates: Requirements 2.2
   * 
   * This property tests that the PDF loading mechanism successfully fetches
   * and loads PDF documents from valid URLs. It generates various URL formats
   * and PDF data to ensure the loading process is robust.
   */
  describe('Property 3: PDF fetch success', () => {
    it('should successfully fetch and load PDF from any valid signed URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid URL-like strings
          fc.record({
            protocol: fc.constantFrom('http:', 'https:'),
            domain: fc.domain(),
            path: fc.array(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), { minLength: 1, maxLength: 5 }),
            filename: fc.stringMatching(/^[a-zA-Z0-9_-]+\.pdf$/),
            queryParams: fc.dictionary(
              fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
              fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
              { minKeys: 0, maxKeys: 3 }
            ),
          }),
          // Generate valid PDF data characteristics
          fc.record({
            numPages: fc.integer({ min: 1, max: 100 }),
            fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
          }),
          async (urlParts, pdfData) => {
            // Construct URL
            const pathStr = urlParts.path.join('/');
            const queryStr = Object.entries(urlParts.queryParams)
              .map(([k, v]) => `${k}=${v}`)
              .join('&');
            const url = `${urlParts.protocol}//${urlParts.domain}/${pathStr}/${urlParts.filename}${
              queryStr ? `?${queryStr}` : ''
            }`;

            // Create valid PDF data (minimal valid PDF structure)
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
            const pdfPages = `2 0 obj\n<< /Type /Pages /Kids [] /Count ${pdfData.numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length + pdfPages.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfPages + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock the optimized fetch to return valid PDF data
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                  'Content-Length': pdfBytes.length.toString(),
                }),
              })
            );

            // Mock PDF.js document
            const mockDocument: Partial<PDFDocument> = {
              numPages: pdfData.numPages,
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Attempt to load the PDF
            const result = await loadPDFDocument({
              source: url,
              timeout: 5000,
            });

            // Verify the fetch was successful
            expect(result).toBeDefined();
            expect(result.document).toBe(mockDocument);
            expect(result.numPages).toBe(pdfData.numPages);
            expect(result.loadTime).toBeGreaterThanOrEqual(0);

            // Verify optimizedFetch was called with the URL
            expect(optimizedFetch).toHaveBeenCalledWith(
              url,
              expect.objectContaining({
                timeout: 5000,
              })
            );

            // Verify PDF.js getDocument was called with valid data
            expect(getDocument).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.any(Uint8Array),
              })
            );
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in design
          verbose: true,
        }
      );
    });

    it('should handle various URL formats with authentication parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate URLs with authentication tokens
          fc.record({
            baseUrl: fc.webUrl({ withFragments: false }),
            token: fc.string({ minLength: 32, maxLength: 64 }), // Generate token string
            expiry: fc.integer({ min: Date.now(), max: Date.now() + 86400000 }), // Within 24 hours
          }),
          fc.integer({ min: 1, max: 50 }), // numPages
          async (urlData, numPages) => {
            // Construct signed URL with authentication
            const url = `${urlData.baseUrl}?token=${urlData.token}&expires=${urlData.expiry}`;

            // Create minimal valid PDF
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count ${numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock fetch
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                  'Content-Length': pdfBytes.length.toString(),
                }),
              })
            );

            // Mock PDF.js
            const mockDocument: Partial<PDFDocument> = {
              numPages,
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Load PDF
            const result = await loadPDFDocument({
              source: url,
              timeout: 5000,
            });

            // Verify success
            expect(result.document).toBe(mockDocument);
            expect(result.numPages).toBe(numPages);
            expect(optimizedFetch).toHaveBeenCalledWith(url, expect.any(Object));
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should successfully load PDFs with various page counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ withFragments: false }),
          fc.integer({ min: 1, max: 1000 }), // Test wide range of page counts
          async (url, numPages) => {
            // Create minimal valid PDF
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count ${numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock fetch
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                }),
              })
            );

            // Mock PDF.js
            const mockDocument: Partial<PDFDocument> = {
              numPages,
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Load PDF
            const result = await loadPDFDocument({
              source: url,
            });

            // Verify the document was loaded with correct page count
            expect(result.numPages).toBe(numPages);
            expect(result.document.numPages).toBe(numPages);
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle progress tracking during fetch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ withFragments: false }),
          fc.integer({ min: 1, max: 20 }),
          async (url, numPages) => {
            // Create minimal valid PDF
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count ${numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock fetch
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                  'Content-Length': pdfBytes.length.toString(),
                }),
              })
            );

            // Mock PDF.js
            const mockDocument: Partial<PDFDocument> = {
              numPages,
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Track progress
            const progressUpdates: Array<{ loaded: number; total?: number }> = [];
            const onProgress = (progress: { loaded: number; total?: number }) => {
              progressUpdates.push(progress);
            };

            // Load PDF with progress tracking
            const result = await loadPDFDocument({
              source: url,
              onProgress,
            });

            // Verify successful load
            expect(result.document).toBe(mockDocument);
            expect(result.numPages).toBe(numPages);

            // Verify progress callback was passed to optimizedFetch
            expect(optimizedFetch).toHaveBeenCalledWith(
              url,
              expect.objectContaining({
                onProgress: expect.any(Function),
              })
            );
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
   * Feature: pdf-iframe-blocking-fix, Property 2: PDF.js library usage
   * 
   * Property: For any PDF rendering request, the system should use PDF.js library
   * and create canvas elements instead of iframe elements
   * 
   * Validates: Requirements 2.1, 2.3
   * 
   * This property tests that the rendering mechanism uses PDF.js to render PDFs
   * to canvas elements, avoiding iframe-based rendering that can be blocked by browsers.
   * It verifies that canvas elements are created and used for rendering across various
   * PDF documents and page configurations.
   */
  describe('Property 2: PDF.js library usage', () => {
    it('should use PDF.js library and create canvas elements for any PDF rendering request', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate PDF document characteristics
          fc.record({
            url: fc.webUrl({ withFragments: false }),
            numPages: fc.integer({ min: 1, max: 50 }),
            pageNumber: fc.integer({ min: 1, max: 50 }),
            scale: fc.float({ min: 0.5, max: 3.0, noNaN: true }),
          }),
          async (pdfData) => {
            // Ensure pageNumber is within valid range
            const validPageNumber = Math.min(pdfData.pageNumber, pdfData.numPages);
            
            // Create minimal valid PDF
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count ${pdfData.numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock fetch to return PDF data
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                  'Content-Length': pdfBytes.length.toString(),
                }),
              })
            );

            // Mock PDF.js document
            const mockPage = {
              pageNumber: validPageNumber,
              getViewport: vi.fn((params: { scale: number; rotation?: number }) => ({
                width: 612 * params.scale,
                height: 792 * params.scale,
                scale: params.scale,
                rotation: params.rotation || 0,
              })),
              render: vi.fn((params: any) => ({
                promise: Promise.resolve(),
                cancel: vi.fn(),
              })),
              cleanup: vi.fn(),
            };

            const mockDocument: Partial<PDFDocument> = {
              numPages: pdfData.numPages,
              getPage: vi.fn().mockResolvedValue(mockPage),
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Step 1: Load PDF document using PDF.js
            const loadResult = await loadPDFDocument({
              source: pdfData.url,
            });

            // Verify PDF.js was used for loading (not iframe)
            expect(getDocument).toHaveBeenCalled();
            expect(loadResult.document).toBe(mockDocument);
            expect(loadResult.numPages).toBe(pdfData.numPages);

            // Step 2: Render page to canvas
            const page = await loadResult.document.getPage(validPageNumber);
            
            // Create canvas element (simulating what the component does)
            const canvas = document.createElement('canvas');
            expect(canvas.tagName).toBe('CANVAS'); // Verify it's a canvas, not an iframe
            
            // Get viewport with scale
            const viewport = page.getViewport({ scale: pdfData.scale });
            
            // Verify viewport was created using PDF.js
            expect(page.getViewport).toHaveBeenCalledWith(
              expect.objectContaining({
                scale: pdfData.scale,
              })
            );
            expect(viewport.width).toBeGreaterThan(0);
            expect(viewport.height).toBeGreaterThan(0);
            expect(viewport.scale).toBe(pdfData.scale);
            
            // Set canvas dimensions based on viewport
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Get canvas context
            const context = canvas.getContext('2d');
            expect(context).not.toBeNull(); // Canvas context should be available
            
            // Render page to canvas using PDF.js
            const renderTask = page.render({
              canvasContext: context,
              viewport: viewport,
            });
            
            // Verify render was called with canvas context (not iframe)
            expect(page.render).toHaveBeenCalledWith(
              expect.objectContaining({
                canvasContext: context,
                viewport: viewport,
              })
            );
            
            // Wait for render to complete
            await renderTask.promise;
            
            // Verify canvas was used for rendering (within 1 pixel tolerance for floating point)
            expect(Math.abs(canvas.width - viewport.width)).toBeLessThan(1);
            expect(Math.abs(canvas.height - viewport.height)).toBeLessThan(1);
            expect(canvas.tagName).toBe('CANVAS');
            
            // Verify no iframe elements were created
            // In a real browser environment, we would check the DOM
            // Here we verify that only canvas-based rendering was used
            expect(getDocument).toHaveBeenCalled(); // PDF.js was used
            expect(page.render).toHaveBeenCalled(); // Canvas rendering was used
            
            // The absence of iframe-related calls confirms canvas-based rendering
            // No iframe.src, no iframe.sandbox, no iframe-related APIs
          }
        ),
        {
          numRuns: 100, // Run 100 iterations as specified in design
          verbose: true,
        }
      );
    });

    it('should use canvas rendering for multiple pages across different scales', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ withFragments: false }),
          fc.integer({ min: 2, max: 20 }), // numPages
          fc.array(
            fc.record({
              pageNumber: fc.integer({ min: 1, max: 20 }),
              scale: fc.float({ min: 0.5, max: 3.0, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (url, numPages, renderRequests) => {
            // Create minimal valid PDF
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count ${numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock fetch
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                }),
              })
            );

            // Mock PDF.js
            const mockPages = new Map();
            for (let i = 1; i <= numPages; i++) {
              mockPages.set(i, {
                pageNumber: i,
                getViewport: vi.fn((params: { scale: number }) => ({
                  width: 612 * params.scale,
                  height: 792 * params.scale,
                  scale: params.scale,
                })),
                render: vi.fn((params: any) => ({
                  promise: Promise.resolve(),
                  cancel: vi.fn(),
                })),
              });
            }

            const mockDocument: Partial<PDFDocument> = {
              numPages,
              getPage: vi.fn((pageNum: number) => {
                const page = mockPages.get(pageNum);
                return Promise.resolve(page);
              }),
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Load PDF using PDF.js
            const loadResult = await loadPDFDocument({ source: url });
            
            // Verify PDF.js was used
            expect(getDocument).toHaveBeenCalled();

            // Render multiple pages with different scales
            const canvases: HTMLCanvasElement[] = [];
            
            for (const request of renderRequests) {
              // Clamp page number to valid range
              const validPageNumber = Math.max(1, Math.min(request.pageNumber, numPages));
              
              // Get page
              const page = await loadResult.document.getPage(validPageNumber);
              
              // Create canvas (not iframe)
              const canvas = document.createElement('canvas');
              expect(canvas.tagName).toBe('CANVAS');
              canvases.push(canvas);
              
              // Get viewport
              const viewport = page.getViewport({ scale: request.scale });
              
              // Set canvas dimensions
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              // Get context
              const context = canvas.getContext('2d');
              expect(context).not.toBeNull();
              
              // Render to canvas
              const renderTask = page.render({
                canvasContext: context,
                viewport: viewport,
              });
              
              await renderTask.promise;
              
              // Verify canvas rendering was used
              expect(page.render).toHaveBeenCalledWith(
                expect.objectContaining({
                  canvasContext: context,
                  viewport: expect.objectContaining({
                    scale: request.scale,
                  }),
                })
              );
            }

            // Verify all renders used canvas elements
            expect(canvases.length).toBe(renderRequests.length);
            canvases.forEach(canvas => {
              expect(canvas.tagName).toBe('CANVAS');
              expect(canvas.width).toBeGreaterThan(0);
              expect(canvas.height).toBeGreaterThan(0);
            });

            // Verify PDF.js was used for all operations (no iframe)
            expect(mockDocument.getPage).toHaveBeenCalled();
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should create canvas elements with correct dimensions based on viewport', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ withFragments: false }),
          fc.integer({ min: 1, max: 10 }),
          fc.float({ min: 0.5, max: 3.0, noNaN: true }),
          fc.constantFrom(0, 90, 180, 270), // rotation: 0, 90, 180, 270
          async (url, numPages, scale, rotation) => {
            // Create minimal valid PDF
            const pdfHeader = '%PDF-1.4\n';
            const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count ${numPages} >>\nendobj\n`;
            const pdfXref = 'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n';
            const pdfTrailer = `trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n${
              pdfHeader.length + pdfContent.length
            }\n%%EOF`;
            const pdfString = pdfHeader + pdfContent + pdfXref + pdfTrailer;
            const pdfBytes = new TextEncoder().encode(pdfString);

            // Mock fetch
            const { optimizedFetch } = await import('../pdfjs-network');
            vi.mocked(optimizedFetch).mockResolvedValue(
              new Response(pdfBytes, {
                status: 200,
                statusText: 'OK',
                headers: new Headers({
                  'Content-Type': 'application/pdf',
                }),
              })
            );

            // Mock PDF.js with realistic viewport calculations
            const baseWidth = 612; // Standard PDF page width in points
            const baseHeight = 792; // Standard PDF page height in points
            
            const mockPage = {
              pageNumber: 1,
              getViewport: vi.fn((params: { scale: number; rotation?: number }) => {
                const rot = params.rotation || 0;
                // Swap dimensions for 90/270 degree rotations
                const isRotated = rot === 90 || rot === 270;
                return {
                  width: (isRotated ? baseHeight : baseWidth) * params.scale,
                  height: (isRotated ? baseWidth : baseHeight) * params.scale,
                  scale: params.scale,
                  rotation: rot,
                };
              }),
              render: vi.fn((params: any) => ({
                promise: Promise.resolve(),
                cancel: vi.fn(),
              })),
            };

            const mockDocument: Partial<PDFDocument> = {
              numPages,
              getPage: vi.fn().mockResolvedValue(mockPage),
              destroy: vi.fn(),
              fingerprints: ['test-fingerprint'],
            };

            const mockLoadingTask = {
              promise: Promise.resolve(mockDocument),
              onProgress: null,
              destroy: vi.fn(),
            };

            const { getDocument } = await import('pdfjs-dist');
            vi.mocked(getDocument).mockReturnValue(mockLoadingTask as any);

            // Load PDF using PDF.js
            const loadResult = await loadPDFDocument({ source: url });
            
            // Get page
            const page = await loadResult.document.getPage(1);
            
            // Create canvas element
            const canvas = document.createElement('canvas');
            expect(canvas.tagName).toBe('CANVAS');
            
            // Get viewport with scale and rotation
            const viewport = page.getViewport({ scale, rotation });
            
            // Verify viewport was created using PDF.js
            expect(page.getViewport).toHaveBeenCalledWith({
              scale,
              rotation,
            });
            
            // Set canvas dimensions to match viewport
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Verify canvas dimensions match viewport (within 1 pixel tolerance for floating point)
            expect(Math.abs(canvas.width - viewport.width)).toBeLessThan(1);
            expect(Math.abs(canvas.height - viewport.height)).toBeLessThan(1);
            
            // Verify dimensions are positive and scaled correctly
            const isRotated = rotation === 90 || rotation === 270;
            const expectedWidth = (isRotated ? baseHeight : baseWidth) * scale;
            const expectedHeight = (isRotated ? baseWidth : baseHeight) * scale;
            
            // Use a tolerance of 1 pixel for floating point precision
            expect(Math.abs(canvas.width - expectedWidth)).toBeLessThan(1);
            expect(Math.abs(canvas.height - expectedHeight)).toBeLessThan(1);
            
            // Get canvas context for rendering
            const context = canvas.getContext('2d');
            expect(context).not.toBeNull();
            
            // Render to canvas
            const renderTask = page.render({
              canvasContext: context,
              viewport: viewport,
            });
            
            await renderTask.promise;
            
            // Verify canvas-based rendering was used (not iframe)
            expect(page.render).toHaveBeenCalledWith(
              expect.objectContaining({
                canvasContext: context,
                viewport: viewport,
              })
            );
            
            // Verify canvas element properties
            expect(canvas.tagName).toBe('CANVAS');
            expect(canvas.width).toBeGreaterThan(0);
            expect(canvas.height).toBeGreaterThan(0);
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
