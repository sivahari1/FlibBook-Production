/**
 * Diagnostic Information Capture System
 * 
 * Captures comprehensive diagnostic information on rendering failures
 * Requirements: 4.4, 4.5
 */

import { logger } from '../logger';
import { 
  RenderingError, 
  RenderingDiagnostics, 
  RenderingErrorType,
  BrowserInfo,
  DocumentInfo,
  PerformanceMetrics,
  NetworkContext
} from '../errors/rendering-errors';
import { getDiagnosticsCollector } from '../errors/rendering-diagnostics';

/**
 * Diagnostic Capture Configuration
 * Requirements: 4.4, 4.5
 */
export interface DiagnosticCaptureConfig {
  captureScreenshots: boolean;
  captureNetworkLogs: boolean;
  captureConsoleErrors: boolean;
  capturePerformanceMetrics: boolean;
  captureBrowserState: boolean;
  captureDocumentState: boolean;
  maxLogEntries: number;
  maxScreenshotSize: number; // in bytes
}

/**
 * Default diagnostic capture configuration
 */
export const DEFAULT_DIAGNOSTIC_CONFIG: DiagnosticCaptureConfig = {
  captureScreenshots: true,
  captureNetworkLogs: true,
  captureConsoleErrors: true,
  capturePerformanceMetrics: true,
  captureBrowserState: true,
  captureDocumentState: true,
  maxLogEntries: 100,
  maxScreenshotSize: 1024 * 1024, // 1MB
};

/**
 * Console Error Entry
 * Requirements: 4.4, 4.5
 */
export interface ConsoleErrorEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
}

/**
 * Network Log Entry
 * Requirements: 4.4, 4.5
 */
export interface NetworkLogEntry {
  timestamp: Date;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  duration?: number;
  error?: string;
}

/**
 * Browser State Snapshot
 * Requirements: 4.4, 4.5
 */
export interface BrowserStateSnapshot {
  timestamp: Date;
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  scrollPosition: { x: number; y: number };
  activeElement?: string;
  visibilityState: string;
  connectionType?: string;
  onlineStatus: boolean;
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  storageQuota?: {
    usage: number;
    quota: number;
  };
}

/**
 * Document State Snapshot
 * Requirements: 4.4, 4.5
 */
export interface DocumentStateSnapshot {
  timestamp: Date;
  documentId: string;
  pdfUrl?: string;
  currentPage?: number;
  totalPages?: number;
  zoomLevel?: number;
  viewMode?: string;
  loadingState?: string;
  errorState?: string;
  canvasElements: number;
  imageElements: number;
  domElementCount: number;
  renderingProgress?: number;
}

/**
 * Comprehensive Diagnostic Report
 * Requirements: 4.4, 4.5
 */
export interface DiagnosticReport {
  reportId: string;
  timestamp: Date;
  documentId: string;
  error: RenderingError;
  diagnostics: RenderingDiagnostics;
  consoleErrors: ConsoleErrorEntry[];
  networkLogs: NetworkLogEntry[];
  browserState: BrowserStateSnapshot;
  documentState: DocumentStateSnapshot;
  screenshot?: string; // base64 encoded
  performanceEntries: PerformanceEntry[];
  additionalContext?: Record<string, any>;
}

/**
 * Diagnostic Capture System
 * Requirements: 4.4, 4.5
 */
export class DiagnosticCapture {
  private config: DiagnosticCaptureConfig;
  private consoleErrors: ConsoleErrorEntry[] = [];
  private networkLogs: NetworkLogEntry[] = [];
  private originalConsoleError?: typeof console.error;
  private originalConsoleWarn?: typeof console.warn;
  private originalFetch?: typeof fetch;
  private isCapturing = false;
  
  constructor(config: Partial<DiagnosticCaptureConfig> = {}) {
    this.config = { ...DEFAULT_DIAGNOSTIC_CONFIG, ...config };
    this.initializeCapture();
  }
  
  /**
   * Initialize diagnostic capture
   * Requirements: 4.4, 4.5
   */
  private initializeCapture(): void {
    if (typeof window === 'undefined') return;
    
    this.isCapturing = true;
    
    try {
      if (this.config.captureConsoleErrors) {
        this.interceptConsole();
      }
      
      if (this.config.captureNetworkLogs) {
        this.interceptNetwork();
      }
    } catch (error) {
      // Ignore initialization errors in test environments
      if (process.env.NODE_ENV !== 'test') {
        throw error;
      }
    }
  }
  
