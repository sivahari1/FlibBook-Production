/**
 * PDF Rendering Reliability Types
 * 
 * Core type definitions for the reliable PDF rendering system
 * 
 * Requirements: 1.1, 1.2, 8.1
 */

import type { PDFDocument, PDFPage, PDFViewport } from '../types/pdfjs';

/**
 * Rendering Method Enumeration
 */
export enum RenderingMethod {
  PDFJS_CANVAS = 'pdfjs-canvas',
  NATIVE_BROWSER = 'native-browser',
  SERVER_CONVERSION = 'server-conversion',
  IMAGE_BASED = 'image-based',
  DOWNLOAD_FALLBACK = 'download-fallback'
}

/**
 * Rendering Stage Enumeration
 */
export enum RenderingStage {
  INITIALIZING = 'initializing',
  FETCHING = 'fetching',
  PARSING = 'parsing',
  RENDERING = 'rendering',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Error Type Enumeration
 */
export enum ErrorType {
  NETWORK_ERROR = 'network-error',
  PARSING_ERROR = 'parsing-error',
  CANVAS_ERROR = 'canvas-error',
  MEMORY_ERROR = 'memory-error',
  TIMEOUT_ERROR = 'timeout-error',
  AUTHENTICATION_ERROR = 'auth-error',
  CORRUPTION_ERROR = 'corruption-error'
}

/**
 * Watermark Configuration
 */
export interface WatermarkConfig {
  text?: string;
  opacity?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize?: number;
  color?: string;
}

/**
 * Render Options Interface
 */
export interface RenderOptions {
  watermark?: WatermarkConfig;
  timeout?: number;
  preferredMethod?: RenderingMethod;
  fallbackEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  pdfPassword?: string;
  typeSpecific?: {
    documentType?: string;
    enableStreaming?: boolean;
    memoryManagement?: 'aggressive' | 'standard' | 'conservative';
    maxConcurrentPages?: number;
  };
}

/**
 * Progress State Interface
 */
export interface ProgressState {
  percentage: number;
  stage: RenderingStage;
  bytesLoaded: number;
  totalBytes: number;
  timeElapsed: number;
  isStuck: boolean;
  lastUpdate: Date;
}

/**
 * Rendered Page Interface
 */
export interface RenderedPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  viewport: PDFViewport;
  renderTime: number;
}

/**
 * Render Error Interface
 */
export interface RenderError {
  type: ErrorType;
  message: string;
  stage: RenderingStage;
  method: RenderingMethod;
  timestamp: Date;
  stackTrace?: string;
  context: Record<string, any>;
  recoverable: boolean;
}

/**
 * Diagnostics Data Interface
 */
export interface DiagnosticsData {
  renderingId: string;
  startTime: Date;
  endTime?: Date;
  totalTime?: number;
  method: RenderingMethod;
  stage: RenderingStage;
  errors: RenderError[];
  performanceMetrics: {
    memoryUsage?: number;
    networkTime?: number;
    parseTime?: number;
    renderTime?: number;
  };
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
  };
}

/**
 * Render Context Interface
 */
export interface RenderContext {
  renderingId: string;
  url: string;
  options: RenderOptions;
  startTime: Date;
  currentMethod: RenderingMethod;
  attemptCount: number;
  canvas?: HTMLCanvasElement;
  pdfDocument?: PDFDocument;
  progressState: ProgressState;
  errorHistory: RenderError[];
  documentCharacteristics?: any; // Import from document-type-handler when available
}

/**
 * Render Result Interface
 */
export interface RenderResult {
  success: boolean;
  renderingId: string;
  method: RenderingMethod;
  pages: RenderedPage[];
  error?: RenderError;
  diagnostics: DiagnosticsData;
}

/**
 * Feature Flags Interface
 */
export interface FeatureFlags {
  /** Enable PDF.js canvas rendering */
  enablePDFJSCanvas: boolean;
  
  /** Enable native browser rendering */
  enableNativeBrowser: boolean;
  
  /** Enable server-side conversion */
  enableServerConversion: boolean;
  
  /** Enable image-based rendering */
  enableImageBased: boolean;
  
  /** Enable download fallback */
  enableDownloadFallback: boolean;
  
  /** Enable automatic method selection */
  enableAutoMethodSelection: boolean;
  
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  
  /** Enable error reporting */
  enableErrorReporting: boolean;
  
  /** Enable user feedback collection */
  enableUserFeedback: boolean;
  
  /** Enable caching of successful methods */
  enableMethodCaching: boolean;
}

/**
 * Timeout Configuration Interface
 */
export interface TimeoutConfig {
  /** Default timeout in milliseconds */
  default: number;
  
