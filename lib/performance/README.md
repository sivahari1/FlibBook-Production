# Performance Optimization Module

This module provides comprehensive performance optimization utilities for the Flipbook Media Annotations feature.

## Overview

The performance optimization module implements five key optimization strategies:

1. **Page Loading Optimization** - Lazy loading and intelligent preloading
2. **Caching Strategies** - Multi-level caching for pages and annotations
3. **Media Streaming Optimization** - Adaptive bitrate and buffering
4. **Memory Management** - Efficient memory usage and leak prevention
5. **Mobile Optimization** - Device-specific performance tuning

## Requirements Satisfied

- **17.1**: Page conversion < 5 seconds per document
- **17.2**: Annotation loading < 1 second
- **17.3**: Page load time < 2 seconds
- **17.4**: Cached pages with 7-day TTL
- **17.5**: Smooth animations on all devices
- **20.1**: Lazy loading with intersection observer
- **20.2**: Multi-level caching implementation
- **20.3**: Adaptive bitrate streaming
- **20.4**: Memory usage optimization
- **20.5**: Mobile performance tuning

## Modules

### 1. Page Loader (`page-loader.ts`)

Implements lazy loading and preloading strategies for flipbook pages.

**Features:**
- Intersection Observer for lazy loading
- Intelligent preloading of adjacent pages
- Image compression optimization
- WebP format support detection

**Usage:**
```typescript
import { PageLoader, usePageLoader } from '@/lib/performance';

// In a React component
const loader = usePageLoader({
  preloadAhead: 2,
  preloadBehind: 1,
  optimizeCompression: true,
});

// Register pages
loader.registerPages(pages);

// Observe element for lazy loading
loader.observe(element, pageNumber);

// Preload adjacent pages
await loader.preloadAdjacentPages(currentPage, totalPages);
```

**Configuration Options:**
- `preloadAhead`: Number of pages to preload ahead (default: 2)
- `preloadBehind`: Number of pages to preload behind (default: 1)
- `rootMargin`: Intersection observer root margin (default: '50px')
- `threshold`: Intersection observer threshold (default: 0.1)
- `optimizeCompression`: Enable image optimization (default: true)

### 2. Cache Manager (`cache-manager.ts`)

Implements multi-level caching for pages and annotations.

**Features:**
- LRU (Least Recently Used) cache implementation
- Separate caches for pages and annotations
- Configurable TTL (Time To Live)
- Cache invalidation strategies
- Browser cache headers helper

**Usage:**
```typescript
import { CacheManager, useCacheManager, BrowserCacheHeaders } from '@/lib/performance';

// In a React component
const cacheManager = useCacheManager({
  pageCacheTTL: 604800, // 7 days
  annotationCacheTTL: 300, // 5 minutes
  maxPagesInMemory: 50,
});

// Cache a page
cacheManager.cachePage(documentId, pageNumber, imageUrl);

// Get cached page
const cachedUrl = cacheManager.getCachedPage(documentId, pageNumber);

// Cache annotations
cacheManager.cacheAnnotations(documentId, pageNumber, annotations);

// Get cache statistics
const stats = cacheManager.getStats();

// In API routes - set cache headers
const headers = BrowserCacheHeaders.getPageImageHeaders();
```

**Cache TTL Defaults:**
- Page images: 7 days (604800 seconds)
- Annotations: 5 minutes (300 seconds)
- Media files: 1 hour (3600 seconds)

### 3. Media Optimizer (`media-optimizer.ts`)

Implements adaptive bitrate streaming and buffering strategies.

**Features:**
- Network quality detection
- Adaptive bitrate selection
- Buffering strategy optimization
- Mobile network optimization
- Playback monitoring

**Usage:**
```typescript
import { MediaOptimizer, useMediaOptimizer } from '@/lib/performance';

// In a React component
const mediaOptimizer = useMediaOptimizer({
  adaptiveBitrate: true,
  bufferSize: 10,
  mobileOptimization: true,
});

// Get optimal quality for current network
const quality = mediaOptimizer.getOptimalQuality();

// Get optimized media URL
const optimizedUrl = mediaOptimizer.getOptimizedMediaUrl(baseUrl, 'video');

// Get buffering strategy
const strategy = mediaOptimizer.getBufferingStrategy();

// Monitor playback and adjust quality
const cleanup = mediaOptimizer.monitorPlayback(videoElement);
```

