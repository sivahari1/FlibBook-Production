# PDF Rendering Reliability Fix - Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for the PDF Rendering Reliability Fix system. It covers common issues, diagnostic procedures, and resolution strategies for developers and system administrators.

## Table of Contents

- [Quick Diagnosis](#quick-diagnosis)
- [Common Issues](#common-issues)
- [Error Categories](#error-categories)
- [Diagnostic Tools](#diagnostic-tools)
- [Performance Issues](#performance-issues)
- [Configuration Problems](#configuration-problems)
- [Browser-Specific Issues](#browser-specific-issues)
- [Network and Authentication](#network-and-authentication)
- [Memory and Resource Issues](#memory-and-resource-issues)
- [Advanced Debugging](#advanced-debugging)

## Quick Diagnosis

### Immediate Checks

1. **Check Browser Console**: Look for JavaScript errors or warnings
2. **Verify Network**: Ensure stable internet connection
3. **Test Different Document**: Try with a known-good PDF
4. **Clear Cache**: Clear browser cache and reload
5. **Check Configuration**: Verify reliability system configuration

### Quick Fixes

```bash
# Clear browser cache
# Chrome: Ctrl+Shift+Delete
# Firefox: Ctrl+Shift+Delete
# Safari: Cmd+Option+E

# Check network connectivity
curl -I https://your-pdf-url.com/document.pdf

# Verify PDF file integrity
file document.pdf
```

### Diagnostic Commands

```typescript
// Enable verbose diagnostics
const config = createReliabilityConfig({
  diagnostics: {
    level: DiagnosticLevel.VERBOSE,
    collectPerformanceMetrics: true,
    collectStackTraces: true,
  },
});

// Test rendering with diagnostics
const result = await renderer.renderPDF(url, { diagnosticsEnabled: true });
console.log('Diagnostics:', result.diagnostics);
```

## Common Issues

### 1. PDF Stuck at Loading

**Symptoms:**
- Progress bar stops at high percentage (90%+)
- No error message displayed
- Browser remains responsive

**Diagnosis:**
```typescript
// Check if stuck detection is working
const progress = renderer.getProgress(renderingId);
if (progress?.isStuck) {
  console.log('Stuck detection active');
  console.log('Time elapsed:', progress.timeElapsed);
  console.log('Last update:', progress.lastUpdate);
}
```

**Solutions:**
1. **Force Retry**: Use the force retry mechanism
   ```typescript
   renderer.forceRetry(renderingId);
   ```

2. **Check Stuck Threshold**: Adjust detection sensitivity
   ```typescript
   const config = createReliabilityConfig({
     performance: {
       progress: {
         stuckThreshold: 5000, // 5 seconds instead of 10
       },
     },
   });
   ```

3. **Enable Alternative Methods**: Ensure fallbacks are enabled
   ```typescript
   const options = {
     fallbackEnabled: true,
     preferredMethod: RenderingMethod.NATIVE_BROWSER,
   };
   ```

### 2. Network Timeout Errors

**Symptoms:**
- "Network timeout" error messages
- Intermittent loading failures
- Slow document loading

**Diagnosis:**
```typescript
// Check network timing
const diagnostics = result.diagnostics;
console.log('Network time:', diagnostics.performanceMetrics.networkTime);
console.log('Total time:', diagnostics.totalTime);

// Test network resilience
const networkLayer = new NetworkResilienceLayer(config);
try {
  const response = await networkLayer.fetchWithResilience(url);
  console.log('Network test successful');
} catch (error) {
  console.log('Network test failed:', error);
}
```

**Solutions:**
1. **Increase Timeouts**: Configure longer timeouts
   ```typescript
   const config = createReliabilityConfig({
     timeouts: {
       default: 60000,  // 1 minute
       network: 30000,  // 30 seconds
       progressive: {
         enabled: true,
         multiplier: 2,
         maxTimeout: 180000, // 3 minutes max
       },
     },
   });
   ```

2. **Enable Progressive Timeouts**: Automatically increase timeouts
   ```typescript
   const config = createReliabilityConfig({
     timeouts: {
       progressive: {
         enabled: true,
         multiplier: 1.5,
         maxTimeout: 120000,
       },
     },
   });
   ```

3. **Configure Retry Logic**: Adjust retry behavior
   ```typescript
   const config = createReliabilityConfig({
     retries: {
       maxAttempts: 5,
       exponentialBackoff: {
         enabled: true,
         multiplier: 2,
         maxDelay: 30000,
       },
     },
   });
   ```

### 3. Memory-Related Crashes

**Symptoms:**
- Browser becomes unresponsive
- "Out of memory" errors
- Tab crashes during PDF loading

**Diagnosis:**
```typescript
// Check memory usage
const canvasManager = new CanvasManager(config);
const memoryPressure = canvasManager.checkMemoryPressure();
console.log('Memory pressure detected:', memoryPressure);

// Monitor memory metrics
const diagnostics = result.diagnostics;
console.log('Memory usage:', diagnostics.performanceMetrics.memoryUsage);
```

**Solutions:**
1. **Aggressive Memory Management**: Enable aggressive cleanup
   ```typescript
   const config = createReliabilityConfig({
     performance: {
       memory: {
         canvasCleanup: 'aggressive',
         maxConcurrentPages: 2,
         pressureThreshold: 50 * 1024 * 1024, // 50MB
       },
     },
   });
   ```

2. **Limit Concurrent Pages**: Reduce memory usage
   ```typescript
   const options = {
     typeSpecific: {
       memoryManagement: 'aggressive',
       maxConcurrentPages: 1,
     },
   };
   ```

3. **Enable Memory Monitoring**: Track memory usage
   ```typescript
   const config = createReliabilityConfig({
     features: {
       enablePerformanceMonitoring: true,
     },
     diagnostics: {
       collectPerformanceMetrics: true,
     },
   });
   ```

### 4. Authentication Failures

**Symptoms:**
- "Access denied" errors
- "Authentication failed" messages
- 401/403 HTTP status codes

**Diagnosis:**
```typescript
// Check authentication error details
if (result.error?.type === ErrorType.AUTHENTICATION_ERROR) {
  console.log('Auth error context:', result.error.context);
  console.log('Error timestamp:', result.error.timestamp);
}

// Test URL accessibility
fetch(url, { method: 'HEAD' })
  .then(response => {
    console.log('URL status:', response.status);
    console.log('Headers:', response.headers);
  })
  .catch(error => {
    console.log('URL test failed:', error);
  });
```

**Solutions:**
1. **Enable URL Refresh**: Automatic signed URL renewal
   ```typescript
   const networkLayer = new NetworkResilienceLayer(config);
   const refreshedUrl = await networkLayer.refreshSignedURL(originalUrl);
   ```

2. **Configure Auth Retry**: Retry on auth failures
   ```typescript
   const config = createReliabilityConfig({
     retries: {
       retryOn: {
         networkErrors: true,
         authenticationErrors: true, // Custom addition
       },
     },
   });
   ```

3. **Check URL Expiration**: Validate signed URL timing
   ```typescript
   // Extract expiration from signed URL
   const urlParams = new URLSearchParams(new URL(url).search);
   const expires = urlParams.get('expires');
   if (expires && Date.now() > parseInt(expires) * 1000) {
     console.log('URL has expired');
   }
   ```

## Error Categories

### Network Errors

**Error Type**: `NETWORK_ERROR`

**Common Causes:**
- Internet connectivity issues
- Server downtime
- DNS resolution failures
- Firewall blocking

**Diagnostic Steps:**
```typescript
// Test basic connectivity
navigator.onLine; // Check if browser thinks it's online

// Test specific URL
fetch(url, { method: 'HEAD', mode: 'no-cors' })
  .then(() => console.log('URL accessible'))
  .catch(error => console.log('URL not accessible:', error));

// Check CORS headers
fetch(url)
  .then(response => {
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
    });
  });
```

**Resolution:**
1. Verify network connectivity
2. Check server status
3. Validate CORS configuration
4. Test from different network

### Parsing Errors

**Error Type**: `PARSING_ERROR`

**Common Causes:**
- Corrupted PDF files
- Unsupported PDF features
- Invalid PDF structure
- Encoding issues

**Diagnostic Steps:**
```typescript
// Test PDF validity
const documentTypeHandler = new DocumentTypeHandler(config);
const characteristics = await documentTypeHandler.analyzeDocument(url);
console.log('Document analysis:', characteristics);

// Check PDF structure
if (characteristics.isCorrupted) {
  console.log('PDF appears corrupted');
}
if (characteristics.isPasswordProtected) {
  console.log('PDF requires password');
}
```

**Resolution:**
1. Validate PDF file integrity
2. Try alternative parsing methods
3. Check for password protection
4. Use server-side conversion fallback

### Canvas Errors

**Error Type**: `CANVAS_ERROR`

**Common Causes:**
- Canvas size limitations
- WebGL context loss
- Browser canvas bugs
- Memory constraints

**Diagnostic Steps:**
```typescript
// Test canvas creation
const canvasManager = new CanvasManager(config);
try {
  const canvas = canvasManager.createCanvas(1920, 1080);
  const context = canvasManager.getContext(canvas);
  if (!context) {
    console.log('Canvas context creation failed');
  }
} catch (error) {
  console.log('Canvas creation failed:', error);
}

// Check canvas limits
const maxSize = 32767; // Common browser limit
console.log('Canvas size limit test:', maxSize);
```

**Resolution:**
1. Reduce canvas dimensions
2. Recreate canvas context
3. Clear canvas memory
4. Use alternative rendering method

### Memory Errors

**Error Type**: `MEMORY_ERROR`

**Common Causes:**
- Insufficient system memory
- Memory leaks
- Large document size
- Multiple concurrent renders

**Diagnostic Steps:**
```typescript
// Monitor memory usage
if ('memory' in performance) {
  const memInfo = performance.memory;
  console.log('Memory usage:', {
    used: memInfo.usedJSHeapSize,
    total: memInfo.totalJSHeapSize,
    limit: memInfo.jsHeapSizeLimit,
  });
}

// Check memory pressure
const canvasManager = new CanvasManager(config);
const pressure = canvasManager.checkMemoryPressure();
console.log('Memory pressure:', pressure);
```

**Resolution:**
1. Enable aggressive memory management
2. Reduce concurrent operations
3. Clear unused resources
4. Use streaming for large files

## Diagnostic Tools

### Built-in Diagnostics

```typescript
// Enable comprehensive diagnostics
const config = createReliabilityConfig({
  diagnostics: {
    level: DiagnosticLevel.VERBOSE,
    collectPerformanceMetrics: true,
    collectStackTraces: true,
    collectBrowserInfo: true,
    maxEntries: 1000,
  },
});

// Access diagnostic data
const result = await renderer.renderPDF(url, { diagnosticsEnabled: true });
const diagnostics = result.diagnostics;

console.log('Rendering diagnostics:', {
  method: diagnostics.method,
  totalTime: diagnostics.totalTime,
  errors: diagnostics.errors,
  performance: diagnostics.performanceMetrics,
  browser: diagnostics.browserInfo,
});
```

### Custom Diagnostic Collection

```typescript
// Create custom diagnostic collector
class CustomDiagnostics extends DiagnosticsCollector {
  collectCustomMetrics(renderingId: string) {
    // Add custom metrics collection
    const metrics = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
      } : null,
    };
    
    this.addCustomData(renderingId, 'environment', metrics);
  }
}
```

### Performance Profiling

```typescript
// Profile rendering performance
const startTime = performance.now();

const result = await renderer.renderPDF(url, {
  diagnosticsEnabled: true,
});

const endTime = performance.now();
const totalTime = endTime - startTime;

console.log('Performance profile:', {
  totalTime,
  networkTime: result.diagnostics.performanceMetrics.networkTime,
  parseTime: result.diagnostics.performanceMetrics.parseTime,
  renderTime: result.diagnostics.performanceMetrics.renderTime,
  efficiency: (result.diagnostics.performanceMetrics.renderTime / totalTime) * 100,
});
```

### Error Analysis

```typescript
// Analyze error patterns
function analyzeErrors(diagnostics: DiagnosticsData) {
  const errorsByType = diagnostics.errors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorsByStage = diagnostics.errors.reduce((acc, error) => {
    acc[error.stage] = (acc[error.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalErrors: diagnostics.errors.length,
    errorsByType,
    errorsByStage,
    recoverableErrors: diagnostics.errors.filter(e => e.recoverable).length,
  };
}
```

## Performance Issues

### Slow Loading

**Symptoms:**
- Loading takes longer than expected
- Progress updates slowly
- High CPU usage

**Diagnosis:**
```typescript
// Measure loading performance
const performanceObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    if (entry.name.includes('pdf-render')) {
      console.log('Performance entry:', entry);
    }
  });
});
performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });

// Check document characteristics
const characteristics = await documentTypeHandler.analyzeDocument(url);
console.log('Document size:', characteristics.sizeBytes);
console.log('Document type:', characteristics.type);
console.log('Page count:', characteristics.pageCount);
```

**Solutions:**
1. **Optimize for Document Type**: Use type-specific settings
   ```typescript
   const optimizedOptions = documentTypeHandler.getOptimizedOptions(
     characteristics,
     baseOptions
   );
   ```

2. **Enable Streaming**: For large documents
   ```typescript
   const options = {
     typeSpecific: {
       enableStreaming: true,
       maxConcurrentPages: 3,
     },
   };
   ```

3. **Adjust Quality Settings**: Balance quality vs speed
   ```typescript
   const config = createReliabilityConfig({
     performance: {
       rendering: {
         qualityPreference: 'speed',
         canvasOptimization: true,
       },
     },
   });
   ```

### High Memory Usage

**Symptoms:**
- Browser becomes sluggish
- Memory usage increases continuously
- System becomes unresponsive

**Diagnosis:**
```typescript
// Monitor memory trends
let memoryHistory = [];
setInterval(() => {
  if ('memory' in performance) {
    const memInfo = performance.memory;
    memoryHistory.push({
      timestamp: Date.now(),
      used: memInfo.usedJSHeapSize,
      total: memInfo.totalJSHeapSize,
    });
    
    // Keep only last 10 measurements
    if (memoryHistory.length > 10) {
      memoryHistory = memoryHistory.slice(-10);
    }
    
    // Check for memory leaks
    const trend = memoryHistory.length > 5 ? 
      memoryHistory[memoryHistory.length - 1].used - memoryHistory[0].used : 0;
    
    if (trend > 50 * 1024 * 1024) { // 50MB increase
      console.warn('Potential memory leak detected');
    }
  }
}, 5000);
```

**Solutions:**
1. **Enable Aggressive Cleanup**: Force garbage collection
   ```typescript
   const config = createReliabilityConfig({
     performance: {
       memory: {
         canvasCleanup: 'aggressive',
         gcThreshold: 25 * 1024 * 1024, // 25MB
       },
     },
   });
   ```

2. **Limit Concurrent Operations**: Reduce memory pressure
   ```typescript
   const options = {
     typeSpecific: {
       maxConcurrentPages: 1,
       memoryManagement: 'aggressive',
     },
   };
   ```

3. **Manual Cleanup**: Force resource cleanup
   ```typescript
   // Manual cleanup after rendering
   renderer.cancelRendering(renderingId);
   canvasManager.cleanupUnusedCanvases();
   ```

## Configuration Problems

### Invalid Configuration

**Symptoms:**
- Configuration warnings in console
- Unexpected behavior
- Feature not working as expected

**Diagnosis:**
```typescript
// Validate configuration
import { validateReliabilityConfig } from '@/lib/pdf-reliability';

const config = createReliabilityConfig(userConfig);
const validatedConfig = validateReliabilityConfig(config);

// Check for validation warnings
console.log('Configuration validation complete');

// Test specific features
console.log('Feature flags:', config.features);
console.log('Timeouts:', config.timeouts);
console.log('Performance settings:', config.performance);
```

**Solutions:**
1. **Use Configuration Validation**: Always validate config
   ```typescript
   const config = createReliabilityConfig({
     // Your configuration
   });
   
   // Validation happens automatically
   ```

2. **Check Environment Overrides**: Verify environment settings
   ```typescript
   import { getEnvironmentConfig } from '@/lib/pdf-reliability';
   
   const envConfig = getEnvironmentConfig();
   console.log('Environment overrides:', envConfig);
   ```

3. **Reset to Defaults**: Use known-good configuration
   ```typescript
   import { DEFAULT_RELIABILITY_CONFIG } from '@/lib/pdf-reliability';
   
   const config = { ...DEFAULT_RELIABILITY_CONFIG };
   ```

### Feature Flag Issues

**Symptoms:**
- Expected features not available
- Fallback methods not working
- Performance features disabled

**Diagnosis:**
```typescript
// Check feature flag status
const config = renderer.getConfig(); // Hypothetical method
console.log('Feature flags:', {
  pdfjs: config.features.enablePDFJSCanvas,
  native: config.features.enableNativeBrowser,
  server: config.features.enableServerConversion,
  fallbacks: config.features.enableDownloadFallback,
});

// Test feature availability
const capabilities = detectBrowserCapabilities();
console.log('Browser capabilities:', capabilities);
```

**Solutions:**
1. **Enable Required Features**: Ensure necessary features are enabled
   ```typescript
   const config = createReliabilityConfig({
     features: {
       enablePDFJSCanvas: true,
       enableNativeBrowser: true,
       enableServerConversion: true,
       enableDownloadFallback: true,
     },
   });
   ```

2. **Check Environment Variables**: Verify environment overrides
   ```bash
   # Check for feature flag environment variables
   echo $DISABLE_PDFJS_CANVAS
   echo $DISABLE_NATIVE_BROWSER
   echo $ENABLE_USER_FEEDBACK
   ```

3. **Browser Compatibility**: Adjust for browser limitations
   ```typescript
   const config = createReliabilityConfig({
     features: {
       enablePDFJSCanvas: capabilities.supportsPDFJS,
       enableNativeBrowser: capabilities.supportsNativePDF,
       enableServerConversion: !capabilities.supportsPDFJS,
     },
   });
   ```

## Browser-Specific Issues

### Chrome Issues

**Common Problems:**
- PDF.js worker loading failures
- Canvas memory limits
- Extension conflicts

**Diagnosis:**
```typescript
// Check Chrome-specific features
const isChrome = navigator.userAgent.includes('Chrome');
if (isChrome) {
  console.log('Chrome version:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
  
  // Check for extension conflicts
  if (window.chrome && window.chrome.runtime) {
    console.log('Chrome extensions detected');
  }
}
```

**Solutions:**
1. **Clear Chrome Cache**: Force cache refresh
2. **Disable Extensions**: Test without extensions
3. **Update Chrome**: Ensure latest version
4. **Check Worker Loading**: Verify PDF.js worker

### Firefox Issues

**Common Problems:**
- Native PDF viewer conflicts
- WebGL context issues
- Memory management differences

**Diagnosis:**
```typescript
// Check Firefox-specific features
const isFirefox = navigator.userAgent.includes('Firefox');
if (isFirefox) {
  console.log('Firefox version:', navigator.userAgent.match(/Firefox\/(\d+)/)?.[1]);
  
  // Check PDF viewer preference
  console.log('PDF viewer preference may need adjustment');
}
```

**Solutions:**
1. **Disable Native PDF Viewer**: In Firefox preferences
2. **Force PDF.js**: Use PDF.js rendering method
3. **Adjust Memory Settings**: Use conservative memory management

### Safari Issues

**Common Problems:**
- Limited PDF.js support
- WebKit rendering differences
- iOS memory constraints

**Diagnosis:**
```typescript
// Check Safari-specific features
const isSafari = navigator.userAgent.includes('Safari') && 
                !navigator.userAgent.includes('Chrome');
if (isSafari) {
  console.log('Safari detected');
  
  // Check iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  console.log('iOS device:', isIOS);
}
```

**Solutions:**
1. **Use Server Conversion**: Primary method for Safari
2. **Reduce Memory Usage**: Aggressive memory management
3. **Simplify Rendering**: Use basic rendering options

## Network and Authentication

### CORS Issues

**Symptoms:**
- "CORS policy" errors in console
- Network requests blocked
- Authentication failures

**Diagnosis:**
```typescript
// Test CORS configuration
fetch(url, {
  method: 'HEAD',
  mode: 'cors',
})
.then(response => {
  console.log('CORS test successful');
  console.log('Access-Control headers:', {
    origin: response.headers.get('Access-Control-Allow-Origin'),
    methods: response.headers.get('Access-Control-Allow-Methods'),
    headers: response.headers.get('Access-Control-Allow-Headers'),
  });
})
.catch(error => {
  console.log('CORS test failed:', error);
});
```

**Solutions:**
1. **Configure Server CORS**: Add proper CORS headers
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, HEAD, OPTIONS
   Access-Control-Allow-Headers: Authorization, Content-Type
   ```

2. **Use Proxy**: Route requests through same-origin proxy
3. **Server-side Rendering**: Use server-side conversion method

### Signed URL Issues

**Symptoms:**
- URLs expire during loading
- Authentication errors mid-stream
- Inconsistent access

**Diagnosis:**
```typescript
// Check URL expiration
function checkURLExpiration(url: string) {
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get('expires') || 
                   urlObj.searchParams.get('Expires');
    
    if (expires) {
      const expirationTime = parseInt(expires) * 1000;
      const timeUntilExpiry = expirationTime - Date.now();
      
      console.log('URL expires in:', timeUntilExpiry / 1000, 'seconds');
      
      if (timeUntilExpiry < 0) {
        console.log('URL has already expired');
        return false;
      }
      
      if (timeUntilExpiry < 60000) { // Less than 1 minute
        console.log('URL expires soon, consider refreshing');
      }
    }
    
    return true;
  } catch (error) {
    console.log('Error checking URL expiration:', error);
    return false;
  }
}
```

**Solutions:**
1. **Increase URL Lifetime**: Generate longer-lived URLs
2. **Implement Refresh**: Automatic URL refresh mechanism
3. **Pre-emptive Refresh**: Refresh before expiration

## Memory and Resource Issues

### Canvas Memory Management

**Symptoms:**
- Canvas creation failures
- Memory usage spikes
- Browser crashes

**Diagnosis:**
```typescript
// Test canvas limits
function testCanvasLimits() {
  const testSizes = [
    [1920, 1080],
    [3840, 2160],
    [7680, 4320],
    [15360, 8640],
  ];
  
  testSizes.forEach(([width, height]) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      
      if (context) {
        console.log(`Canvas ${width}x${height}: OK`);
      } else {
        console.log(`Canvas ${width}x${height}: Context creation failed`);
      }
    } catch (error) {
      console.log(`Canvas ${width}x${height}: Failed -`, error.message);
    }
  });
}
```

**Solutions:**
1. **Limit Canvas Size**: Stay within browser limits
   ```typescript
   const MAX_CANVAS_SIZE = 16384; // Safe limit for most browsers
   
   const config = createReliabilityConfig({
     performance: {
       rendering: {
         maxCanvasWidth: MAX_CANVAS_SIZE,
         maxCanvasHeight: MAX_CANVAS_SIZE,
       },
     },
   });
   ```

2. **Implement Canvas Pooling**: Reuse canvas elements
   ```typescript
   class CanvasPool {
     private pool: HTMLCanvasElement[] = [];
     
     getCanvas(width: number, height: number): HTMLCanvasElement {
       const canvas = this.pool.pop() || document.createElement('canvas');
       canvas.width = width;
       canvas.height = height;
       return canvas;
     }
     
     returnCanvas(canvas: HTMLCanvasElement): void {
       const context = canvas.getContext('2d');
       if (context) {
         context.clearRect(0, 0, canvas.width, canvas.height);
       }
       this.pool.push(canvas);
     }
   }
   ```

3. **Monitor Memory Usage**: Track and limit usage
   ```typescript
   function monitorMemoryUsage() {
     if ('memory' in performance) {
       const memInfo = performance.memory;
       const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
       
       if (usagePercent > 80) {
         console.warn('High memory usage detected:', usagePercent.toFixed(1) + '%');
         // Trigger cleanup
         canvasManager.cleanupUnusedCanvases();
       }
     }
   }
   ```

### Resource Cleanup

**Symptoms:**
- Memory leaks
- Accumulating resources
- Performance degradation over time

**Diagnosis:**
```typescript
// Track resource usage
class ResourceTracker {
  private resources = new Map<string, any>();
  
  track(id: string, resource: any) {
    this.resources.set(id, {
      resource,
      created: Date.now(),
      type: resource.constructor.name,
    });
  }
  
  untrack(id: string) {
    this.resources.delete(id);
  }
  
  getStats() {
    const stats = {
      total: this.resources.size,
      byType: {} as Record<string, number>,
      oldResources: 0,
    };
    
    const now = Date.now();
    this.resources.forEach((info) => {
      stats.byType[info.type] = (stats.byType[info.type] || 0) + 1;
      
      if (now - info.created > 300000) { // 5 minutes
        stats.oldResources++;
      }
    });
    
    return stats;
  }
}
```

**Solutions:**
1. **Implement Automatic Cleanup**: Regular resource cleanup
   ```typescript
   setInterval(() => {
     canvasManager.cleanupUnusedCanvases();
     progressTracker.cleanupOldProgress();
     diagnosticsCollector.cleanupOldDiagnostics();
   }, 60000); // Every minute
   ```

2. **Use WeakMap for References**: Automatic garbage collection
   ```typescript
   class ResourceManager {
     private resources = new WeakMap<object, any>();
     
     associate(object: object, resource: any) {
       this.resources.set(object, resource);
     }
     
     // Resources automatically cleaned up when object is garbage collected
   }
   ```

3. **Implement Resource Limits**: Prevent resource accumulation
   ```typescript
   const config = createReliabilityConfig({
     performance: {
       memory: {
         maxCanvasElements: 10,
         maxDiagnosticEntries: 100,
         cleanupInterval: 30000, // 30 seconds
       },
     },
   });
   ```

## Advanced Debugging

### Performance Profiling

```typescript
// Comprehensive performance profiling
class PerformanceProfiler {
  private marks = new Map<string, number>();
  private measures = new Map<string, number>();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
    performance.mark(name);
  }
  
  measure(name: string, startMark: string, endMark?: string) {
    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    const startTime = this.marks.get(startMark);
    
    if (startTime && endTime) {
      const duration = endTime - startTime;
      this.measures.set(name, duration);
      performance.measure(name, startMark, endMark);
      return duration;
    }
    
    return null;
  }
  
  getProfile() {
    return {
      marks: Object.fromEntries(this.marks),
      measures: Object.fromEntries(this.measures),
    };
  }
}

// Usage
const profiler = new PerformanceProfiler();

profiler.mark('render-start');
const result = await renderer.renderPDF(url);
profiler.mark('render-end');

const renderTime = profiler.measure('total-render', 'render-start', 'render-end');
console.log('Render time:', renderTime, 'ms');
```

### Error Pattern Analysis

```typescript
// Analyze error patterns across multiple renders
class ErrorAnalyzer {
  private errorHistory: RenderError[] = [];
  
  addError(error: RenderError) {
    this.errorHistory.push(error);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
  }
  
  analyzePatterns() {
    const patterns = {
      frequentErrors: this.getMostFrequentErrors(),
      errorTrends: this.getErrorTrends(),
      recoveryRates: this.getRecoveryRates(),
      timePatterns: this.getTimePatterns(),
    };
    
    return patterns;
  }
  
  private getMostFrequentErrors() {
    const errorCounts = this.errorHistory.reduce((acc, error) => {
      const key = `${error.type}-${error.stage}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }
  
  private getRecoveryRates() {
    const recoverable = this.errorHistory.filter(e => e.recoverable).length;
    const total = this.errorHistory.length;
    
    return {
      recoverable,
      total,
      rate: total > 0 ? (recoverable / total) * 100 : 0,
    };
  }
}
```

### Network Analysis

```typescript
// Analyze network performance and issues
class NetworkAnalyzer {
  async analyzeURL(url: string) {
    const analysis = {
      accessibility: false,
      responseTime: 0,
      contentLength: 0,
      contentType: '',
      cacheHeaders: {},
      corsHeaders: {},
      errors: [] as string[],
    };
    
    try {
      const startTime = performance.now();
      const response = await fetch(url, { method: 'HEAD' });
      const endTime = performance.now();
      
      analysis.accessibility = response.ok;
      analysis.responseTime = endTime - startTime;
      analysis.contentLength = parseInt(response.headers.get('content-length') || '0');
      analysis.contentType = response.headers.get('content-type') || '';
      
      // Analyze cache headers
      analysis.cacheHeaders = {
        'cache-control': response.headers.get('cache-control'),
        'expires': response.headers.get('expires'),
        'etag': response.headers.get('etag'),
        'last-modified': response.headers.get('last-modified'),
      };
      
      // Analyze CORS headers
      analysis.corsHeaders = {
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      };
      
    } catch (error) {
      analysis.errors.push(error instanceof Error ? error.message : String(error));
    }
    
    return analysis;
  }
  
  async testNetworkResilience(url: string) {
    const tests = [
      { name: 'Basic fetch', test: () => fetch(url, { method: 'HEAD' }) },
      { name: 'With timeout', test: () => this.fetchWithTimeout(url, 5000) },
      { name: 'With retry', test: () => this.fetchWithRetry(url, 3) },
    ];
    
    const results = [];
    
    for (const { name, test } of tests) {
      try {
        const startTime = performance.now();
        await test();
        const endTime = performance.now();
        
        results.push({
          name,
          success: true,
          time: endTime - startTime,
        });
      } catch (error) {
        results.push({
          name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    
    return results;
  }
  
  private async fetchWithTimeout(url: string, timeout: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  private async fetchWithRetry(url: string, maxRetries: number) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fetch(url, { method: 'HEAD' });
      } catch (error) {
        lastError = error;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }
}
```

This comprehensive troubleshooting guide provides developers and system administrators with the tools and knowledge needed to diagnose and resolve issues with the PDF Rendering Reliability Fix system. Regular use of these diagnostic techniques will help maintain optimal performance and reliability.