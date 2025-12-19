/**
 * Rendering Diagnostics Collection System
 * 
 * Collects detailed diagnostic information for rendering errors
 * Requirements: 2.4, 3.3
 */

import {
  BrowserInfo,
  DocumentInfo,
  PerformanceMetrics,
  NetworkContext,
  RenderingDiagnostics,
  RenderingErrorType,
} from './rendering-errors';

/**
 * Diagnostics Collector Class
 * Requirements: 2.4, 3.3
 */
export class DiagnosticsCollector {
  private startTime: number = Date.now();
  private performanceMarks: Map<string, number> = new Map();
  
  /**
   * Collect browser information
   * Requirements: 2.4, 3.3
   */
  collectBrowserInfo(): BrowserInfo {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    
    // Detect PDF.js version if available
    const pdfJsVersion = this.detectPDFJSVersion();
    
    // Check supported features
    const supportedFeatures = this.detectSupportedFeatures();
    
    // Check WebGL support
    const webGLSupported = this.checkWebGLSupport();
    
    // Check Canvas support
    const canvasSupported = this.checkCanvasSupport();
    
    // Estimate memory information
    const memoryInfo = this.getMemoryInfo();
    
    return {
      userAgent,
      pdfJsVersion,
      supportedFeatures,
      webGLSupported,
      canvasSupported,
      memoryLimit: memoryInfo.memoryLimit,
      availableMemory: memoryInfo.availableMemory,
    };
  }
  
  /**
   * Collect document information from PDF
   * Requirements: 2.4, 3.3
   */
  async collectDocumentInfo(pdfDocument?: any): Promise<DocumentInfo | undefined> {
    if (!pdfDocument) return undefined;
    
    try {
      const metadata = await pdfDocument.getMetadata?.();
      const pageCount = pdfDocument.numPages;
      
      return {
        pageCount,
        fileSize: pdfDocument._pdfInfo?.length,
        version: pdfDocument._pdfInfo?.version,
        encrypted: pdfDocument._pdfInfo?.encrypted || false,
        hasJavaScript: metadata?.info?.JavaScript || false,
        hasEmbeddedFiles: metadata?.info?.EmbeddedFiles || false,
        title: metadata?.info?.Title,
        author: metadata?.info?.Author,
        creationDate: metadata?.info?.CreationDate ? new Date(metadata.info.CreationDate) : undefined,
        modificationDate: metadata?.info?.ModDate ? new Date(metadata.info.ModDate) : undefined,
      };
    } catch (error) {
      console.warn('Failed to collect document info:', error);
      return {
        encrypted: false,
      };
    }
  }
  
