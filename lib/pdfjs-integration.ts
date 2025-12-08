/**
 * PDF.js Integration Layer
 * 
 * Provides a wrapper around PDF.js API with error handling,
 * progress tracking, and timeout management.
 * 
 * Requirements: 2.2, 6.5 - PDF document loading with progress tracking
 */

import * as pdfjsLib from 'pdfjs-dist';
import { optimizedFetch } from './pdfjs-network';
import type {
  PDFDocument,
  PDFPage,
  PDFViewport,
  PDFLoadingTask,
  PDFLoadingProgress,
  PDFDocumentSource,
  PDFRenderParams,
  PDFViewportParams,
} from './types/pdfjs';

/**
 * PDF Document Loader Options
 */
export interface LoadPDFDocumentOptions {
  /** PDF URL or data source */
  source: string | PDFDocumentSource;
  
  /** Progress callback */
  onProgress?: (progress: PDFLoadingProgress) => void;
  
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  
  /** HTTP headers for authentication */
  httpHeaders?: Record<string, string>;
  
  /** Password for encrypted PDFs */
  password?: string;
}

/**
 * PDF Document Loader Result
 */
export interface LoadPDFDocumentResult {
  /** Loaded PDF document */
  document: PDFDocument;
  
  /** Number of pages */
  numPages: number;
  
  /** Loading time in milliseconds */
  loadTime: number;
}

/**
 * PDF Document Loader Error
 */
export class PDFDocumentLoaderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PDFDocumentLoaderError';
  }
}

/**
 * Load a PDF document with error handling and progress tracking
 * 
 * Uses optimized network layer with caching, retry, and HTTP/2 support
 * 
 * @param options - Loading options
 * @returns Promise resolving to loaded document
 * @throws PDFDocumentLoaderError on failure
 * 
 * Requirements: 2.2, 6.5
 */
