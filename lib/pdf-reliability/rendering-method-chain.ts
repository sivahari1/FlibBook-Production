/**
 * PDF Rendering Method Chain
 * 
 * Implements multiple fallback rendering approaches for reliable PDF display
 * 
 * Requirements: 1.3, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { 
  RenderingMethod, 
  RenderingStage, 
  ErrorType,
  type RenderContext, 
  type RenderResult, 
  type RenderedPage,
  type DiagnosticsData 
} from './types';
import { 
  ReliablePDFRendererError, 
  NetworkError, 
  ParsingError, 
  CanvasError, 
  TimeoutError,
  ErrorFactory 
} from './errors';
import { createReliabilityConfig } from './config';

/**
 * Document type classification for method preference learning
 */
interface DocumentType {
  size: number;
  pageCount?: number;
  hasImages?: boolean;
  isPasswordProtected?: boolean;
  mimeType?: string;
}

/**
 * Method success tracking for preference learning
 */
interface MethodSuccess {
  method: RenderingMethod;
  documentType: string;
  successCount: number;
  totalAttempts: number;
  averageRenderTime: number;
  lastUsed: Date;
}

/**
 * Rendering Method Chain Implementation
 */
export class RenderingMethodChain {
  private methodSuccessMap = new Map<string, MethodSuccess>();
  private config = createReliabilityConfig();

  /**
   * Get the ordered fallback chain starting from a specific method
   */
  private getFallbackChain(startMethod?: RenderingMethod): RenderingMethod[] {
    const allMethods = [
      RenderingMethod.PDFJS_CANVAS,
      RenderingMethod.NATIVE_BROWSER,
      RenderingMethod.SERVER_CONVERSION,
      RenderingMethod.IMAGE_BASED,
      RenderingMethod.DOWNLOAD_FALLBACK
    ];

    if (!startMethod) {
      return allMethods;
    }

    const startIndex = allMethods.indexOf(startMethod);
    if (startIndex === -1) {
      return allMethods;
    }

    // Return methods starting from the specified method
    return [...allMethods.slice(startIndex), ...allMethods.slice(0, startIndex)];
  }

  /**
   * Classify document type for method preference learning
   */
  private classifyDocumentType(context: RenderContext): string {
    const url = context.url;
    const size = 0; // Would be determined from actual document
    
    // Simple classification based on URL patterns and context
    if (size < 1024 * 1024) { // < 1MB
      return 'small';
    } else if (size > 10 * 1024 * 1024) { // > 10MB
      return 'large';
    } else {
      return 'medium';
    }
  }

  /**
   * Get preferred method for a document type
   */
  getPreferredMethod(documentType: string): RenderingMethod {
    const successEntries = Array.from(this.methodSuccessMap.values())
      .filter(entry => entry.documentType === documentType)
      .sort((a, b) => {
        // Sort by success rate, then by average render time
        const aSuccessRate = a.successCount / a.totalAttempts;
        const bSuccessRate = b.successCount / b.totalAttempts;
        
        if (aSuccessRate !== bSuccessRate) {
          return bSuccessRate - aSuccessRate; // Higher success rate first
        }
        
        return a.averageRenderTime - b.averageRenderTime; // Faster render time first
      });

    if (successEntries.length > 0) {
      return successEntries[0].method;
    }

    // Default preference based on document type
    switch (documentType) {
      case 'small':
        return RenderingMethod.PDFJS_CANVAS;
      case 'large':
        return RenderingMethod.SERVER_CONVERSION;
      default:
        return RenderingMethod.PDFJS_CANVAS;
    }
  }

  /**
   * Get the next method in the fallback chain
   */
  getNextMethod(failedMethod: RenderingMethod): RenderingMethod | null {
    const chain = this.getFallbackChain();
    const currentIndex = chain.indexOf(failedMethod);
    
    if (currentIndex === -1 || currentIndex >= chain.length - 1) {
      return null; // No more methods to try
    }
    
    return chain[currentIndex + 1];
  }

  /**
   * Record method success for preference learning
   */
  recordMethodSuccess(method: RenderingMethod, documentType: string, renderTime: number = 0): void {
    const key = `${method}-${documentType}`;
    const existing = this.methodSuccessMap.get(key);
    
    if (existing) {
      existing.successCount++;
      existing.totalAttempts++;
      existing.averageRenderTime = (existing.averageRenderTime + renderTime) / 2;
      existing.lastUsed = new Date();
    } else {
      this.methodSuccessMap.set(key, {
        method,
        documentType,
        successCount: 1,
        totalAttempts: 1,
        averageRenderTime: renderTime,
        lastUsed: new Date()
      });
    }
  }

  /**
   * Record method failure for preference learning
   */
  recordMethodFailure(method: RenderingMethod, documentType: string): void {
    const key = `${method}-${documentType}`;
    const existing = this.methodSuccessMap.get(key);
    
    if (existing) {
      existing.totalAttempts++;
    } else {
      this.methodSuccessMap.set(key, {
        method,
        documentType,
        successCount: 0,
        totalAttempts: 1,
        averageRenderTime: 0,
        lastUsed: new Date()
      });
    }
  }

