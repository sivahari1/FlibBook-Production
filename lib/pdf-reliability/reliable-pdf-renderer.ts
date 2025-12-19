/**
 * Reliable PDF Renderer
 * 
 * Main orchestrator for reliable PDF rendering with comprehensive error recovery,
 * multiple fallback methods, and detailed diagnostics.
 * 
 * Requirements: 1.1, 1.2, 8.1
 */

import { nanoid } from 'nanoid';
import type {
  RenderOptions,
  RenderResult,
  RenderContext,
  ProgressState,
  ReliabilityConfig,
  RenderingMethod,
  RenderingStage,
  RenderedPage,
} from './types';
import { RenderingMethod as Method, RenderingStage as Stage } from './types';
import { createReliabilityConfig } from './config';
import { DiagnosticsCollector } from './diagnostics';
import { ErrorFactory, ReliablePDFRendererError } from './errors';
import { ProgressTracker } from './progress-tracker';
import { DocumentTypeHandler, type DocumentCharacteristics } from './document-type-handler';

/**
 * Reliable PDF Renderer Class
 * 
 * Orchestrates the entire PDF rendering pipeline with reliability features
 */
export class ReliablePDFRenderer {
  private config: ReliabilityConfig;
  private diagnosticsCollector: DiagnosticsCollector;
  private progressTracker: ProgressTracker;
  private documentTypeHandler: DocumentTypeHandler;
  private activeRenders: Map<string, RenderContext> = new Map();

  constructor(config?: Partial<ReliabilityConfig>) {
    this.config = createReliabilityConfig(config);
    this.diagnosticsCollector = new DiagnosticsCollector(this.config);
    this.progressTracker = new ProgressTracker(this.config);
    this.documentTypeHandler = new DocumentTypeHandler(this.config);
  }

  /**
   * Render PDF with reliability features
   * 
   * Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async renderPDF(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    const renderingId = nanoid();
    const startTime = new Date();
    
    // Initialize progress tracking immediately (Requirements: 5.1)
    const initialProgress = this.progressTracker.initializeProgress(renderingId, Stage.INITIALIZING);

    // Initialize context early so it's available in error handling
    let context: RenderContext = {
      renderingId,
      url,
      options: {
        timeout: this.config.defaultTimeout,
        preferredMethod: Method.PDFJS_CANVAS,
        fallbackEnabled: this.config.enableFallbacks,
        diagnosticsEnabled: this.config.enableDiagnostics,
        ...options,
      },
      startTime,
      currentMethod: options.preferredMethod || Method.PDFJS_CANVAS,
      attemptCount: 0,
      progressState: initialProgress,
      errorHistory: [],
    };

    // Start diagnostics early so they're available for error logging
    this.diagnosticsCollector.startDiagnostics(
      renderingId,
      context.currentMethod,
      Stage.INITIALIZING
    );

    try {
      // Analyze document type for optimized handling (Requirements: 3.1-3.5)
      this.updateProgressStage(renderingId, Stage.INITIALIZING, 5);
      const documentCharacteristics = await this.documentTypeHandler.analyzeDocument(url);
      
      // Handle special document types
      if (documentCharacteristics.isPasswordProtected && !options.pdfPassword) {
        throw ErrorFactory.createPasswordRequiredError(
          Stage.INITIALIZING,
          Method.PDFJS_CANVAS,
          { url, documentType: documentCharacteristics.type }
        );
      }
      
      if (documentCharacteristics.isCorrupted) {
        throw ErrorFactory.createCorruptionError(
          Stage.INITIALIZING,
          Method.PDFJS_CANVAS,
          { url, documentType: documentCharacteristics.type }
        );
      }

      // Get optimized options based on document type
      const optimizedOptions = this.documentTypeHandler.getOptimizedOptions(
        documentCharacteristics,
        options
      );

      // Update context with optimized settings
      context = {
        ...context,
        options: {
          ...context.options,
          ...optimizedOptions,
        },
        currentMethod: optimizedOptions.preferredMethod || context.currentMethod,
        documentCharacteristics, // Store for later use
      };

      // Store active render
      this.activeRenders.set(renderingId, context);

      // Update stage to fetching
      this.updateProgress(context, { stage: Stage.FETCHING, percentage: 10 });

      // Attempt rendering with current method
      const result = await this.attemptRendering(context);

      // Mark progress as complete
      this.progressTracker.completeProgress(renderingId);

      // Complete diagnostics
      const diagnostics = this.diagnosticsCollector.completeDiagnostics(renderingId);

      return {
        success: true,
        renderingId,
        method: context.currentMethod,
        pages: result.pages,
        diagnostics: diagnostics || this.createEmptyDiagnostics(renderingId, context.currentMethod),
      };

    } catch (error) {
      // Handle rendering failure
      const renderError = this.handleRenderingError(error, context);
      
      // Mark progress as failed
      this.progressTracker.failProgress(renderingId, renderError.message);
      
      // Complete diagnostics with error
      this.diagnosticsCollector.addError(renderingId, renderError.toRenderError());
      const diagnostics = this.diagnosticsCollector.completeDiagnostics(renderingId);

      return {
        success: false,
        renderingId,
        method: context.currentMethod,
        pages: [],
        error: renderError.toRenderError(),
        diagnostics: diagnostics || this.createEmptyDiagnostics(renderingId, context.currentMethod),
      };

    } finally {
      // Clean up active render and progress tracking
      this.activeRenders.delete(renderingId);
      this.progressTracker.cleanup(renderingId);
    }
  }

  /**
   * Retry rendering with fresh context
   * 
   * Requirements: 1.5
   */
  async retryRendering(context: RenderContext): Promise<RenderResult> {
    // Create fresh context to avoid state pollution
    const freshContext: RenderContext = {
      ...context,
      renderingId: nanoid(), // New rendering ID
      startTime: new Date(),
      attemptCount: 0,
      canvas: undefined, // Clear canvas reference
      pdfDocument: undefined, // Clear document reference
      progressState: {
        percentage: 0,
        stage: Stage.INITIALIZING,
        bytesLoaded: 0,
        totalBytes: 0,
        timeElapsed: 0,
        isStuck: false,
        lastUpdate: new Date(),
      },
      errorHistory: [], // Clear error history for fresh start
    };

    return this.renderPDF(freshContext.url, freshContext.options);
  }