export async function loadPDFDocument(
  options: LoadPDFDocumentOptions
): Promise<LoadPDFDocumentResult> {
  const startTime = Date.now();
  const timeout = options.timeout ?? 30000;
  
  console.log('[loadPDFDocument] Starting PDF load');
  console.log('[loadPDFDocument] Source type:', typeof options.source);
  console.log('[loadPDFDocument] Timeout:', timeout);
  
  try {
    // If source is a URL string, use optimized fetch with caching and retry
    // Requirements: 6.5 - Network optimizations
    if (typeof options.source === 'string') {
      const url = options.source;
      console.log('[loadPDFDocument] Loading from URL:', url);
      
      // Fetch PDF with network optimizations
      console.log('[loadPDFDocument] Starting optimized fetch...');
      const response = await optimizedFetch(url, {
        headers: options.httpHeaders,
        timeout,
        cache: {
          enabled: true,
          cacheName: 'pdfjs-network-cache',
          cacheTTL: 60 * 60 * 1000, // 1 hour
        },
        retry: {
          enabled: true,
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
        },
        onProgress: options.onProgress ? (loaded, total) => {
          options.onProgress!({
            loaded,
            total,
          });
        } : undefined,
      });
      
      console.log('[loadPDFDocument] Fetch completed, response status:', response.status);
      console.log('[loadPDFDocument] Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Validate response
      if (!response.ok) {
        throw new PDFDocumentLoaderError(
          `Failed to fetch PDF: ${response.status} ${response.statusText}`,
          'NETWORK_ERROR'
        );
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('[loadPDFDocument] Content-Type:', contentType);
      if (contentType && !contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
        console.warn('[loadPDFDocument] Unexpected content type:', contentType);
      }
      
      // Get PDF data as ArrayBuffer
      console.log('[loadPDFDocument] Converting to ArrayBuffer...');
      const arrayBuffer = await response.arrayBuffer();
      console.log('[loadPDFDocument] ArrayBuffer size:', arrayBuffer.byteLength);
      
      // Convert ArrayBuffer to Uint8Array for PDF.js
      // PDF.js works better with Uint8Array than raw ArrayBuffer
      console.log('[loadPDFDocument] Converting to Uint8Array...');
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log('[loadPDFDocument] Uint8Array size:', uint8Array.length);
      
      // Validate PDF header
      if (uint8Array.length < 5) {
        throw new PDFDocumentLoaderError(
          'PDF data is too small to be valid',
          'INVALID_PDF'
        );
      }
      
      // Check for PDF header (%PDF-)
      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      console.log('[loadPDFDocument] PDF header:', header);
      if (!header.startsWith('%PDF-')) {
        console.error('[loadPDFDocument] Invalid PDF header. First 20 bytes:', 
          String.fromCharCode(...uint8Array.slice(0, Math.min(20, uint8Array.length))));
        throw new PDFDocumentLoaderError(
          'File does not appear to be a valid PDF (invalid header)',
          'INVALID_PDF'
        );
      }
      
      // Create document source with data
      // Include additional options to help PDF.js parse the document
      const source: PDFDocumentSource = {
        data: uint8Array,
        password: options.password,
        // Disable streaming to ensure full data is available
        disableStream: true,
        // Disable auto-fetch to prevent additional network requests
        disableAutoFetch: false,
        // Disable font face to avoid font loading issues
        disableFontFace: false,
      };
      
      // Create loading task
      console.log('[loadPDFDocument] Creating PDF.js loading task...');
      console.log('[loadPDFDocument] Source data type:', source.data instanceof Uint8Array ? 'Uint8Array' : typeof source.data);
      console.log('[loadPDFDocument] Source data length:', source.data instanceof Uint8Array ? source.data.length : 'N/A');
      console.log('[loadPDFDocument] Source options:', {
        hasPassword: !!source.password,
        disableStream: source.disableStream,
        disableAutoFetch: source.disableAutoFetch,
        disableFontFace: source.disableFontFace,
      });
      
      const loadingTask: PDFLoadingTask = pdfjsLib.getDocument(source);
      
      // Load document
      console.log('[loadPDFDocument] Loading PDF document...');
      try {
        const document = await loadingTask.promise as PDFDocument;
        console.log('[loadPDFDocument] PDF document loaded successfully');
        console.log('[loadPDFDocument] Number of pages:', document.numPages);
        console.log('[loadPDFDocument] PDF fingerprint:', document.fingerprints?.[0] || 'N/A');
      
        const loadTime = Date.now() - startTime;
        console.log('[loadPDFDocument] Total load time:', loadTime, 'ms');
        
        return {
          document,
          numPages: document.numPages,
          loadTime,
        };
      } catch (pdfError) {
        console.error('[loadPDFDocument] PDF.js failed to load document:', pdfError);
        console.error('[loadPDFDocument] PDF.js error details:', {
          name: pdfError instanceof Error ? pdfError.name : 'Unknown',
          message: pdfError instanceof Error ? pdfError.message : String(pdfError),
          stack: pdfError instanceof Error ? pdfError.stack : undefined,
        });
        throw pdfError;
      }
    }
    
    // For non-URL sources, use standard loading
    const source: PDFDocumentSource = options.source;
    
    // Create loading task
    const loadingTask: PDFLoadingTask = pdfjsLib.getDocument(source);
    
    // Set up progress tracking
    if (options.onProgress) {
      loadingTask.onProgress = (progress: { loaded: number; total: number }) => {
        options.onProgress!({
          loaded: progress.loaded,
          total: progress.total > 0 ? progress.total : undefined,
        });
      };
    }
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        loadingTask.destroy();
        reject(new PDFDocumentLoaderError(
          `PDF loading timed out after ${timeout}ms`,
          'TIMEOUT'
        ));
      }, timeout);
    });
    
    // Race between loading and timeout
    const document = await Promise.race([
      loadingTask.promise,
      timeoutPromise,
    ]) as PDFDocument;
    
    const loadTime = Date.now() - startTime;
    
    return {
      document,
      numPages: document.numPages,
      loadTime,
    };
    
  } catch (error) {
    console.error('[loadPDFDocument] Error occurred:', error);
    console.error('[loadPDFDocument] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    
    // Handle specific PDF.js errors
    if (error instanceof Error) {
      const errorName = error.name;
      console.error('[loadPDFDocument] Error name:', errorName);
      console.error('[loadPDFDocument] Error message:', error.message);
      console.error('[loadPDFDocument] Error stack:', error.stack);
      
      if (errorName === 'InvalidPDFException') {
        throw new PDFDocumentLoaderError(
          'The file is not a valid PDF document',
          'INVALID_PDF',
          error
        );
      }
      
      if (errorName === 'MissingPDFException') {
        throw new PDFDocumentLoaderError(
          'PDF file not found or could not be loaded',
          'MISSING_PDF',
          error
        );
      }
      
      if (errorName === 'UnexpectedResponseException') {
        throw new PDFDocumentLoaderError(
          'Unexpected response from server while loading PDF',
          'NETWORK_ERROR',
          error
        );
      }
      
      if (errorName === 'PasswordException') {
        throw new PDFDocumentLoaderError(
          'PDF is password protected',
          'PASSWORD_REQUIRED',
          error
        );
      }
      
      if (errorName === 'AbortException') {
        throw new PDFDocumentLoaderError(
          'PDF loading was cancelled',
          'CANCELLED',
          error
        );
      }
      
      // Re-throw if already our error type
      if (error instanceof PDFDocumentLoaderError) {
        throw error;
      }
    }
    
    // Generic error
    console.error('[loadPDFDocument] Throwing generic error');
    throw new PDFDocumentLoaderError(
      'Failed to load PDF document',
      'UNKNOWN_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Render Parameters for Canvas
 */
export interface RenderPageToCanvasOptions {
  /** PDF page to render */
  page: PDFPage;
  
  /** Canvas element to render to */
  canvas: HTMLCanvasElement;
  
  /** Scale factor (default: 1.0) */
  scale?: number;
  
  /** Rotation in degrees (default: 0) */
  rotation?: number;
  
  /** Rendering intent (default: 'display') */
  intent?: 'display' | 'print';
  
  /** Background color (default: transparent) */
  background?: string;
}

/**
 * Render Result
 */
export interface RenderPageToCanvasResult {
  /** Canvas element with rendered content */
  canvas: HTMLCanvasElement;
  
  /** Viewport used for rendering */
  viewport: PDFViewport;
  
  /** Render time in milliseconds */
  renderTime: number;
}

/**
 * PDF Page Renderer Error
 */
export class PDFPageRendererError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'PDFPageRendererError';
  }
}

/**
 * Render a PDF page to a canvas element
 * 
 * @param options - Rendering options
 * @returns Promise resolving to render result
 * @throws PDFPageRendererError on failure
 * 
 * Requirements: 2.3
 */
export async function renderPageToCanvas(
  options: RenderPageToCanvasOptions
): Promise<RenderPageToCanvasResult> {
  const startTime = Date.now();
  
  try {
    const { page, canvas, scale = 1.0, rotation = 0, intent = 'display', background } = options;
    
    // Get viewport with scaling
    const viewport = page.getViewport({ scale, rotation });
    
    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Get canvas context
    const context = canvas.getContext('2d');
    if (!context) {
      throw new PDFPageRendererError(
        'Failed to get 2D context from canvas',
        'CANVAS_CONTEXT_ERROR'
      );
    }
    
    // Clear canvas with background color if specified
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Prepare render parameters
    const renderParams: PDFRenderParams = {
      canvasContext: context,
      viewport,
      intent,
    };
    
    // Render the page
    const renderTask = page.render(renderParams);
    await renderTask.promise;
    
    const renderTime = Date.now() - startTime;
    
    return {
      canvas,
      viewport,
      renderTime,
    };
    
  } catch (error) {
    // Handle specific rendering errors
    if (error instanceof Error) {
      const errorName = error.name;
      
      if (errorName === 'RenderingCancelledException') {
        throw new PDFPageRendererError(
          'Page rendering was cancelled',
          'CANCELLED',
          error
        );
      }
      
      // Re-throw if already our error type
      if (error instanceof PDFPageRendererError) {
        throw error;
      }
    }
    
    // Generic error
    throw new PDFPageRendererError(
      'Failed to render PDF page to canvas',
      'RENDER_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Clean up canvas resources
 * 
 * @param canvas - Canvas element to clean up
 */
export function cleanupCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (context) {
    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Reset canvas dimensions to free memory
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Destroy a PDF document and free resources
 * 
 * @param document - PDF document to destroy
 */
export function destroyPDFDocument(document: PDFDocument): void {
  try {
    document.destroy();
  } catch (error) {
    console.error('Error destroying PDF document:', error);
  }
}
