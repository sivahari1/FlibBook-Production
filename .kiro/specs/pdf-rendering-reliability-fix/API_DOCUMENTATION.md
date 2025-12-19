# PDF Rendering Reliability Fix - API Documentation

## Overview

The PDF Rendering Reliability Fix provides a comprehensive solution for reliable PDF rendering with automatic error recovery, multiple fallback methods, and detailed diagnostics. This API documentation covers all public interfaces and components.

## Table of Contents

- [Core Classes](#core-classes)
- [Interfaces](#interfaces)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Progress Tracking](#progress-tracking)
- [Diagnostics](#diagnostics)
- [UI Components](#ui-components)
- [Examples](#examples)

## Core Classes

### ReliablePDFRenderer

The main orchestrator for reliable PDF rendering.

```typescript
import { ReliablePDFRenderer } from '@/lib/pdf-reliability';

const renderer = new ReliablePDFRenderer(config);
```

#### Constructor

```typescript
constructor(config?: Partial<ReliabilityConfig>)
```

**Parameters:**
- `config` (optional): Partial configuration object to override defaults

#### Methods

##### renderPDF()

Renders a PDF with reliability features and automatic fallbacks.

```typescript
async renderPDF(url: string, options?: RenderOptions): Promise<RenderResult>
```

**Parameters:**
- `url`: PDF document URL (signed URL recommended)
- `options`: Rendering options and preferences

**Returns:** Promise resolving to `RenderResult`

**Example:**
```typescript
const result = await renderer.renderPDF('https://example.com/document.pdf', {
  watermark: {
    text: 'CONFIDENTIAL',
    opacity: 0.3,
    position: 'center'
  },
  timeout: 30000,
  preferredMethod: RenderingMethod.PDFJS_CANVAS,
  fallbackEnabled: true,
  diagnosticsEnabled: true
});

if (result.success) {
  console.log(`Rendered ${result.pages.length} pages using ${result.method}`);
} else {
  console.error('Rendering failed:', result.error);
}
```

##### retryRendering()

Retries rendering with a fresh context to avoid state pollution.

```typescript
async retryRendering(context: RenderContext): Promise<RenderResult>
```

**Parameters:**
- `context`: Previous render context

**Returns:** Promise resolving to `RenderResult`

##### cancelRendering()

Cancels an active rendering operation and cleans up resources.

```typescript
cancelRendering(renderingId: string): void
```

**Parameters:**
- `renderingId`: Unique identifier for the rendering operation

##### getProgress()

Gets current progress for an active rendering operation.

```typescript
getProgress(renderingId: string): ProgressState | null
```

**Parameters:**
- `renderingId`: Unique identifier for the rendering operation

**Returns:** Current progress state or null if not found

##### onProgressUpdate()

Registers a callback for progress updates.

```typescript
onProgressUpdate(renderingId: string, callback: (progress: ProgressState) => void): void
```

**Parameters:**
- `renderingId`: Unique identifier for the rendering operation
- `callback`: Function to call on progress updates

##### forceRetry()

Forces a retry for a stuck rendering operation.

```typescript
forceRetry(renderingId: string): void
```

**Parameters:**
- `renderingId`: Unique identifier for the rendering operation

### RenderingMethodChain

Manages multiple rendering methods with automatic fallback progression.

```typescript
import { RenderingMethodChain } from '@/lib/pdf-reliability';

const methodChain = new RenderingMethodChain(config);
```

#### Methods

##### attemptMethod()

Attempts rendering with a specific method.

```typescript
async attemptMethod(method: RenderingMethod, context: RenderContext): Promise<RenderResult>
```

##### getNextMethod()

Gets the next method in the fallback chain.

```typescript
getNextMethod(failedMethod: RenderingMethod): RenderingMethod | null
```

##### recordMethodSuccess()

Records a successful method for future preference learning.

```typescript
recordMethodSuccess(method: RenderingMethod, documentType: string): void
```

##### getPreferredMethod()

Gets the preferred method for a document type based on success history.

```typescript
getPreferredMethod(documentType: string): RenderingMethod
```

### CanvasManager

Handles canvas lifecycle and memory management.

```typescript
import { CanvasManager } from '@/lib/pdf-reliability';

const canvasManager = new CanvasManager(config);
```

#### Methods

##### createCanvas()

Creates a new canvas element with validation.

```typescript
createCanvas(width: number, height: number): HTMLCanvasElement
```

##### getContext()

Gets a validated 2D rendering context.

```typescript
getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null
```

##### clearCanvas()

Clears canvas content.

```typescript
clearCanvas(canvas: HTMLCanvasElement): void
```

##### destroyCanvas()

Destroys canvas and frees memory.

```typescript
destroyCanvas(canvas: HTMLCanvasElement): void
```

##### checkMemoryPressure()

Checks if system is under memory pressure.

```typescript
checkMemoryPressure(): boolean
```

##### cleanupUnusedCanvases()

Cleans up unused canvas elements to free memory.

```typescript
cleanupUnusedCanvases(): void
```

### ProgressTracker

Tracks rendering progress and detects stuck states.

```typescript
import { ProgressTracker } from '@/lib/pdf-reliability';

const progressTracker = new ProgressTracker(config);
```

#### Methods

##### initializeProgress()

Initializes progress tracking for a rendering operation.

```typescript
initializeProgress(renderingId: string, stage: RenderingStage): ProgressState
```

##### updateProgress()

Updates progress state.

```typescript
updateProgress(renderingId: string, updates: Partial<ProgressState>): ProgressState | null
```

##### completeProgress()

Marks progress as complete.

```typescript
completeProgress(renderingId: string): void
```

##### failProgress()

Marks progress as failed.

```typescript
failProgress(renderingId: string, error: string): void
```

### ErrorRecoverySystem

Handles error detection and automatic recovery.

```typescript
import { ErrorRecoverySystem } from '@/lib/pdf-reliability';

const errorRecovery = new ErrorRecoverySystem(config);
```

#### Methods

##### detectError()

Detects and categorizes errors.

```typescript
detectError(error: unknown, context: RenderContext): RenderError
```

##### attemptRecovery()

Attempts automatic error recovery.

```typescript
async attemptRecovery(error: RenderError, context: RenderContext): Promise<boolean>
```

##### shouldRetry()

Determines if an error is recoverable and should be retried.

```typescript
shouldRetry(error: RenderError, attemptCount: number): boolean
```

### NetworkResilienceLayer

Handles network issues and URL management.

```typescript
import { NetworkResilienceLayer } from '@/lib/pdf-reliability';

const networkLayer = new NetworkResilienceLayer(config);
```

#### Methods

##### fetchWithResilience()

Fetches data with automatic retry and timeout handling.

```typescript
async fetchWithResilience(url: string, options?: RequestInit): Promise<Response>
```

##### refreshSignedURL()

Refreshes expired signed URLs.

```typescript
async refreshSignedURL(originalUrl: string): Promise<string>
```

##### handlePartialData()

Handles partial data scenarios.

```typescript
async handlePartialData(data: ArrayBuffer, totalSize: number): Promise<ArrayBuffer>
```

### DiagnosticsCollector

Collects performance metrics and diagnostic information.

```typescript
import { DiagnosticsCollector } from '@/lib/pdf-reliability';

const diagnostics = new DiagnosticsCollector(config);
```

#### Methods

##### startDiagnostics()

Starts diagnostic collection for a rendering operation.

```typescript
startDiagnostics(renderingId: string, method: RenderingMethod, stage: RenderingStage): void
```

##### addError()

Adds an error to the diagnostic log.

```typescript
addError(renderingId: string, error: RenderError): void
```

##### updateStage()

Updates the current rendering stage.

```typescript
updateStage(renderingId: string, stage: RenderingStage): void
```

##### completeDiagnostics()

Completes diagnostic collection and returns data.

```typescript
completeDiagnostics(renderingId: string): DiagnosticsData | null
```

## Interfaces

### RenderOptions

Configuration options for PDF rendering.

```typescript
interface RenderOptions {
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
```

### RenderResult

Result of a PDF rendering operation.

```typescript
interface RenderResult {
  success: boolean;
  renderingId: string;
  method: RenderingMethod;
  pages: RenderedPage[];
  error?: RenderError;
  diagnostics: DiagnosticsData;
}
```

### ProgressState

Current state of rendering progress.

```typescript
interface ProgressState {
  percentage: number;
  stage: RenderingStage;
  bytesLoaded: number;
  totalBytes: number;
  timeElapsed: number;
  isStuck: boolean;
  lastUpdate: Date;
}
```

### WatermarkConfig

Configuration for document watermarking.

```typescript
interface WatermarkConfig {
  text?: string;
  opacity?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize?: number;
  color?: string;
}
```

## Configuration

### ReliabilityConfig

Main configuration interface for the reliability system.

```typescript
interface ReliabilityConfig {
  features: FeatureFlags;
  timeouts: TimeoutConfig;
  retries: RetryConfig;
  diagnostics: DiagnosticsConfig;
  performance: PerformanceTuning;
}
```

### Creating Configuration

```typescript
import { createReliabilityConfig } from '@/lib/pdf-reliability';

// Use defaults
const config = createReliabilityConfig();

// Override specific settings
const customConfig = createReliabilityConfig({
  timeouts: {
    default: 45000, // 45 seconds
    network: 20000,  // 20 seconds
  },
  features: {
    enablePDFJSCanvas: true,
    enableNativeBrowser: false, // Disable native browser fallback
  },
  performance: {
    memory: {
      pressureThreshold: 200 * 1024 * 1024, // 200MB
    },
  },
});
```

### Environment-Specific Configuration

The system automatically applies environment-specific overrides:

- **Development**: Enhanced diagnostics, more frequent progress updates
- **Production**: Error-only logging, performance optimizations
- **Test**: Reduced timeouts, minimal diagnostics

### Feature Flags

Control which rendering methods and features are enabled:

```typescript
interface FeatureFlags {
  enablePDFJSCanvas: boolean;        // PDF.js canvas rendering
  enableNativeBrowser: boolean;      // Native browser rendering
  enableServerConversion: boolean;   // Server-side conversion
  enableImageBased: boolean;         // Image-based rendering
  enableDownloadFallback: boolean;   // Download fallback
  enableAutoMethodSelection: boolean; // Automatic method selection
  enablePerformanceMonitoring: boolean; // Performance tracking
  enableErrorReporting: boolean;     // Error reporting
  enableUserFeedback: boolean;       // User feedback collection
  enableMethodCaching: boolean;      // Cache successful methods
}
```

## Error Handling

### Error Types

The system categorizes errors for appropriate handling:

```typescript
enum ErrorType {
  NETWORK_ERROR = 'network-error',
  PARSING_ERROR = 'parsing-error',
  CANVAS_ERROR = 'canvas-error',
  MEMORY_ERROR = 'memory-error',
  TIMEOUT_ERROR = 'timeout-error',
  AUTHENTICATION_ERROR = 'auth-error',
  CORRUPTION_ERROR = 'corruption-error'
}
```

### Error Recovery

Errors are automatically handled based on type:

- **Network Errors**: Retry with exponential backoff
- **Canvas Errors**: Recreate canvas and retry
- **Memory Errors**: Clean up resources and retry
- **Timeout Errors**: Increase timeout and retry
- **Authentication Errors**: Refresh signed URL
- **Parsing Errors**: Try alternative parsing method

### Custom Error Handling

```typescript
renderer.renderPDF(url, options)
  .then(result => {
    if (!result.success) {
      switch (result.error?.type) {
        case ErrorType.NETWORK_ERROR:
          // Handle network issues
          break;
        case ErrorType.AUTHENTICATION_ERROR:
          // Handle auth issues
          break;
        default:
          // Handle other errors
      }
    }
  });
```

## Progress Tracking

### Real-time Updates

```typescript
const renderingId = 'unique-id';

renderer.onProgressUpdate(renderingId, (progress) => {
  console.log(`Progress: ${progress.percentage}% - ${progress.stage}`);
  
  if (progress.isStuck) {
    console.warn('Rendering appears stuck, offering retry option');
    // Show retry button to user
  }
});

const result = await renderer.renderPDF(url, options);
```

### Stuck Detection

The system automatically detects when rendering appears stuck:

- No progress updates for configurable threshold (default: 10 seconds)
- Provides force retry mechanism
- Offers alternative methods or download fallback

## Diagnostics

### Collecting Diagnostics

```typescript
const result = await renderer.renderPDF(url, { diagnosticsEnabled: true });

if (result.diagnostics) {
  console.log('Rendering took:', result.diagnostics.totalTime, 'ms');
  console.log('Method used:', result.diagnostics.method);
  console.log('Errors encountered:', result.diagnostics.errors.length);
  console.log('Performance metrics:', result.diagnostics.performanceMetrics);
}
```

### Diagnostic Levels

Configure diagnostic collection level:

```typescript
const config = createReliabilityConfig({
  diagnostics: {
    level: DiagnosticLevel.DEBUG, // NONE, ERROR, WARN, INFO, DEBUG, VERBOSE
    collectPerformanceMetrics: true,
    collectStackTraces: true,
    collectBrowserInfo: true,
  },
});
```

## UI Components

### ProgressIndicator

Displays rendering progress with reliability features.

```typescript
import { ProgressIndicator } from '@/components/pdf';

<ProgressIndicator
  progress={progressState}
  onForceRetry={() => renderer.forceRetry(renderingId)}
  showRetryButton={progressState.isStuck}
/>
```

### ReliabilityErrorDisplay

Shows user-friendly error messages with recovery options.

```typescript
import { ReliabilityErrorDisplay } from '@/components/pdf';

<ReliabilityErrorDisplay
  error={renderError}
  onRetry={() => handleRetry()}
  onDownload={() => handleDownload()}
  showDiagnostics={true}
/>
```

### DownloadFallbackUI

Provides download option when all rendering methods fail.

```typescript
import { DownloadFallbackUI } from '@/components/pdf';

<DownloadFallbackUI
  documentUrl={url}
  documentName="document.pdf"
  onDownload={() => handleDownload()}
/>
```

### PDFReliabilityUI

Complete UI wrapper with all reliability features.

```typescript
import { PDFReliabilityUI } from '@/components/pdf';

<PDFReliabilityUI
  url={documentUrl}
  options={renderOptions}
  onRenderComplete={(result) => handleResult(result)}
  onError={(error) => handleError(error)}
/>
```

## Examples

### Basic Usage

```typescript
import { ReliablePDFRenderer } from '@/lib/pdf-reliability';

const renderer = new ReliablePDFRenderer();

async function renderDocument(url: string) {
  try {
    const result = await renderer.renderPDF(url, {
      watermark: {
        text: 'CONFIDENTIAL',
        opacity: 0.3,
      },
      timeout: 30000,
      fallbackEnabled: true,
    });

    if (result.success) {
      // Display rendered pages
      result.pages.forEach((page, index) => {
        document.body.appendChild(page.canvas);
      });
    } else {
      console.error('Rendering failed:', result.error?.message);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```

### Advanced Configuration

```typescript
import { 
  ReliablePDFRenderer, 
  createReliabilityConfig,
  RenderingMethod,
  DiagnosticLevel 
} from '@/lib/pdf-reliability';

const config = createReliabilityConfig({
  features: {
    enablePDFJSCanvas: true,
    enableNativeBrowser: true,
    enableServerConversion: false, // Disable server conversion
    enablePerformanceMonitoring: true,
  },
  timeouts: {
    default: 60000, // 1 minute
    network: 30000, // 30 seconds
    progressive: {
      enabled: true,
      multiplier: 1.5,
      maxTimeout: 180000, // 3 minutes max
    },
  },
  retries: {
    maxAttempts: 5,
    exponentialBackoff: {
      enabled: true,
      multiplier: 2,
      maxDelay: 60000,
    },
  },
  diagnostics: {
    level: DiagnosticLevel.INFO,
    collectPerformanceMetrics: true,
    autoExport: {
      enabled: true,
      threshold: 3,
      endpoint: '/api/diagnostics',
    },
  },
  performance: {
    memory: {
      pressureThreshold: 150 * 1024 * 1024, // 150MB
      canvasCleanup: 'aggressive',
    },
    rendering: {
      qualityPreference: 'balanced',
      lazyLoadingThreshold: 2,
    },
  },
});

const renderer = new ReliablePDFRenderer(config);
```

### Progress Tracking with UI

```typescript
import { ReliablePDFRenderer } from '@/lib/pdf-reliability';
import { ProgressIndicator } from '@/components/pdf';

const renderer = new ReliablePDFRenderer();

async function renderWithProgress(url: string) {
  const [progressState, setProgressState] = useState(null);
  const [renderingId, setRenderingId] = useState(null);

  // Start rendering
  const renderPromise = renderer.renderPDF(url, {
    diagnosticsEnabled: true,
  });

  // Get rendering ID from result (in real implementation)
  const tempId = 'temp-id'; // This would come from the renderer
  setRenderingId(tempId);

  // Set up progress tracking
  renderer.onProgressUpdate(tempId, (progress) => {
    setProgressState(progress);
  });

  try {
    const result = await renderPromise;
    
    if (result.success) {
      console.log('Rendering completed successfully');
    } else {
      console.error('Rendering failed:', result.error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }

  return (
    <ProgressIndicator
      progress={progressState}
      onForceRetry={() => renderer.forceRetry(renderingId)}
      showRetryButton={progressState?.isStuck}
    />
  );
}
```

### Error Handling and Recovery

```typescript
import { 
  ReliablePDFRenderer, 
  ErrorType,
  RenderingMethod 
} from '@/lib/pdf-reliability';

const renderer = new ReliablePDFRenderer();

async function renderWithErrorHandling(url: string) {
  try {
    const result = await renderer.renderPDF(url, {
      preferredMethod: RenderingMethod.PDFJS_CANVAS,
      fallbackEnabled: true,
    });

    if (!result.success && result.error) {
      switch (result.error.type) {
        case ErrorType.NETWORK_ERROR:
          // Retry with different network settings
          return await renderer.renderPDF(url, {
            timeout: 60000, // Longer timeout
          });

        case ErrorType.AUTHENTICATION_ERROR:
          // Refresh URL and retry
          const newUrl = await refreshSignedUrl(url);
          return await renderer.renderPDF(newUrl);

        case ErrorType.MEMORY_ERROR:
          // Use conservative memory settings
          return await renderer.renderPDF(url, {
            typeSpecific: {
              memoryManagement: 'aggressive',
              maxConcurrentPages: 1,
            },
          });

        default:
          // Show error to user with download option
          showErrorWithDownload(result.error);
      }
    }

    return result;
  } catch (error) {
    console.error('Rendering failed completely:', error);
    throw error;
  }
}
```

## Performance Optimization

### Document Type Optimization

The system automatically optimizes based on document characteristics:

```typescript
// Small documents (< 1MB) - optimized for speed
// Large documents (> 10MB) - optimized for memory
// Complex documents - balanced quality/performance

const result = await renderer.renderPDF(url, {
  typeSpecific: {
    documentType: 'image-heavy', // Hints for optimization
    enableStreaming: true,       // For large documents
    memoryManagement: 'conservative', // Memory strategy
  },
});
```

### Memory Management

```typescript
const config = createReliabilityConfig({
  performance: {
    memory: {
      pressureThreshold: 100 * 1024 * 1024, // 100MB threshold
      canvasCleanup: 'aggressive',           // Aggressive cleanup
      maxConcurrentPages: 3,                 // Limit concurrent pages
    },
  },
});
```

### Network Optimization

```typescript
const config = createReliabilityConfig({
  performance: {
    network: {
      connectionPooling: true,      // Reuse connections
      prefetchStrategy: 'next-page', // Prefetch next page
      compressionPreference: 'gzip', // Prefer compression
    },
  },
});
```

## Browser Compatibility

The PDF Rendering Reliability Fix supports:

- **Chrome 80+**: Full feature support
- **Firefox 75+**: Full feature support  
- **Safari 13+**: Limited server conversion support
- **Edge 80+**: Full feature support

### Feature Detection

```typescript
import { detectBrowserCapabilities } from '@/lib/pdf-reliability';

const capabilities = detectBrowserCapabilities();

const config = createReliabilityConfig({
  features: {
    enablePDFJSCanvas: capabilities.supportsPDFJS,
    enableNativeBrowser: capabilities.supportsNativePDF,
    enableServerConversion: !capabilities.supportsPDFJS,
  },
});
```

## Migration Guide

### From Legacy PDF Viewer

```typescript
// Old approach
import PDFViewer from './legacy/PDFViewer';

// New approach
import { ReliablePDFRenderer } from '@/lib/pdf-reliability';
import { PDFReliabilityUI } from '@/components/pdf';

// Replace component
<PDFReliabilityUI
  url={pdfUrl}
  options={{
    watermark: watermarkConfig,
    fallbackEnabled: true,
  }}
  onRenderComplete={handleComplete}
/>
```

### Gradual Migration

1. **Phase 1**: Add reliability wrapper around existing viewer
2. **Phase 2**: Replace progress tracking with new system
3. **Phase 3**: Implement error recovery and fallbacks
4. **Phase 4**: Add diagnostics and monitoring

## Troubleshooting

See [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md) for common issues and solutions.

## Performance Tuning

See [PERFORMANCE_TUNING_GUIDE.md](./PERFORMANCE_TUNING_GUIDE.md) for optimization recommendations.

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment instructions and rollout strategy.