**Quality Levels:**
- Low: 128 kbps, 360p
- Medium: 256 kbps, 480p
- High: 512 kbps, 720p
- HD: 1024 kbps, 1080p

**Network Quality Detection:**
- Poor: slow-2g, 2g, < 0.5 Mbps, > 500ms RTT
- Moderate: 3g, < 2 Mbps, > 200ms RTT
- Good: 4g, < 10 Mbps
- Excellent: > 10 Mbps

### 4. Memory Manager (`memory-manager.ts`)

Implements memory management and leak prevention.

**Features:**
- LRU-based page eviction
- Automatic cleanup
- Memory usage monitoring
- Memory leak detection
- Configurable memory limits

**Usage:**
```typescript
import { MemoryManager, useMemoryManager, MemoryLeakDetector } from '@/lib/performance';

// In a React component
const memoryManager = useMemoryManager({
  maxPagesInMemory: 10,
  keepAroundCurrent: 3,
  autoCleanup: true,
  cleanupInterval: 30000,
});

// Register a page
memoryManager.registerPage(pageNumber, imageUrl, imageElement);

// Update current page
memoryManager.setCurrentPage(pageNumber);

// Manual cleanup
memoryManager.cleanup(false); // Normal cleanup
memoryManager.cleanup(true);  // Aggressive cleanup

// Get memory statistics
const stats = memoryManager.getStats();

// Memory leak detection
const detector = new MemoryLeakDetector();
detector.takeSnapshot('before');
// ... perform operations
detector.takeSnapshot('after');
const result = detector.compareSnapshots('before', 'after');
```

**Memory Limits:**
- Default max pages in memory: 10
- Keep around current page: 3 pages (±3)
- Cleanup interval: 30 seconds
- Memory threshold: 100 MB

### 5. Mobile Optimizer (`mobile-optimizer.ts`)

Implements mobile-specific performance optimizations.

**Features:**
- Device capability detection
- Low-end device detection
- Animation optimization
- Touch event optimization
- Image quality adaptation

**Usage:**
```typescript
import { MobileOptimizer, useMobileOptimizer } from '@/lib/performance';

// In a React component
const mobileOptimizer = useMobileOptimizer({
  reduceAnimations: true,
  optimizeTouchEvents: true,
  detectLowEndDevice: true,
});

// Get device information
const deviceInfo = mobileOptimizer.getDeviceInfo();

// Get optimized animation duration
const duration = mobileOptimizer.getAnimationDuration(600);

// Get flipbook animation settings
const settings = mobileOptimizer.getFlipbookAnimationSettings();

// Create optimized touch handler
const touchHandler = mobileOptimizer.createTouchHandler(
  (event) => {
    // Handle touch event
  },
  { passive: true, debounce: true }
);

// Get image quality settings
const imageSettings = mobileOptimizer.getImageQualitySettings();

// Optimize element for performance
mobileOptimizer.optimizeElement(element);
```

**Device Performance Levels:**
- High: 8+ cores, 8+ GB RAM
- Medium: 4+ cores, 4+ GB RAM
- Low: ≤2 cores, ≤2 GB RAM, or low resolution

**Optimization Strategies:**
- Low-end devices: 50% animation speed, simple animations, no shadows
- Mobile devices: 70% animation speed, optimized touch events
- Desktop: Full animation speed, all effects enabled

## Performance Monitor Component

A React component for real-time performance monitoring.

**Usage:**
```typescript
import { PerformanceMonitor, PerformanceMonitorToggle } from '@/components/performance/PerformanceMonitor';

function MyApp() {
  const [showMonitor, setShowMonitor] = useState(false);

  return (
    <>
      <PerformanceMonitor
        showOverlay={showMonitor}
        updateInterval={1000}
        enableLogging={false}
      />
      <PerformanceMonitorToggle onToggle={setShowMonitor} />
    </>
  );
}
```