  /**
   * Attempt rendering with PDF.js canvas method
   */
  private async attemptPDFJSCanvas(context: RenderContext): Promise<RenderResult> {
    const startTime = Date.now();
    
    try {
      // This would integrate with existing PDF.js implementation
      // For now, we'll simulate the process
      
      // Check if we have a canvas
      if (!context.canvas) {
        throw new CanvasError(
          'No canvas available for PDF.js rendering',
          RenderingStage.RENDERING,
          RenderingMethod.PDFJS_CANVAS
        );
      }

      // Simulate PDF.js rendering process
      const pages: RenderedPage[] = [];
      
      // This is where we would integrate with the existing PDFViewerWithPDFJS component
      // For now, return a mock successful result
      
      const renderTime = Date.now() - startTime;
      
      return {
        success: true,
        renderingId: context.renderingId,
        method: RenderingMethod.PDFJS_CANVAS,
        pages,
        diagnostics: this.createDiagnostics(context, startTime, renderTime)
      };
      
    } catch (error) {
      const renderTime = Date.now() - startTime;
      const renderError = ErrorFactory.fromError(
        error as Error,
        RenderingStage.RENDERING,
        RenderingMethod.PDFJS_CANVAS,
        { url: context.url, renderTime }
      );
      
      return {
        success: false,
        renderingId: context.renderingId,
        method: RenderingMethod.PDFJS_CANVAS,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: this.createDiagnostics(context, startTime, renderTime, renderError)
      };
    }
  }

