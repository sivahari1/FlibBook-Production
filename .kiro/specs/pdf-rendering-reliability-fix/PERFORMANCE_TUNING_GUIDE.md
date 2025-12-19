# PDF Rendering Reliability Fix - Performance Tuning Guide

## Overview

This guide provides comprehensive performance optimization strategies for the PDF Rendering Reliability Fix system. It covers configuration tuning, resource optimization, and monitoring techniques to achieve optimal performance across different scenarios.

## Table of Contents

- [Performance Fundamentals](#performance-fundamentals)
- [Configuration Optimization](#configuration-optimization)
- [Document Type Optimization](#document-type-optimization)
- [Memory Management](#memory-management)
- [Network Optimization](#network-optimization)
- [Rendering Performance](#rendering-performance)
- [Browser-Specific Optimizations](#browser-specific-optimizations)
- [Monitoring and Metrics](#monitoring-and-metrics)
- [Benchmarking](#benchmarking)
- [Production Optimization](#production-optimization)

## Performance Fundamentals

### Key Performance Metrics

1. **Time to First Render (TTFR)**: Time until first page is visible
2. **Total Render Time (TRT)**: Time to complete entire document
3. **Memory Usage Peak**: Maximum memory consumption during rendering
4. **Network Efficiency**: Data transfer optimization
5. **Error Recovery Time**: Time to recover from failures

### Performance Targets

| Document Size | TTFR Target | TRT Target | Memory Limit |
|---------------|-------------|------------|--------------|
| Small (< 1MB) | < 2 seconds | < 5 seconds | < 50MB |
| Medium (1-10MB) | < 5 seconds | < 15 seconds | < 100MB |
| Large (> 10MB) | < 10 seconds | < 60 seconds | < 200MB |

### Performance Bottlenecks

Common bottlenecks and their impact:

1. **Network Latency**: 30-50% of total time for remote documents
2. **PDF Parsing**: 10-20% for complex documents
3. **Canvas Rendering**: 40-60% of processing time
4. **Memory Allocation**: Can cause 2-5x slowdown when constrained
5. **Fallback Methods**: 50-200% overhead when primary method fails

## Configuration Optimization

### Basic Performance Configuration

```typescript
import { createReliabilityConfig, DiagnosticLevel } from '@/lib/pdf-reliability';

// Optimized configuration for performance
const performanceConfig = createReliabilityConfig({
  // Prioritize speed over comprehensive error handling
  features: {
    enablePDFJSCanvas: true,
    enableNativeBrowser: true,
    enableServerConversion: false, // Disable slower fallbacks
    enableImageBased: false,
    enableDownloadFallback: true,
    enablePerformanceMonitoring: true,
    enableErrorReporting: false, // Reduce overhead
  },
  
  // Aggressive timeouts for faster failure detection
  timeouts: {
    default: 15000, // 15 seconds instead of 30
    network: 8000,  // 8 seconds instead of 15
    parsing: 5000,  // 5 seconds instead of 10
    rendering: 10000, // 10 seconds instead of 20
    progressive: {
      enabled: false, // Disable progressive timeouts for speed
    },
  },
  
  // Minimal retry logic
  retries: {
    maxAttempts: 2, // Reduce from default 3
    baseDelay: 500, // Faster retry
    exponentialBackoff: {
      enabled: true,
      multiplier: 1.5, // Less aggressive backoff
      maxDelay: 5000,
    },
  },
  
  // Minimal diagnostics for production
  diagnostics: {
    level: DiagnosticLevel.ERROR,
    collectPerformanceMetrics: true,
    collectStackTraces: false,
    collectBrowserInfo: false,
    maxEntries: 50, // Reduce memory usage
  },
  
  // Performance-optimized settings
  performance: {
    memory: {
      pressureThreshold: 75 * 1024 * 1024, // 75MB
      canvasCleanup: 'standard', // Balance cleanup vs performance
      maxConcurrentPages: 3,
    },
    progress: {
      updateInterval: 1000, // Less frequent updates
      stuckThreshold: 8000, // Faster stuck detection
      calculationMethod: 'linear', // Simpler calculation
    },
    rendering: {
      canvasOptimization: true,
      viewportCaching: true,
      lazyLoadingThreshold: 2,
      qualityPreference: 'speed',
    },
    network: {
      connectionPooling: true,
      requestBatching: false,
      prefetchStrategy: 'next-page',
      compressionPreference: 'gzip',
    },
  },
});
```

### Environment-Specific Optimization

#### Development Environment

```typescript
const devConfig = createReliabilityConfig({
  diagnostics: {
    level: DiagnosticLevel.DEBUG,
    collectPerformanceMetrics: true,
    collectStackTraces: true,
  },
  performance: {
    progress: {
      updateInterval: 250, // More frequent updates for debugging
    },
  },
});
```

#### Production Environment

```typescript
const prodConfig = createReliabilityConfig({
  diagnostics: {
    level: DiagnosticLevel.ERROR,
    collectPerformanceMetrics: true,
    autoExport: {
      enabled: true,
      threshold: 5,
      endpoint: '/api/diagnostics',
    },
  },
  performance: {
    rendering: {
      qualityPreference: 'speed',
    },
    progress: {
      updateInterval: 2000, // Less frequent updates
    },
  },
});
```

#### Mobile Environment

```typescript
const mobileConfig = createReliabilityConfig({
  performance: {
    memory: {
      pressureThreshold: 30 * 1024 * 1024, // 30MB for mobile
      canvasCleanup: 'aggressive',
      maxConcurrentPages: 1,
    },
    rendering: {
      qualityPreference: 'speed',
      canvasOptimization: true,
      lazyLoadingThreshold: 1,
    },
    network: {
      prefetchStrategy: 'none', // Conserve bandwidth
    },
  },
});
```

## Document Type Optimization

### Automatic Document Analysis

The system automatically analyzes documents and applies optimizations:

```typescript
import { DocumentTypeHandler } from '@/lib/pdf-reliability';

const documentHandler = new DocumentTypeHandler(config);

// Analyze document characteristics
const characteristics = await documentHandler.analyzeDocument(url);
console.log('Document analysis:', {
  size: characteristics.sizeBytes,
  type: characteristics.type,
  pageCount: characteristics.pageCount,
  complexity: characteristics.complexity,
});

// Get optimized options
const optimizedOptions = documentHandler.getOptimizedOptions(
  characteristics,
  baseOptions
);
```

### Size-Based Optimization

#### Small Documents (< 1MB)

```typescript
const smallDocConfig = {
  typeSpecific: {
    documentType: 'small',
    memoryManagement: 'standard',
    maxConcurrentPages: 5, // Load more pages simultaneously
  },
  timeout: 10000, // Shorter timeout
  preferredMethod: RenderingMethod.PDFJS_CANVAS,
};

// Expected performance: < 5 seconds total render time
```

#### Medium Documents (1-10MB)

```typescript
const mediumDocConfig = {
  typeSpecific: {
    documentType: 'medium',
    enableStreaming: true,
    memoryManagement: 'standard',
    maxConcurrentPages: 3,
  },
  timeout: 30000,
  preferredMethod: RenderingMethod.PDFJS_CANVAS,
};

// Expected performance: 5-15 seconds total render time
```

#### Large Documents (> 10MB)

```typescript
const largeDocConfig = {
  typeSpecific: {
    documentType: 'large',
    enableStreaming: true,
    memoryManagement: 'aggressive',
    maxConcurrentPages: 2,
  },
  timeout: 60000,
  preferredMethod: RenderingMethod.PDFJS_CANVAS,
};

// Expected performance: 15-60 seconds total render time
```

### Content-Based Optimization

#### Text-Heavy Documents

```typescript
const textHeavyConfig = {
  typeSpecific: {
    documentType: 'text-heavy',
    memoryManagement: 'standard',
  },
  performance: {
    rendering: {
      qualityPreference: 'speed',
      canvasOptimization: true,
    },
  },
};
```

#### Image-Heavy Documents

```typescript
const imageHeavyConfig = {
  typeSpecific: {
    documentType: 'image-heavy',
    memoryManagement: 'aggressive',
    maxConcurrentPages: 2,
  },
  performance: {
    rendering: {
      qualityPreference: 'quality',
      canvasOptimization: false, // Preserve image quality
    },
    memory: {
      pressureThreshold: 150 * 1024 * 1024, // Higher threshold
    },
  },
};
```

#### Complex Documents (Forms, Annotations)

```typescript
const complexDocConfig = {
  typeSpecific: {
    documentType: 'complex',
    memoryManagement: 'conservative',
    maxConcurrentPages: 1,
  },
  performance: {
    rendering: {
      qualityPreference: 'balanced',
    },
  },
  timeout: 45000, // Longer timeout for complex processing
};
```

## Memory Management

### Memory Optimization Strategies

#### Aggressive Memory Management

```typescript
const aggressiveMemoryConfig = createReliabilityConfig({
  performance: {
    memory: {
      pressureThreshold: 50 * 1024 * 1024, // 50MB threshold
      gcThreshold: 25 * 1024 * 1024, // 25MB GC trigger
      canvasCleanup: 'aggressive',
      maxConcurrentPages: 1,
    },
  },
});

// Use for:
// - Mobile devices
// - Large documents
// - Memory-constrained environments
```

#### Balanced Memory Management

```typescript
const balancedMemoryConfig = createReliabilityConfig({
  performance: {
    memory: {
      pressureThreshold: 100 * 1024 * 1024, // 100MB threshold
      gcThreshold: 50 * 1024 * 1024, // 50MB GC trigger
      canvasCleanup: 'standard',
      maxConcurrentPages: 3,
    },
  },
});

// Use for:
// - Desktop browsers
// - Medium-sized documents
// - General use cases
```

#### Performance-First Memory Management

```typescript
const performanceMemoryConfig = createReliabilityConfig({
  performance: {
    memory: {
      pressureThreshold: 200 * 1024 * 1024, // 200MB threshold
      gcThreshold: 100 * 1024 * 1024, // 100MB GC trigger
      canvasCleanup: 'conservative',
      maxConcurrentPages: 5,
    },
  },
});

// Use for:
// - High-memory systems
// - Small to medium documents
// - Performance-critical applications
```

### Memory Monitoring

```typescript
// Real-time memory monitoring
class MemoryMonitor {
  private memoryHistory: Array<{ timestamp: number; usage: number }> = [];
  
  startMonitoring(interval = 5000) {
    setInterval(() => {
      if ('memory' in performance) {
        const memInfo = performance.memory as any;
        const usage = memInfo.usedJSHeapSize;
        
        this.memoryHistory.push({
          timestamp: Date.now(),
          usage,
        });
        
        // Keep only last 20 measurements
        if (this.memoryHistory.length > 20) {
          this.memoryHistory = this.memoryHistory.slice(-20);
        }
        
        this.analyzeMemoryTrend();
      }
    }, interval);
  }
  
  private analyzeMemoryTrend() {
    if (this.memoryHistory.length < 5) return;
    
    const recent = this.memoryHistory.slice(-5);
    const trend = recent[recent.length - 1].usage - recent[0].usage;
    const rate = trend / (recent[recent.length - 1].timestamp - recent[0].timestamp);
    
    if (rate > 1000) { // 1KB per millisecond = potential leak
      console.warn('Potential memory leak detected:', rate, 'bytes/ms');
      this.triggerCleanup();
    }
  }
  
  private triggerCleanup() {
    // Trigger aggressive cleanup
    if (window.gc) {
      window.gc();
    }
    
    // Notify application to clean up resources
    window.dispatchEvent(new CustomEvent('memory-pressure'));
  }
}
```

### Canvas Memory Optimization

```typescript
// Optimized canvas management
class OptimizedCanvasManager extends CanvasManager {
  private canvasPool: HTMLCanvasElement[] = [];
  private maxPoolSize = 5;
  
  createCanvas(width: number, height: number): HTMLCanvasElement {
    // Try to reuse from pool first
    const pooledCanvas = this.canvasPool.pop();
    if (pooledCanvas) {
      pooledCanvas.width = width;
      pooledCanvas.height = height;
      return pooledCanvas;
    }
    
    // Create new canvas with size limits
    const maxSize = this.getMaxCanvasSize();
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(width, maxSize);
    canvas.height = Math.min(height, maxSize);
    
    return canvas;
  }
  
  destroyCanvas(canvas: HTMLCanvasElement): void {
    // Clear canvas
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Return to pool if space available
    if (this.canvasPool.length < this.maxPoolSize) {
      canvas.width = 1;
      canvas.height = 1;
      this.canvasPool.push(canvas);
    }
  }
  
  private getMaxCanvasSize(): number {
    // Determine safe canvas size based on available memory
    if ('memory' in performance) {
      const memInfo = performance.memory as any;
      const availableMemory = memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize;
      
      if (availableMemory < 50 * 1024 * 1024) { // < 50MB
        return 2048;
      } else if (availableMemory < 100 * 1024 * 1024) { // < 100MB
        return 4096;
      } else {
        return 8192;
      }
    }
    
    return 4096; // Safe default
  }
}
```

## Network Optimization

### Connection Optimization

```typescript
// Optimized network configuration
const networkOptimizedConfig = createReliabilityConfig({
  performance: {
    network: {
      connectionPooling: true,
      requestBatching: false, // Can interfere with PDF.js
      prefetchStrategy: 'next-page',
      compressionPreference: 'gzip',
    },
  },
  
  timeouts: {
    network: 10000, // 10 seconds
    progressive: {
      enabled: true,
      multiplier: 1.5,
      maxTimeout: 30000,
    },
  },
  
  retries: {
    maxAttempts: 3,
    exponentialBackoff: {
      enabled: true,
      multiplier: 2,
      maxDelay: 15000,
    },
    retryOn: {
      networkErrors: true,
      timeoutErrors: true,
      canvasErrors: false, // Don't retry network for canvas errors
      memoryErrors: false,
      parsingErrors: false,
    },
  },
});
```

### Bandwidth Optimization

```typescript
// Detect and adapt to connection quality
class NetworkAdapter {
  private connectionInfo: any;
  
  constructor() {
    this.connectionInfo = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
  }
  
  getOptimizedConfig(): Partial<ReliabilityConfig> {
    const connection = this.connectionInfo;
    
    if (!connection) {
      return {}; // Use defaults if no connection info
    }
    
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;
    
    // Optimize based on connection quality
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return this.getSlowConnectionConfig();
    } else if (effectiveType === '3g') {
      return this.getMediumConnectionConfig();
    } else if (effectiveType === '4g' || downlink > 10) {
      return this.getFastConnectionConfig();
    }
    
    return {};
  }
  
  private getSlowConnectionConfig(): Partial<ReliabilityConfig> {
    return {
      timeouts: {
        network: 30000, // 30 seconds
        default: 60000, // 1 minute
      },
      performance: {
        network: {
          prefetchStrategy: 'none',
          compressionPreference: 'gzip',
        },
        rendering: {
          qualityPreference: 'speed',
          lazyLoadingThreshold: 0, // Load only current page
        },
      },
    };
  }
  
  private getMediumConnectionConfig(): Partial<ReliabilityConfig> {
    return {
      timeouts: {
        network: 15000, // 15 seconds
        default: 30000, // 30 seconds
      },
      performance: {
        network: {
          prefetchStrategy: 'next-page',
          compressionPreference: 'gzip',
        },
        rendering: {
          qualityPreference: 'balanced',
          lazyLoadingThreshold: 1,
        },
      },
    };
  }
  
  private getFastConnectionConfig(): Partial<ReliabilityConfig> {
    return {
      timeouts: {
        network: 8000, // 8 seconds
        default: 20000, // 20 seconds
      },
      performance: {
        network: {
          prefetchStrategy: 'next-page',
          compressionPreference: 'brotli',
        },
        rendering: {
          qualityPreference: 'quality',
          lazyLoadingThreshold: 3,
        },
      },
    };
  }
}
```

### Caching Optimization

```typescript
// Implement intelligent caching
class PDFCacheManager {
  private cache = new Map<string, ArrayBuffer>();
  private maxCacheSize = 100 * 1024 * 1024; // 100MB
  private currentCacheSize = 0;
  
  async getCachedPDF(url: string): Promise<ArrayBuffer | null> {
    const cached = this.cache.get(url);
    if (cached) {
      console.log('Cache hit for:', url);
      return cached;
    }
    
    return null;
  }
  
  async cachePDF(url: string, data: ArrayBuffer): Promise<void> {
    const size = data.byteLength;
    
    // Don't cache if too large
    if (size > this.maxCacheSize / 2) {
      return;
    }
    
    // Make room if necessary
    while (this.currentCacheSize + size > this.maxCacheSize) {
      this.evictOldest();
    }
    
    this.cache.set(url, data);
    this.currentCacheSize += size;
    
    console.log('Cached PDF:', url, 'Size:', size, 'Total cache:', this.currentCacheSize);
  }
  
  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      const data = this.cache.get(firstKey);
      if (data) {
        this.currentCacheSize -= data.byteLength;
      }
      this.cache.delete(firstKey);
    }
  }
}
```

## Rendering Performance

### Canvas Optimization

```typescript
// Optimized canvas rendering
class PerformanceCanvasRenderer {
  private offscreenCanvas?: OffscreenCanvas;
  
  constructor(private config: ReliabilityConfig) {
    // Use OffscreenCanvas if available
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(1, 1);
    }
  }
  
  async renderPage(
    page: PDFPage,
    viewport: PDFViewport,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context not available');
    }
    
    // Optimize canvas size
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaleFactor = this.getOptimalScaleFactor(viewport, devicePixelRatio);
    
    canvas.width = viewport.width * scaleFactor;
    canvas.height = viewport.height * scaleFactor;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    
    // Scale context for high DPI
    context.scale(scaleFactor, scaleFactor);
    
    // Optimize rendering quality vs speed
    const qualityPreference = this.config.performance.rendering.qualityPreference;
    this.setRenderingQuality(context, qualityPreference);
    
    // Render with optimized viewport
    const renderContext = {
      canvasContext: context,
      viewport: viewport.clone({ scale: 1 }),
    };
    
    await page.render(renderContext).promise;
  }
  
  private getOptimalScaleFactor(viewport: PDFViewport, devicePixelRatio: number): number {
    const qualityPreference = this.config.performance.rendering.qualityPreference;
    
    switch (qualityPreference) {
      case 'speed':
        return Math.min(devicePixelRatio, 1.5);
      case 'balanced':
        return Math.min(devicePixelRatio, 2);
      case 'quality':
        return devicePixelRatio;
      default:
        return devicePixelRatio;
    }
  }
  
  private setRenderingQuality(context: CanvasRenderingContext2D, quality: string): void {
    switch (quality) {
      case 'speed':
        context.imageSmoothingEnabled = false;
        break;
      case 'balanced':
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'medium';
        break;
      case 'quality':
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        break;
    }
  }
}
```

### Lazy Loading Optimization

```typescript
// Intelligent lazy loading
class LazyLoadManager {
  private visiblePages = new Set<number>();
  private loadingPages = new Set<number>();
  private loadedPages = new Set<number>();
  
  constructor(
    private config: ReliabilityConfig,
    private onPageLoad: (pageNum: number) => Promise<void>
  ) {}
  
  updateVisiblePages(visiblePageNumbers: number[]): void {
    this.visiblePages = new Set(visiblePageNumbers);
    this.scheduleLoading();
  }
  
  private scheduleLoading(): void {
    const threshold = this.config.performance.rendering.lazyLoadingThreshold;
    const pagesToLoad = new Set<number>();
    
    // Add visible pages
    this.visiblePages.forEach(pageNum => {
      pagesToLoad.add(pageNum);
    });
    
    // Add pages within threshold
    this.visiblePages.forEach(pageNum => {
      for (let i = Math.max(1, pageNum - threshold); 
           i <= pageNum + threshold; 
           i++) {
        pagesToLoad.add(i);
      }
    });
    
    // Load pages that aren't already loaded or loading
    pagesToLoad.forEach(pageNum => {
      if (!this.loadedPages.has(pageNum) && !this.loadingPages.has(pageNum)) {
        this.loadPage(pageNum);
      }
    });
  }
  
  private async loadPage(pageNum: number): Promise<void> {
    this.loadingPages.add(pageNum);
    
    try {
      await this.onPageLoad(pageNum);
      this.loadedPages.add(pageNum);
    } catch (error) {
      console.error('Failed to load page', pageNum, error);
    } finally {
      this.loadingPages.delete(pageNum);
    }
  }
}
```

## Browser-Specific Optimizations

### Chrome Optimizations

```typescript
const chromeOptimizations = {
  // Chrome-specific canvas optimizations
  canvas: {
    willReadFrequently: true, // Optimize for frequent reads
    alpha: false, // Disable alpha channel if not needed
  },
  
  // Chrome memory management
  memory: {
    // Use Chrome's memory pressure API if available
    enableMemoryPressureAPI: true,
    // Optimize for Chrome's V8 garbage collector
    gcOptimization: 'v8',
  },
  
  // Chrome network optimizations
  network: {
    // Use Chrome's connection pooling
    connectionPooling: true,
    // Enable HTTP/2 push if supported
    http2Push: true,
  },
};

// Apply Chrome optimizations
if (navigator.userAgent.includes('Chrome')) {
  const config = createReliabilityConfig({
    performance: {
      rendering: {
        canvasOptimization: true,
        // Chrome-specific optimizations
        chromeOptimizations,
      },
    },
  });
}
```

### Firefox Optimizations

```typescript
const firefoxOptimizations = {
  // Firefox-specific rendering
  rendering: {
    // Firefox handles canvas differently
    canvasBuffering: 'double',
    // Optimize for Gecko engine
    geckoOptimizations: true,
  },
  
  // Firefox memory management
  memory: {
    // Firefox-specific GC tuning
    gcOptimization: 'spidermonkey',
    // More conservative memory usage
    conservativeMode: true,
  },
};

// Apply Firefox optimizations
if (navigator.userAgent.includes('Firefox')) {
  const config = createReliabilityConfig({
    performance: {
      memory: {
        canvasCleanup: 'aggressive', // Firefox benefits from aggressive cleanup
      },
      rendering: firefoxOptimizations.rendering,
    },
  });
}
```

### Safari Optimizations

```typescript
const safariOptimizations = {
  // Safari-specific limitations
  rendering: {
    // Safari has stricter canvas limits
    maxCanvasSize: 4096,
    // WebKit-specific optimizations
    webkitOptimizations: true,
  },
  
  // Safari memory constraints
  memory: {
    // More aggressive memory management for Safari
    pressureThreshold: 50 * 1024 * 1024, // 50MB
    canvasCleanup: 'aggressive',
  },
  
  // Safari network handling
  network: {
    // Safari has different CORS behavior
    corsHandling: 'webkit',
    // More conservative timeouts
    timeoutMultiplier: 1.5,
  },
};

// Apply Safari optimizations
if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
  const config = createReliabilityConfig({
    features: {
      // Prefer server conversion for Safari
      enableServerConversion: true,
      enablePDFJSCanvas: false,
    },
    performance: safariOptimizations,
  });
}
```

## Monitoring and Metrics

### Performance Monitoring Setup

```typescript
// Comprehensive performance monitoring
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private observers: PerformanceObserver[] = [];
  
  startMonitoring(): void {
    // Monitor rendering performance
    this.observeRenderingMetrics();
    
    // Monitor memory usage
    this.observeMemoryMetrics();
    
    // Monitor network performance
    this.observeNetworkMetrics();
    
    // Monitor user interactions
    this.observeUserMetrics();
  }
  
  private observeRenderingMetrics(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name.startsWith('pdf-render')) {
          this.recordMetric('render-time', entry.duration);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    this.observers.push(observer);
  }
  
  private observeMemoryMetrics(): void {
    setInterval(() => {
      if ('memory' in performance) {
        const memInfo = performance.memory as any;
        this.recordMetric('memory-usage', memInfo.usedJSHeapSize);
        this.recordMetric('memory-total', memInfo.totalJSHeapSize);
      }
    }, 5000);
  }
  
  private observeNetworkMetrics(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource' && entry.name.includes('.pdf')) {
          this.recordMetric('network-time', entry.duration);
          this.recordMetric('download-size', (entry as any).transferSize || 0);
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }
  
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.splice(0, values.length - 100);
    }
  }
  
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      if (values.length > 0) {
        summary[name] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          p95: this.percentile(values, 0.95),
          p99: this.percentile(values, 0.99),
        };
      }
    });
    
    return summary;
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}
```

### Real-time Performance Dashboard

```typescript
// Performance dashboard component
class PerformanceDashboard {
  private monitor: PerformanceMonitor;
  private updateInterval: number;
  
  constructor(monitor: PerformanceMonitor, updateInterval = 5000) {
    this.monitor = monitor;
    this.updateInterval = updateInterval;
  }
  
  start(): void {
    setInterval(() => {
      this.updateDashboard();
    }, this.updateInterval);
  }
  
  private updateDashboard(): void {
    const metrics = this.monitor.getMetricsSummary();
    
    // Update performance indicators
    this.updateRenderingMetrics(metrics);
    this.updateMemoryMetrics(metrics);
    this.updateNetworkMetrics(metrics);
    
    // Check for performance issues
    this.checkPerformanceAlerts(metrics);
  }
  
  private updateRenderingMetrics(metrics: Record<string, any>): void {
    const renderTime = metrics['render-time'];
    if (renderTime) {
      console.log('Rendering Performance:', {
        average: renderTime.avg.toFixed(2) + 'ms',
        p95: renderTime.p95.toFixed(2) + 'ms',
        max: renderTime.max.toFixed(2) + 'ms',
      });
    }
  }
  
  private updateMemoryMetrics(metrics: Record<string, any>): void {
    const memoryUsage = metrics['memory-usage'];
    if (memoryUsage) {
      const avgMB = (memoryUsage.avg / 1024 / 1024).toFixed(2);
      const maxMB = (memoryUsage.max / 1024 / 1024).toFixed(2);
      
      console.log('Memory Usage:', {
        average: avgMB + 'MB',
        peak: maxMB + 'MB',
      });
    }
  }
  
  private updateNetworkMetrics(metrics: Record<string, any>): void {
    const networkTime = metrics['network-time'];
    const downloadSize = metrics['download-size'];
    
    if (networkTime && downloadSize) {
      const avgSpeed = (downloadSize.avg / networkTime.avg * 8 / 1000).toFixed(2);
      
      console.log('Network Performance:', {
        averageTime: networkTime.avg.toFixed(2) + 'ms',
        averageSpeed: avgSpeed + 'Mbps',
      });
    }
  }
  
  private checkPerformanceAlerts(metrics: Record<string, any>): void {
    // Check for slow rendering
    const renderTime = metrics['render-time'];
    if (renderTime && renderTime.avg > 10000) { // > 10 seconds
      console.warn('Performance Alert: Slow rendering detected');
    }
    
    // Check for high memory usage
    const memoryUsage = metrics['memory-usage'];
    if (memoryUsage && memoryUsage.avg > 200 * 1024 * 1024) { // > 200MB
      console.warn('Performance Alert: High memory usage detected');
    }
    
    // Check for network issues
    const networkTime = metrics['network-time'];
    if (networkTime && networkTime.avg > 30000) { // > 30 seconds
      console.warn('Performance Alert: Slow network detected');
    }
  }
}
```

## Benchmarking

### Performance Benchmarking Suite

```typescript
// Comprehensive benchmarking
class PDFPerformanceBenchmark {
  private testDocuments = [
    { name: 'Small Text', url: '/test-docs/small-text.pdf', size: 500 * 1024 },
    { name: 'Medium Mixed', url: '/test-docs/medium-mixed.pdf', size: 5 * 1024 * 1024 },
    { name: 'Large Images', url: '/test-docs/large-images.pdf', size: 20 * 1024 * 1024 },
    { name: 'Complex Forms', url: '/test-docs/complex-forms.pdf', size: 2 * 1024 * 1024 },
  ];
  
  async runBenchmarks(config: ReliabilityConfig): Promise<BenchmarkResults> {
    const results: BenchmarkResults = {
      config: config,
      timestamp: new Date(),
      results: [],
    };
    
    for (const doc of this.testDocuments) {
      console.log(`Benchmarking: ${doc.name}`);
      
      const docResults = await this.benchmarkDocument(doc, config);
      results.results.push(docResults);
      
      // Wait between tests to avoid interference
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }
  
  private async benchmarkDocument(
    doc: TestDocument,
    config: ReliabilityConfig
  ): Promise<DocumentBenchmarkResult> {
    const renderer = new ReliablePDFRenderer(config);
    const iterations = 5;
    const times: number[] = [];
    const memoryUsages: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      // Clear memory before each test
      if (window.gc) {
        window.gc();
      }
      
      const startMemory = this.getMemoryUsage();
      const startTime = performance.now();
      
      try {
        const result = await renderer.renderPDF(doc.url, {
          diagnosticsEnabled: true,
        });
        
        const endTime = performance.now();
        const endMemory = this.getMemoryUsage();
        
        if (result.success) {
          times.push(endTime - startTime);
          memoryUsages.push(endMemory - startMemory);
        }
      } catch (error) {
        console.error(`Benchmark iteration ${i} failed:`, error);
      }
      
      // Clean up
      renderer.cancelRendering(''); // Clean up any resources
    }
    
    return {
      document: doc,
      iterations: times.length,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      averageMemory: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      peakMemory: Math.max(...memoryUsages),
    };
  }
  
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance.memory as any).usedJSHeapSize;
    }
    return 0;
  }
  
  generateReport(results: BenchmarkResults): string {
    let report = `# PDF Rendering Performance Benchmark Report\n\n`;
    report += `**Date:** ${results.timestamp.toISOString()}\n\n`;
    
    report += `## Configuration\n`;
    report += `- Quality Preference: ${results.config.performance.rendering.qualityPreference}\n`;
    report += `- Memory Threshold: ${(results.config.performance.memory.pressureThreshold / 1024 / 1024).toFixed(0)}MB\n`;
    report += `- Max Concurrent Pages: ${results.config.performance.memory.maxConcurrentPages}\n\n`;
    
    report += `## Results\n\n`;
    report += `| Document | Avg Time | Min Time | Max Time | Avg Memory | Peak Memory |\n`;
    report += `|----------|----------|----------|----------|------------|-------------|\n`;
    
    results.results.forEach(result => {
      const avgTime = (result.averageTime / 1000).toFixed(2);
      const minTime = (result.minTime / 1000).toFixed(2);
      const maxTime = (result.maxTime / 1000).toFixed(2);
      const avgMemory = (result.averageMemory / 1024 / 1024).toFixed(1);
      const peakMemory = (result.peakMemory / 1024 / 1024).toFixed(1);
      
      report += `| ${result.document.name} | ${avgTime}s | ${minTime}s | ${maxTime}s | ${avgMemory}MB | ${peakMemory}MB |\n`;
    });
    
    return report;
  }
}

interface TestDocument {
  name: string;
  url: string;
  size: number;
}

interface DocumentBenchmarkResult {
  document: TestDocument;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  averageMemory: number;
  peakMemory: number;
}

interface BenchmarkResults {
  config: ReliabilityConfig;
  timestamp: Date;
  results: DocumentBenchmarkResult[];
}
```

### Automated Performance Testing

```typescript
// Automated performance regression testing
class PerformanceRegressionTester {
  private baselineResults: BenchmarkResults | null = null;
  
  async setBaseline(config: ReliabilityConfig): Promise<void> {
    const benchmark = new PDFPerformanceBenchmark();
    this.baselineResults = await benchmark.runBenchmarks(config);
    
    console.log('Baseline performance established');
  }
  
  async testRegression(config: ReliabilityConfig): Promise<RegressionTestResult> {
    if (!this.baselineResults) {
      throw new Error('No baseline established');
    }
    
    const benchmark = new PDFPerformanceBenchmark();
    const currentResults = await benchmark.runBenchmarks(config);
    
    return this.compareResults(this.baselineResults, currentResults);
  }
  
  private compareResults(
    baseline: BenchmarkResults,
    current: BenchmarkResults
  ): RegressionTestResult {
    const regressions: PerformanceRegression[] = [];
    const improvements: PerformanceImprovement[] = [];
    
    baseline.results.forEach((baselineDoc, index) => {
      const currentDoc = current.results[index];
      
      if (currentDoc) {
        // Check time regression (> 20% slower)
        const timeRegression = (currentDoc.averageTime - baselineDoc.averageTime) / baselineDoc.averageTime;
        if (timeRegression > 0.2) {
          regressions.push({
            type: 'time',
            document: baselineDoc.document.name,
            baseline: baselineDoc.averageTime,
            current: currentDoc.averageTime,
            regression: timeRegression * 100,
          });
        } else if (timeRegression < -0.1) { // > 10% improvement
          improvements.push({
            type: 'time',
            document: baselineDoc.document.name,
            baseline: baselineDoc.averageTime,
            current: currentDoc.averageTime,
            improvement: Math.abs(timeRegression) * 100,
          });
        }
        
        // Check memory regression (> 30% more memory)
        const memoryRegression = (currentDoc.averageMemory - baselineDoc.averageMemory) / baselineDoc.averageMemory;
        if (memoryRegression > 0.3) {
          regressions.push({
            type: 'memory',
            document: baselineDoc.document.name,
            baseline: baselineDoc.averageMemory,
            current: currentDoc.averageMemory,
            regression: memoryRegression * 100,
          });
        }
      }
    });
    
    return {
      passed: regressions.length === 0,
      regressions,
      improvements,
      summary: this.generateRegressionSummary(regressions, improvements),
    };
  }
  
  private generateRegressionSummary(
    regressions: PerformanceRegression[],
    improvements: PerformanceImprovement[]
  ): string {
    let summary = '';
    
    if (regressions.length > 0) {
      summary += `❌ ${regressions.length} performance regression(s) detected:\n`;
      regressions.forEach(reg => {
        summary += `  - ${reg.document}: ${reg.type} regression of ${reg.regression.toFixed(1)}%\n`;
      });
    } else {
      summary += `✅ No performance regressions detected\n`;
    }
    
    if (improvements.length > 0) {
      summary += `\n🚀 ${improvements.length} performance improvement(s):\n`;
      improvements.forEach(imp => {
        summary += `  - ${imp.document}: ${imp.type} improvement of ${imp.improvement.toFixed(1)}%\n`;
      });
    }
    
    return summary;
  }
}

interface PerformanceRegression {
  type: 'time' | 'memory';
  document: string;
  baseline: number;
  current: number;
  regression: number; // Percentage
}

interface PerformanceImprovement {
  type: 'time' | 'memory';
  document: string;
  baseline: number;
  current: number;
  improvement: number; // Percentage
}

interface RegressionTestResult {
  passed: boolean;
  regressions: PerformanceRegression[];
  improvements: PerformanceImprovement[];
  summary: string;
}
```

## Production Optimization

### Production Configuration Template

```typescript
// Production-optimized configuration
export const PRODUCTION_CONFIG = createReliabilityConfig({
  // Enable only essential features for production
  features: {
    enablePDFJSCanvas: true,
    enableNativeBrowser: true,
    enableServerConversion: true,
    enableImageBased: false, // Disable slower fallbacks
    enableDownloadFallback: true,
    enableAutoMethodSelection: true,
    enablePerformanceMonitoring: true,
    enableErrorReporting: true,
    enableUserFeedback: false, // Privacy consideration
    enableMethodCaching: true,
  },
  
  // Optimized timeouts for production
  timeouts: {
    default: 20000, // 20 seconds
    network: 10000, // 10 seconds
    parsing: 8000,  // 8 seconds
    rendering: 15000, // 15 seconds
    fallback: 3000, // Quick fallback
    progressive: {
      enabled: true,
      multiplier: 1.5,
      maxTimeout: 60000, // 1 minute max
    },
  },
  
  // Conservative retry strategy
  retries: {
    maxAttempts: 2,
    baseDelay: 1000,
    exponentialBackoff: {
      enabled: true,
      multiplier: 2,
      maxDelay: 10000,
    },
    retryOn: {
      networkErrors: true,
      timeoutErrors: true,
      canvasErrors: true,
      memoryErrors: true,
      parsingErrors: false,
    },
  },
  
  // Minimal diagnostics for production
  diagnostics: {
    level: DiagnosticLevel.ERROR,
    collectPerformanceMetrics: true,
    collectStackTraces: false, // Privacy/performance
    collectBrowserInfo: true,
    collectUserInteractions: false,
    maxEntries: 50,
    autoExport: {
      enabled: true,
      threshold: 5,
      endpoint: process.env.DIAGNOSTICS_ENDPOINT,
    },
  },
  
  // Production-tuned performance
  performance: {
    memory: {
      pressureThreshold: 100 * 1024 * 1024, // 100MB
      gcThreshold: 50 * 1024 * 1024, // 50MB
      canvasCleanup: 'standard',
      maxConcurrentPages: 3,
    },
    progress: {
      updateInterval: 2000, // Less frequent updates
      stuckThreshold: 10000, // 10 seconds
      calculationMethod: 'weighted',
    },
    rendering: {
      canvasOptimization: true,
      viewportCaching: true,
      lazyLoadingThreshold: 2,
      qualityPreference: 'speed', // Prioritize speed in production
    },
    network: {
      connectionPooling: true,
      requestBatching: false,
      prefetchStrategy: 'next-page',
      compressionPreference: 'gzip',
    },
  },
});
```

### Performance Monitoring in Production

```typescript
// Production performance monitoring
class ProductionPerformanceMonitor {
  private metricsEndpoint: string;
  private batchSize = 10;
  private batchTimeout = 30000; // 30 seconds
  private metricsBatch: PerformanceMetric[] = [];
  private batchTimer?: NodeJS.Timeout;
  
  constructor(metricsEndpoint: string) {
    this.metricsEndpoint = metricsEndpoint;
    this.startBatchTimer();
  }
  
  recordMetric(metric: PerformanceMetric): void {
    this.metricsBatch.push(metric);
    
    if (this.metricsBatch.length >= this.batchSize) {
      this.flushMetrics();
    }
  }
  
  private startBatchTimer(): void {
    this.batchTimer = setTimeout(() => {
      if (this.metricsBatch.length > 0) {
        this.flushMetrics();
      }
      this.startBatchTimer();
    }, this.batchTimeout);
  }
  
  private async flushMetrics(): Promise<void> {
    if (this.metricsBatch.length === 0) return;
    
    const batch = [...this.metricsBatch];
    this.metricsBatch = [];
    
    try {
      await fetch(this.metricsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          metrics: batch,
        }),
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Re-add metrics to batch for retry
      this.metricsBatch.unshift(...batch);
    }
  }
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}
```

This comprehensive performance tuning guide provides the foundation for optimizing the PDF Rendering Reliability Fix system across different environments, document types, and use cases. Regular monitoring and benchmarking will help maintain optimal performance as the system evolves.