  /** Network request timeout */
  network: number;
  
  /** PDF parsing timeout */
  parsing: number;
  
  /** Canvas rendering timeout */
  rendering: number;
  
  /** Method fallback timeout */
  fallback: number;
  
  /** Progressive timeout increases */
  progressive: {
    enabled: boolean;
    multiplier: number;
    maxTimeout: number;
  };
}

/**
 * Retry Configuration Interface
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  
  /** Base delay between retries (ms) */
  baseDelay: number;
  
  /** Exponential backoff configuration */
  exponentialBackoff: {
    enabled: boolean;
    multiplier: number;
    maxDelay: number;
  };
  
  /** Retry conditions */
  retryOn: {
    networkErrors: boolean;
    timeoutErrors: boolean;
    canvasErrors: boolean;
    memoryErrors: boolean;
    parsingErrors: boolean;
  };
}

/**
 * Diagnostic Level Enumeration
 */
export enum DiagnosticLevel {
  NONE = 'none',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

/**
 * Diagnostics Configuration Interface
 */
export interface DiagnosticsConfig {
  /** Diagnostic collection level */
  level: DiagnosticLevel;
  
  /** Enable performance metrics collection */
  collectPerformanceMetrics: boolean;
  
  /** Enable error stack traces */
  collectStackTraces: boolean;
  
  /** Enable browser information collection */
  collectBrowserInfo: boolean;
  
  /** Enable user interaction tracking */
  collectUserInteractions: boolean;
  
  /** Maximum diagnostic entries to keep */
  maxEntries: number;
  
  /** Automatic diagnostic export */
  autoExport: {
    enabled: boolean;
    threshold: number; // Number of errors before auto-export
    endpoint?: string;
  };
}

/**
 * Performance Tuning Parameters Interface
 */
export interface PerformanceTuning {
  /** Memory management settings */
  memory: {
    /** Memory pressure threshold (bytes) */
    pressureThreshold: number;
    
    /** Garbage collection trigger threshold */
    gcThreshold: number;
    
    /** Canvas cleanup strategy */
    canvasCleanup: 'aggressive' | 'standard' | 'conservative';
    
    /** Maximum concurrent pages */
    maxConcurrentPages: number;
  };
  
  /** Progress tracking settings */
  progress: {
    /** Update interval (ms) */
    updateInterval: number;
    
    /** Stuck detection threshold (ms) */
    stuckThreshold: number;
    
    /** Progress calculation method */
    calculationMethod: 'linear' | 'weighted' | 'adaptive';
  };
  
  /** Rendering optimization settings */
  rendering: {
    /** Canvas size optimization */
    canvasOptimization: boolean;
    
    /** Viewport caching */
    viewportCaching: boolean;
    
    /** Lazy loading threshold */
    lazyLoadingThreshold: number;
    
    /** Render quality vs speed preference */
    qualityPreference: 'speed' | 'balanced' | 'quality';
  };
  
  /** Network optimization settings */
  network: {
    /** Connection pooling */
    connectionPooling: boolean;
    
    /** Request batching */
    requestBatching: boolean;
    
    /** Prefetch strategy */
    prefetchStrategy: 'none' | 'next-page' | 'all-pages';
    
    /** Compression preference */
    compressionPreference: 'none' | 'gzip' | 'brotli';
  };
}

/**
 * Reliability Configuration Interface
 */
export interface ReliabilityConfig {
  /** Feature flags for enabling/disabling functionality */
  features: FeatureFlags;
  
  /** Timeout configuration */
  timeouts: TimeoutConfig;
  
  /** Retry configuration */
  retries: RetryConfig;
  
  /** Diagnostics configuration */
  diagnostics: DiagnosticsConfig;
  
  /** Performance tuning parameters */
  performance: PerformanceTuning;
  
  /** Legacy compatibility (deprecated, use specific configs above) */
  /** @deprecated Use timeouts.default instead */
  defaultTimeout?: number;
  
  /** @deprecated Use retries.maxAttempts instead */
  maxRetries?: number;
  
  /** @deprecated Use features.enablePDFJSCanvas && features.enableNativeBrowser etc. instead */
  enableFallbacks?: boolean;
  
  /** @deprecated Use diagnostics.level !== 'none' instead */
  enableDiagnostics?: boolean;
  
  /** @deprecated Use performance.memory.pressureThreshold instead */
  memoryPressureThreshold?: number;
  
  /** @deprecated Use performance.progress.updateInterval instead */
  progressUpdateInterval?: number;
  
  /** @deprecated Use performance.progress.stuckThreshold instead */
  stuckDetectionThreshold?: number;
}