  /**
   * Capture comprehensive diagnostic report
   * Requirements: 4.4, 4.5
   */
  async captureFailureDiagnostics(
    documentId: string,
    error: RenderingError,
    additionalContext?: Record<string, any>
  ): Promise<DiagnosticReport> {
    const reportId = this.generateReportId();
    const timestamp = new Date();
    
    logger.info('Capturing failure diagnostics', {
      reportId,
      documentId,
      errorType: error.type,
      errorMessage: error.message,
    });
    
    try {
      // Capture diagnostics using existing system
      const diagnosticsCollector = getDiagnosticsCollector();
      const diagnostics = await diagnosticsCollector.createDiagnostics(
        documentId,
        error.diagnostics?.pdfUrl || '',
        error.type,
        undefined,
        undefined,
        additionalContext
      );
      
      // Capture browser state
      const browserState = this.captureBrowserState();
      
      // Capture document state
      const documentState = this.captureDocumentState(documentId);
      
      // Capture screenshot if enabled
      let screenshot: string | undefined;
      if (this.config.captureScreenshots) {
        screenshot = await this.captureScreenshot();
      }
      
      // Capture performance entries
      const performanceEntries = this.capturePerformanceEntries();
      
      // Create comprehensive report
      const report: DiagnosticReport = {
        reportId,
        timestamp,
        documentId,
        error,
        diagnostics,
        consoleErrors: [...this.consoleErrors],
        networkLogs: [...this.networkLogs],
        browserState,
        documentState,
        screenshot,
        performanceEntries,
        additionalContext,
      };
      
      // Log the diagnostic report
      this.logDiagnosticReport(report);
      
      // Send to monitoring service if configured
      await this.sendToMonitoringService(report);
      
      return report;
      
    } catch (captureError) {
      logger.error('Failed to capture diagnostics', captureError, {
        reportId,
        documentId,
        originalError: error.message,
      });
      
      // Return minimal report on capture failure
      return {
        reportId,
        timestamp,
        documentId,
        error,
        diagnostics: error.diagnostics || {} as RenderingDiagnostics,
        consoleErrors: [],
        networkLogs: [],
        browserState: {} as BrowserStateSnapshot,
        documentState: {} as DocumentStateSnapshot,
        performanceEntries: [],
        additionalContext: {
          captureError: captureError instanceof Error ? captureError.message : String(captureError),
        },
      };
    }
  }
  
  /**
   * Capture browser state snapshot
   * Requirements: 4.4, 4.5
   */
  private captureBrowserState(): BrowserStateSnapshot {
    if (typeof window === 'undefined') {
      return {} as BrowserStateSnapshot;
    }
    
    const snapshot: BrowserStateSnapshot = {
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY,
      },
      visibilityState: document.visibilityState,
      onlineStatus: navigator.onLine,
    };
    
    // Capture active element
    if (document.activeElement) {
      snapshot.activeElement = this.getElementSelector(document.activeElement);
    }
    
    // Capture connection info
    const connection = (navigator as any).connection;
    if (connection) {
      snapshot.connectionType = connection.effectiveType || connection.type;
    }
    