  /**
   * Cancel rendering operation
   */
  cancelRendering(renderingId: string): void {
    const context = this.activeRenders.get(renderingId);
    if (context) {
      // Clean up resources
      if (context.canvas) {
        this.cleanupCanvas(context.canvas);
      }
      
      if (context.pdfDocument) {
        try {
          context.pdfDocument.destroy();
        } catch (error) {
          console.warn('Error destroying PDF document:', error);
        }
      }

      // Remove from active renders
      this.activeRenders.delete(renderingId);

      // Complete diagnostics
      this.diagnosticsCollector.completeDiagnostics(renderingId);
    }
  }

  /**
   * Get progress for active rendering
   */
  getProgress(renderingId: string): ProgressState | null {
    return this.progressTracker.getProgress(renderingId);
  }

  /**
   * Add progress update callback
   */
  onProgressUpdate(renderingId: string, callback: (progress: ProgressState) => void): void {
    this.progressTracker.onProgressUpdate(renderingId, callback);
  }

  /**
   * Force retry for stuck rendering
   */
  forceRetry(renderingId: string): void {
    this.progressTracker.forceRetry(renderingId);
  }

  /**
   * Remove progress callbacks for a specific rendering
   * 
   * Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
   */
  removeCallbacks(renderingId: string): void {
    this.progressTracker.removeCallbacks(renderingId);
  }

  /**
   * Clean up resources for a specific rendering
   * 
   * Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
   */
  cleanup(renderingId: string): void {
    // Cancel rendering if still active
    this.cancelRendering(renderingId);
    
    // Clean up progress tracker
    this.progressTracker.cleanup(renderingId);
    
    // Clean up diagnostics
    this.diagnosticsCollector.cleanup(renderingId);
    
    // Remove from active renders
    this.activeRenders.delete(renderingId);
  }

  /**
   * Clean up all active renders and resources
   * 
   * Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
   */
  cleanupAll(): void {
    // Get all active rendering IDs
    const activeRenderingIds = Array.from(this.activeRenders.keys());
    
    // Clean up each active render
    activeRenderingIds.forEach(renderingId => {
      this.cleanup(renderingId);
    });
    
    // Clear the active renders map
    this.activeRenders.clear();
  }

  /**
   * Attempt rendering with current method
   */
  private async attemptRendering(context: RenderContext): Promise<{ pages: RenderedPage[] }> {
    context.attemptCount++;

    // Update progress
    this.updateProgress(context, { percentage: 20 });

    // For now, we'll implement a basic structure that will be expanded
    // when the rendering method chain is implemented
    // Fail immediately for testing purposes
    throw new ReliablePDFRendererError(
      'Rendering method chain not yet implemented',
      'PARSING_ERROR' as any,
      Stage.RENDERING,
      context.currentMethod,
      true,
      { message: 'This will be implemented in task 2' }
    );
  }

  /**
   * Handle rendering errors
   */
  private handleRenderingError(
    error: unknown,
    context: RenderContext
  ): ReliablePDFRendererError {
    let renderError: ReliablePDFRendererError;

    if (error instanceof ReliablePDFRendererError) {
      renderError = error;
    } else if (error instanceof Error) {
      renderError = ErrorFactory.fromError(
        error,
        context.progressState.stage,
        context.currentMethod,
        { attemptCount: context.attemptCount }
      );
    } else {
      renderError = new ReliablePDFRendererError(
        'Unknown error occurred during rendering',
        'PARSING_ERROR' as any,
        context.progressState.stage,
        context.currentMethod,
        true,
        { error: String(error), attemptCount: context.attemptCount }
      );
    }

    // Add to error history
    if (!context.errorHistory) {
      context.errorHistory = [];
    }
    context.errorHistory.push(renderError.toRenderError());

    // Update diagnostics
    this.diagnosticsCollector.addError(context.renderingId, renderError.toRenderError());

    return renderError;
  }

  /**
   * Update progress state
   */
  private updateProgress(
    context: RenderContext,
    updates: Partial<ProgressState>
  ): void {
    // Update progress through tracker
    const updatedProgress = this.progressTracker.updateProgress(context.renderingId, updates);
    
    if (updatedProgress) {
      context.progressState = updatedProgress;
    }

    // Update diagnostics stage if changed
    if (updates.stage) {
      this.diagnosticsCollector.updateStage(context.renderingId, updates.stage);
    }
  }

  /**
   * Clean up canvas resources
   */
  private cleanupCanvas(canvas: HTMLCanvasElement): void {
    try {
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    } catch (error) {
      console.warn('Error cleaning up canvas:', error);
    }
  }

  /**
   * Update progress stage with percentage
   */
  private updateProgressStage(
    renderingId: string,
    stage: RenderingStage,
    percentage: number
  ): void {
    this.progressTracker.updateProgress(renderingId, { stage, percentage });
  }

  /**
   * Create empty diagnostics data
   */
  private createEmptyDiagnostics(renderingId: string, method: RenderingMethod) {
    return {
      renderingId,
      startTime: new Date(),
      endTime: new Date(),
      totalTime: 0,
      method,
      stage: Stage.ERROR,
      errors: [],
      performanceMetrics: {},
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      },
    };
  }
}