  /**
   * Collect performance metrics
   * Requirements: 2.4, 3.3
   */
  collectPerformanceMetrics(
    totalPages?: number,
    renderedPages?: number,
    failedPages?: number
  ): PerformanceMetrics {
    const currentTime = Date.now();
    const loadTime = currentTime - this.startTime;
    
    // Get render time from performance marks
    const renderTime = this.performanceMarks.get('renderEnd') 
      ? (this.performanceMarks.get('renderEnd')! - (this.performanceMarks.get('renderStart') || this.startTime))
      : 0;
    
    // Estimate memory usage
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      loadTime,
      renderTime,
      memoryUsage,
      totalPages,
      renderedPages,
      failedPages,
    };
  }
  
  /**
   * Collect network context information
   * Requirements: 2.4, 3.3
   */
  collectNetworkContext(
    url: string,
    response?: Response,
    loadTime?: number,
    retryAttempts?: number
  ): NetworkContext {
    const context: NetworkContext = {
      url,
      retryAttempts: retryAttempts || 0,
    };
    
    if (response) {
      context.responseStatus = response.status;
      context.responseHeaders = this.extractResponseHeaders(response);
    }
    
    if (loadTime !== undefined) {
      context.loadTime = loadTime;
    }
    
    // Detect connection type if available
    const connection = (navigator as any)?.connection;
    if (connection) {
      context.connectionType = connection.effectiveType || connection.type;
    }
    
    return context;
  }
  
  /**
   * Create comprehensive diagnostics
   * Requirements: 2.4, 3.3
   */
  async createDiagnostics(
    documentId: string,
    pdfUrl: string,
    errorType: RenderingErrorType,
    pdfDocument?: any,
    response?: Response,
    additionalContext?: Record<string, any>
  ): Promise<RenderingDiagnostics> {
    const browserInfo = this.collectBrowserInfo();
    const documentInfo = await this.collectDocumentInfo(pdfDocument);
    const performanceMetrics = this.collectPerformanceMetrics();
    const networkContext = this.collectNetworkContext(pdfUrl, response);
    
    return {
      documentId,
      pdfUrl,
      errorType,
      timestamp: new Date(),
      browserInfo,
      documentInfo,
      performanceMetrics,
      networkContext,
      additionalContext,
    };
  }
  
  /**
   * Mark performance timing
   * Requirements: 2.4, 3.3
   */
  markPerformance(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }
  
  /**
   * Reset diagnostics collector
   * Requirements: 2.4, 3.3
   */
  reset(): void {
    this.startTime = Date.now();
    this.performanceMarks.clear();
  }
  
  /**
   * Detect PDF.js version
   * Private helper method
   */
  private detectPDFJSVersion(): string | undefined {
    try {
      // Try to access PDF.js version from global object
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib?.version) {
        return pdfjsLib.version;
      }
      
      // Try to detect from build info
      const buildInfo = (window as any).pdfjsBuild;
      if (buildInfo?.version) {
        return buildInfo.version;
      }
      
      return undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Detect supported browser features
   * Private helper method
   */
  private detectSupportedFeatures(): string[] {
    const features: string[] = [];
    
    // Check for various browser features
    if (typeof Worker !== 'undefined') {
      features.push('web-workers');
    }
    
    if (typeof WebAssembly !== 'undefined') {
      features.push('webassembly');
    }
    
    if (typeof OffscreenCanvas !== 'undefined') {
      features.push('offscreen-canvas');
    }
    
    if (typeof ImageBitmap !== 'undefined') {
      features.push('image-bitmap');
    }
    
    if (typeof createImageBitmap !== 'undefined') {
      features.push('create-image-bitmap');
    }
    
    // Check for PDF.js specific features
    if ((window as any).pdfjsLib) {
      features.push('pdfjs-library');
    }
    
    if ((window as any).pdfjsWorker) {
      features.push('pdfjs-worker');
    }
    
    return features;
  }
  
  /**
   * Check WebGL support
   * Private helper method
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check Canvas support
   * Private helper method
   */
  private checkCanvasSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      return !!ctx;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get memory information
   * Private helper method
   */
  private getMemoryInfo(): { memoryLimit?: number; availableMemory?: number } {
    try {
      // Try to get memory info from performance API
      const memory = (performance as any)?.memory;
      if (memory) {
        return {
          memoryLimit: memory.jsHeapSizeLimit,
          availableMemory: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
        };
      }
      
      // Try to get device memory info
      const deviceMemory = (navigator as any)?.deviceMemory;
      if (deviceMemory) {
        return {
          memoryLimit: deviceMemory * 1024 * 1024 * 1024, // Convert GB to bytes
        };
      }
      
      return {};
    } catch (error) {
      return {};
    }
  }
  
  /**
   * Estimate current memory usage
   * Private helper method
   */
  private estimateMemoryUsage(): number {
    try {
      const memory = (performance as any)?.memory;
      if (memory) {
        return memory.usedJSHeapSize;
      }
      
      // Fallback estimation based on DOM elements and other factors
      const elements = document.querySelectorAll('*').length;
      const canvases = document.querySelectorAll('canvas').length;
      
      // Rough estimation: 1KB per DOM element + 1MB per canvas
      return elements * 1024 + canvases * 1024 * 1024;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Extract response headers
   * Private helper method
   */
  private extractResponseHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    
    try {
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } catch (error) {
      // Headers might not be accessible due to CORS
    }
    
    return headers;
  }
}

/**
 * Global diagnostics collector instance
 */
let globalDiagnosticsCollector: DiagnosticsCollector | null = null;

/**
 * Get global diagnostics collector
 * Requirements: 2.4, 3.3
 */
export function getDiagnosticsCollector(): DiagnosticsCollector {
  if (!globalDiagnosticsCollector) {
    globalDiagnosticsCollector = new DiagnosticsCollector();
  }
  return globalDiagnosticsCollector;
}

/**
 * Create diagnostics for error
 * Requirements: 2.4, 3.3
 */
export async function createErrorDiagnostics(
  documentId: string,
  pdfUrl: string,
  errorType: RenderingErrorType,
  pdfDocument?: any,
  response?: Response,
  additionalContext?: Record<string, any>
): Promise<RenderingDiagnostics> {
  const collector = getDiagnosticsCollector();
  return collector.createDiagnostics(
    documentId,
    pdfUrl,
    errorType,
    pdfDocument,
    response,
    additionalContext
  );
}

/**
 * Mark performance timing
 * Requirements: 2.4, 3.3
 */
export function markPerformance(name: string): void {
  const collector = getDiagnosticsCollector();
  collector.markPerformance(name);
}

/**
 * Reset diagnostics
 * Requirements: 2.4, 3.3
 */
export function resetDiagnostics(): void {
  const collector = getDiagnosticsCollector();
  collector.reset();
}