    // Capture memory info
    const memory = (performance as any).memory;
    if (memory) {
      snapshot.memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    
    // Capture storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        snapshot.storageQuota = {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }).catch(() => {
        // Ignore storage quota errors
      });
    }
    
    return snapshot;
  }
  
  /**
   * Capture document state snapshot
   * Requirements: 4.4, 4.5
   */
  private captureDocumentState(documentId: string): DocumentStateSnapshot {
    if (typeof document === 'undefined') {
      return {} as DocumentStateSnapshot;
    }
    
    const snapshot: DocumentStateSnapshot = {
      timestamp: new Date(),
      documentId,
      canvasElements: document.querySelectorAll('canvas').length,
      imageElements: document.querySelectorAll('img').length,
      domElementCount: document.querySelectorAll('*').length,
    };
    
    // Try to capture PDF viewer specific state
    try {
      // Look for PDF viewer elements
      const pdfViewer = document.querySelector('[data-pdf-viewer]') as any;
      if (pdfViewer) {
        snapshot.currentPage = pdfViewer.currentPageNumber;
        snapshot.totalPages = pdfViewer.pagesCount;
        snapshot.zoomLevel = pdfViewer.currentScale;
        snapshot.viewMode = pdfViewer.spreadMode;
      }
      
      // Look for loading indicators
      const loadingElement = document.querySelector('[data-loading]');
      if (loadingElement) {
        snapshot.loadingState = loadingElement.textContent || 'loading';
      }
      
      // Look for error displays
      const errorElement = document.querySelector('[data-error]');
      if (errorElement) {
        snapshot.errorState = errorElement.textContent || 'error';
      }
      
      // Estimate rendering progress
      const renderedPages = document.querySelectorAll('[data-page-rendered="true"]').length;
      const totalPageElements = document.querySelectorAll('[data-page-number]').length;
      if (totalPageElements > 0) {
        snapshot.renderingProgress = (renderedPages / totalPageElements) * 100;
      }
      
    } catch (error) {
      // Ignore errors in state capture
      logger.debug('Error capturing document state', error);
    }
    
    return snapshot;
  }
  
  /**
   * Capture screenshot
   * Requirements: 4.4, 4.5
   */
  private async captureScreenshot(): Promise<string | undefined> {
    if (typeof window === 'undefined' || !window.html2canvas) {
      return undefined;
    }
    
    try {
      const canvas = await (window as any).html2canvas(document.body, {
        width: Math.min(window.innerWidth, 1920),
        height: Math.min(window.innerHeight, 1080),
        scale: 0.5, // Reduce size
        useCORS: true,
        allowTaint: false,
      });
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // Check size limit
      if (dataUrl.length > this.config.maxScreenshotSize) {
        logger.warn('Screenshot too large, skipping', {
          size: dataUrl.length,
          maxSize: this.config.maxScreenshotSize,
        });
        return undefined;
      }
      
      return dataUrl;
      
    } catch (error) {
      logger.warn('Failed to capture screenshot', error);
      return undefined;
    }
  }
  
  /**
   * Capture performance entries
   * Requirements: 4.4, 4.5
   */
  private capturePerformanceEntries(): PerformanceEntry[] {
    if (typeof performance === 'undefined') {
      return [];
    }
    
    try {
      const entries = performance.getEntries();
      
      // Filter relevant entries
      return entries.filter(entry => {
        return entry.name.includes('pdf') ||
               entry.name.includes('render') ||
               entry.name.includes('load') ||
               entry.entryType === 'navigation' ||
               entry.entryType === 'resource';
      }).slice(-50); // Limit to last 50 entries
      
    } catch (error) {
      logger.warn('Failed to capture performance entries', error);
      return [];
    }
  }
  
  /**
   * Intercept console methods
   * Requirements: 4.4, 4.5
   */
  private interceptConsole(): void {
    if (typeof console === 'undefined') return;
    
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    
    console.error = (...args: any[]) => {
      this.captureConsoleError('error', args);
      this.originalConsoleError?.apply(console, args);
    };
    
    console.warn = (...args: any[]) => {
      this.captureConsoleError('warn', args);
      this.originalConsoleWarn?.apply(console, args);
    };
    
    // Listen for unhandled errors
    if (window.addEventListener) {
      window.addEventListener('error', (event) => {
        this.captureConsoleError('error', [event.message], {
          source: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack,
        });
      });
      
      // Listen for unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureConsoleError('error', [event.reason], {
          source: 'unhandled-promise-rejection',
        });
      });
    }
  }
  
  /**
   * Intercept network requests
   * Requirements: 4.4, 4.5
   */
  private interceptNetwork(): void {
    if (typeof window === 'undefined' || !window.fetch) return;
    
    this.originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      const logEntry: NetworkLogEntry = {
        timestamp: new Date(),
        url,
        method,
      };
      
      try {
        // Capture request headers
        if (init?.headers) {
          logEntry.requestHeaders = this.headersToObject(init.headers);
        }
        
        // Capture request body (if small)
        if (init?.body && typeof init.body === 'string' && init.body.length < 1000) {
          logEntry.requestBody = init.body;
        }
        
        const response = await this.originalFetch!(input, init);
        
        logEntry.status = response.status;
        logEntry.statusText = response.statusText;
        logEntry.duration = Date.now() - startTime;
        
        // Capture response headers
        logEntry.responseHeaders = this.headersToObject(response.headers);
        
        this.addNetworkLog(logEntry);
        
        return response;
        
      } catch (error) {
        logEntry.error = error instanceof Error ? error.message : String(error);
        logEntry.duration = Date.now() - startTime;
        
        this.addNetworkLog(logEntry);
        
        throw error;
      }
    };
  }
  
  /**
   * Capture console error
   * Requirements: 4.4, 4.5
   */
  private captureConsoleError(
    level: 'error' | 'warn' | 'info' | 'debug',
    args: any[],
    metadata?: { source?: string; line?: number; column?: number; stack?: string }
  ): void {
    const entry: ConsoleErrorEntry = {
      timestamp: new Date(),
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      ...metadata,
    };
    
    this.consoleErrors.push(entry);
    
    // Limit array size
    if (this.consoleErrors.length > this.config.maxLogEntries) {
      this.consoleErrors = this.consoleErrors.slice(-this.config.maxLogEntries / 2);
    }
  }
  
  /**
   * Add network log entry
   * Requirements: 4.4, 4.5
   */
  private addNetworkLog(entry: NetworkLogEntry): void {
    this.networkLogs.push(entry);
    
    // Limit array size
    if (this.networkLogs.length > this.config.maxLogEntries) {
      this.networkLogs = this.networkLogs.slice(-this.config.maxLogEntries / 2);
    }
  }
  
  /**
   * Convert headers to object
   * Requirements: 4.4, 4.5
   */
  private headersToObject(headers: Headers | Record<string, string> | string[][]): Record<string, string> {
    const result: Record<string, string> = {};
    
    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        result[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
    } else if (typeof headers === 'object') {
      Object.assign(result, headers);
    }
    
    return result;
  }
  
  /**
   * Get element selector
   * Requirements: 4.4, 4.5
   */
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      return `.${element.className.split(' ').join('.')}`;
    }
    
    return element.tagName.toLowerCase();
  }
  
  /**
   * Generate unique report ID
   * Requirements: 4.4, 4.5
   */
  private generateReportId(): string {
    return `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Log diagnostic report
   * Requirements: 4.4, 4.5
   */
  private logDiagnosticReport(report: DiagnosticReport): void {
    logger.error('Diagnostic report generated', {
      reportId: report.reportId,
      documentId: report.documentId,
      errorType: report.error.type,
      errorMessage: report.error.message,
      consoleErrorCount: report.consoleErrors.length,
      networkLogCount: report.networkLogs.length,
      hasScreenshot: !!report.screenshot,
      performanceEntryCount: report.performanceEntries.length,
      browserInfo: {
        userAgent: report.browserState.userAgent,
        viewport: report.browserState.viewport,
        onlineStatus: report.browserState.onlineStatus,
        memoryUsage: report.browserState.memoryInfo?.usedJSHeapSize,
      },
      documentState: {
        currentPage: report.documentState.currentPage,
        totalPages: report.documentState.totalPages,
        renderingProgress: report.documentState.renderingProgress,
        canvasElements: report.documentState.canvasElements,
      },
    });
  }
  
  /**
   * Send diagnostic report to monitoring service
   * Requirements: 4.4, 4.5
   */
  private async sendToMonitoringService(report: DiagnosticReport): Promise<void> {
    try {
      // In production, send to monitoring service
      // Examples: Sentry, LogRocket, DataDog, custom endpoint
      
      if (process.env.NODE_ENV === 'production' && process.env.MONITORING_ENDPOINT) {
        const response = await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
          },
          body: JSON.stringify({
            type: 'diagnostic_report',
            report,
            timestamp: new Date().toISOString(),
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Monitoring service responded with ${response.status}`);
        }
        
        logger.info('Diagnostic report sent to monitoring service', {
          reportId: report.reportId,
          endpoint: process.env.MONITORING_ENDPOINT,
        });
      }
      
    } catch (error) {
      logger.warn('Failed to send diagnostic report to monitoring service', error, {
        reportId: report.reportId,
      });
    }
  }
  
  /**
   * Cleanup and restore original methods
   * Requirements: 4.4, 4.5
   */
  destroy(): void {
    this.isCapturing = false;
    
    // Restore console methods
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
    if (this.originalConsoleWarn) {
      console.warn = this.originalConsoleWarn;
    }
    
    // Restore fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    
    // Clear captured data
    this.consoleErrors = [];
    this.networkLogs = [];
  }
}

/**
 * Global diagnostic capture instance
 */
let globalDiagnosticCapture: DiagnosticCapture | null = null;

/**
 * Get global diagnostic capture instance
 * Requirements: 4.4, 4.5
 */
export function getDiagnosticCapture(): DiagnosticCapture {
  if (!globalDiagnosticCapture) {
    globalDiagnosticCapture = new DiagnosticCapture();
  }
  return globalDiagnosticCapture;
}

/**
 * Capture failure diagnostics (convenience function)
 * Requirements: 4.4, 4.5
 */
export async function captureFailureDiagnostics(
  documentId: string,
  error: RenderingError,
  additionalContext?: Record<string, any>
): Promise<DiagnosticReport> {
  const capture = getDiagnosticCapture();
  return capture.captureFailureDiagnostics(documentId, error, additionalContext);
}