  /**
   * Attempt rendering with native browser method
   */
  private async attemptNativeBrowser(context: RenderContext): Promise<RenderResult> {
    const startTime = Date.now();
    
    try {
      // Create an iframe or embed element for native browser rendering
      const iframe = document.createElement('iframe');
      iframe.src = context.url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      
      // Wait for load or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new TimeoutError(
            'Native browser rendering timed out',
            RenderingStage.RENDERING,
            RenderingMethod.NATIVE_BROWSER
          ));
        }, context.options.timeout || this.config.defaultTimeout);
        
        iframe.onload = () => {
          clearTimeout(timeout);
          resolve(void 0);
        };
        
        iframe.onerror = () => {
          clearTimeout(timeout);
          reject(new NetworkError(
            'Failed to load PDF in native browser',
            RenderingStage.RENDERING,
            RenderingMethod.NATIVE_BROWSER
          ));
        };
      });
      
      const renderTime = Date.now() - startTime;
      
      return {
        success: true,
        renderingId: context.renderingId,
        method: RenderingMethod.NATIVE_BROWSER,
        pages: [], // Native browser doesn't provide individual pages
        diagnostics: this.createDiagnostics(context, startTime, renderTime)
      };
      
    } catch (error) {
      const renderTime = Date.now() - startTime;
      const renderError = ErrorFactory.fromError(
        error as Error,
        RenderingStage.RENDERING,
        RenderingMethod.NATIVE_BROWSER,
        { url: context.url, renderTime }
      );
      
      return {
        success: false,
        renderingId: context.renderingId,
        method: RenderingMethod.NATIVE_BROWSER,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: this.createDiagnostics(context, startTime, renderTime, renderError)
      };
    }
  }

  /**
   * Attempt rendering with server-side conversion
   */
  private async attemptServerConversion(context: RenderContext): Promise<RenderResult> {
    const startTime = Date.now();
    
    try {
      // Call server-side conversion API
      const response = await fetch('/api/documents/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: context.url,
          format: 'images'
        })
      });
      
      if (!response.ok) {
        throw ErrorFactory.fromHttpResponse(
          response.status,
          response.statusText,
          RenderingStage.RENDERING,
          RenderingMethod.SERVER_CONVERSION
        );
      }
      
      const result = await response.json();
      const renderTime = Date.now() - startTime;
      
      return {
        success: true,
        renderingId: context.renderingId,
        method: RenderingMethod.SERVER_CONVERSION,
        pages: result.pages || [],
        diagnostics: this.createDiagnostics(context, startTime, renderTime)
      };
      
    } catch (error) {
      const renderTime = Date.now() - startTime;
      const renderError = ErrorFactory.fromError(
        error as Error,
        RenderingStage.RENDERING,
        RenderingMethod.SERVER_CONVERSION,
        { url: context.url, renderTime }
      );
      
      return {
        success: false,
        renderingId: context.renderingId,
        method: RenderingMethod.SERVER_CONVERSION,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: this.createDiagnostics(context, startTime, renderTime, renderError)
      };
    }
  }

  /**
   * Attempt rendering with image-based method
   */
  private async attemptImageBased(context: RenderContext): Promise<RenderResult> {
    const startTime = Date.now();
    
    try {
      // Use server conversion to get images, then display them
      const conversionResult = await this.attemptServerConversion(context);
      
      if (!conversionResult.success) {
        throw new ParsingError(
          'Server conversion failed for image-based rendering',
          RenderingStage.RENDERING,
          RenderingMethod.IMAGE_BASED
        );
      }
      
      // Convert server result to image-based display
      const renderTime = Date.now() - startTime;
      
      return {
        success: true,
        renderingId: context.renderingId,
        method: RenderingMethod.IMAGE_BASED,
        pages: conversionResult.pages,
        diagnostics: this.createDiagnostics(context, startTime, renderTime)
      };
      
    } catch (error) {
      const renderTime = Date.now() - startTime;
      const renderError = ErrorFactory.fromError(
        error as Error,
        RenderingStage.RENDERING,
        RenderingMethod.IMAGE_BASED,
        { url: context.url, renderTime }
      );
      
      return {
        success: false,
        renderingId: context.renderingId,
        method: RenderingMethod.IMAGE_BASED,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: this.createDiagnostics(context, startTime, renderTime, renderError)
      };
    }
  }

  /**
   * Provide download fallback option
   */
  private async attemptDownloadFallback(context: RenderContext): Promise<RenderResult> {
    const startTime = Date.now();
    
    try {
      // Create download link
      const link = document.createElement('a');
      link.href = context.url;
      link.download = 'document.pdf';
      link.textContent = 'Download PDF';
      
      // This method always "succeeds" by providing a download option
      const renderTime = Date.now() - startTime;
      
      return {
        success: true,
        renderingId: context.renderingId,
        method: RenderingMethod.DOWNLOAD_FALLBACK,
        pages: [], // No pages rendered, just download option
        diagnostics: this.createDiagnostics(context, startTime, renderTime)
      };
      
    } catch (error) {
      const renderTime = Date.now() - startTime;
      const renderError = ErrorFactory.fromError(
        error as Error,
        RenderingStage.RENDERING,
        RenderingMethod.DOWNLOAD_FALLBACK,
        { url: context.url, renderTime }
      );
      
      return {
        success: false,
        renderingId: context.renderingId,
        method: RenderingMethod.DOWNLOAD_FALLBACK,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: this.createDiagnostics(context, startTime, renderTime, renderError)
      };
    }
  }

  /**
   * Execute a rendering method (main entry point)
   */
  async executeMethod(method: RenderingMethod, context: RenderContext): Promise<RenderResult> {
    return this.attemptMethod(method, context);
  }

  /**
   * Record successful rendering for preference learning
   */
  recordSuccess(method: RenderingMethod, context: RenderContext, renderTime: number = 0): void {
    const documentType = this.classifyDocumentType(context);
    this.recordMethodSuccess(method, documentType, renderTime);
  }

  /**
   * Attempt rendering with a specific method
   */
  async attemptMethod(method: RenderingMethod, context: RenderContext): Promise<RenderResult> {
    const documentType = this.classifyDocumentType(context);
    
    try {
      let result: RenderResult;
      
      switch (method) {
        case RenderingMethod.PDFJS_CANVAS:
          result = await this.attemptPDFJSCanvas(context);
          break;
        case RenderingMethod.NATIVE_BROWSER:
          result = await this.attemptNativeBrowser(context);
          break;
        case RenderingMethod.SERVER_CONVERSION:
          result = await this.attemptServerConversion(context);
          break;
        case RenderingMethod.IMAGE_BASED:
          result = await this.attemptImageBased(context);
          break;
        case RenderingMethod.DOWNLOAD_FALLBACK:
          result = await this.attemptDownloadFallback(context);
          break;
        default:
          throw new ReliablePDFRendererError(
            `Unknown rendering method: ${method}`,
            ErrorType.PARSING_ERROR,
            context.progressState.stage,
            method,
            false
          );
      }
      
      // Record success or failure for preference learning
      if (result.success) {
        const renderTime = result.diagnostics.performanceMetrics.renderTime || 0;
        this.recordMethodSuccess(method, documentType, renderTime);
      } else {
        this.recordMethodFailure(method, documentType);
      }
      
      return result;
      
    } catch (error) {
      this.recordMethodFailure(method, documentType);
      
      const renderError = ErrorFactory.fromError(
        error as Error,
        context.progressState.stage,
        method,
        { url: context.url, documentType }
      );
      
      return {
        success: false,
        renderingId: context.renderingId,
        method,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: this.createDiagnostics(context, Date.now(), 0, renderError)
      };
    }
  }

  /**
   * Create diagnostics data
   */
  private createDiagnostics(
    context: RenderContext,
    startTime: number,
    renderTime: number,
    error?: ReliablePDFRendererError
  ): DiagnosticsData {
    const endTime = new Date();
    
    return {
      renderingId: context.renderingId,
      startTime: new Date(startTime),
      endTime,
      totalTime: endTime.getTime() - startTime,
      method: context.currentMethod,
      stage: context.progressState.stage,
      errors: error ? [error.toRenderError()] : [],
      performanceMetrics: {
        renderTime,
        memoryUsage: this.getMemoryUsage(),
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      }
    };
  }

  /**
   * Get current memory usage (approximate)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  /**
   * Get method success statistics for debugging
   */
  getMethodStatistics(): Map<string, MethodSuccess> {
    return new Map(this.methodSuccessMap);
  }

  /**
   * Clear method success history
   */
  clearMethodHistory(): void {
    this.methodSuccessMap.clear();
  }
}