**Metrics Displayed:**
- Memory usage and cleanup statistics
- Cache utilization
- Network quality and type
- Device performance level
- FPS (frames per second)

## Integration Example

Complete integration example for FlipBookViewer:

```typescript
import { useEffect, useState } from 'react';
import {
  usePageLoader,
  useCacheManager,
  useMemoryManager,
  useMediaOptimizer,
  useMobileOptimizer,
} from '@/lib/performance';

function OptimizedFlipBookViewer({ documentId, pages }) {
  // Initialize performance utilities
  const pageLoader = usePageLoader();
  const cacheManager = useCacheManager();
  const memoryManager = useMemoryManager();
  const mediaOptimizer = useMediaOptimizer();
  const mobileOptimizer = useMobileOptimizer();

  const [currentPage, setCurrentPage] = useState(0);

  // Register pages for lazy loading
  useEffect(() => {
    pageLoader.registerPages(pages);
  }, [pages, pageLoader]);

  // Update memory manager on page change
  useEffect(() => {
    memoryManager.setCurrentPage(currentPage);
    
    // Preload adjacent pages
    pageLoader.preloadAdjacentPages(currentPage, pages.length);
  }, [currentPage, pages.length, memoryManager, pageLoader]);

  // Get optimized settings
  const animationSettings = mobileOptimizer.getFlipbookAnimationSettings();
  const imageSettings = mobileOptimizer.getImageQualitySettings();

  return (
    <FlipBookViewer
      documentId={documentId}
      pages={pages}
      flippingTime={animationSettings.flippingTime}
      disableShadows={animationSettings.disableShadows}
      onPageChange={setCurrentPage}
    />
  );
}
```

## API Route Integration

Example of using cache headers in API routes:

```typescript
import { BrowserCacheHeaders } from '@/lib/performance';

export async function GET(request: Request) {
  // ... fetch page image

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      ...BrowserCacheHeaders.getPageImageHeaders(),
    },
  });
}
```

## Best Practices

1. **Always use lazy loading** for page images to reduce initial load time
2. **Preload adjacent pages** (2 ahead, 1 behind) for smooth navigation
3. **Cache aggressively** with appropriate TTLs (7 days for pages, 5 minutes for annotations)
4. **Monitor memory usage** and trigger cleanup when threshold is exceeded
5. **Adapt to network conditions** by adjusting quality and buffering
6. **Optimize for mobile** by reducing animations and using appropriate image quality
7. **Use passive event listeners** for touch events to improve scroll performance
8. **Enable GPU acceleration** on capable devices for smooth animations
9. **Implement proper cleanup** in useEffect hooks to prevent memory leaks
10. **Monitor performance** in development with PerformanceMonitor component

## Performance Targets

- **Page conversion**: < 5 seconds per document
- **Annotation loading**: < 1 second
- **Page load time**: < 2 seconds
- **Animation frame rate**: 60 FPS on desktop, 30+ FPS on mobile
- **Memory usage**: < 100 MB for typical documents
- **Cache hit rate**: > 80% for frequently accessed pages

## Browser Support

- Chrome/Edge: Full support (including Network Information API)
- Firefox: Full support (limited Network Information API)
- Safari: Full support (no Network Information API)
- Mobile browsers: Full support with optimizations

## Testing

Run performance tests:

```bash
npm run test:performance
```

Monitor performance in development:

```typescript
// Enable performance monitor
<PerformanceMonitor showOverlay={true} enableLogging={true} />
```

## Troubleshooting

### High Memory Usage

- Reduce `maxPagesInMemory` in MemoryManager
- Increase `cleanupInterval` frequency
- Enable aggressive cleanup

### Slow Page Loading

- Increase `preloadAhead` in PageLoader
- Check network quality with MediaOptimizer
- Verify cache is working correctly

### Poor Animation Performance

- Check device performance level
- Enable `reduceAnimations` for low-end devices
- Disable shadows on mobile devices

### Network Issues

- Check connection quality with MediaOptimizer
- Adjust quality levels for poor connections
- Enable mobile optimization for metered connections

## License

MIT
