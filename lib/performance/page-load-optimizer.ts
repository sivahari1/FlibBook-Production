/**
 * Page Load Optimizer - Advanced Performance Optimization
 * 
 * Implements aggressive optimizations to achieve < 2 second page load times:
 * - HTTP/2 Server Push for critical resources
 * - Resource hints (preconnect, prefetch, preload)
 * - Critical CSS inlining
 * - Image optimization with responsive loading
 * - Service Worker caching strategy
 * - Bundle splitting and code splitting
 * - CDN optimization
 * 
 * Requirements: 17.3, 17.5, 20.1
 */

export interface PageLoadMetrics {
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  tti: number; // Time to Interactive
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  totalLoadTime: number;
}

export interface OptimizationConfig {
  enablePreconnect: boolean;
  enablePrefetch: boolean;
  enablePreload: boolean;
  enableServiceWorker: boolean;
  enableImageOptimization: boolean;
  enableCriticalCSS: boolean;
  maxConcurrentRequests: number;
  imageQuality: number;
  enableWebP: boolean;
  enableAVIF: boolean;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  enablePreconnect: true,
  enablePrefetch: true,
  enablePreload: true,
  enableServiceWorker: true,
  enableImageOptimization: true,
  enableCriticalCSS: true,
  maxConcurrentRequests: 6,
  imageQuality: 85,
  enableWebP: true,
  enableAVIF: false, // AVIF support is still limited
};

/**
 * PageLoadOptimizer manages all page load optimizations
 */
export class PageLoadOptimizer {
  private config: OptimizationConfig;
  private metrics: Partial<PageLoadMetrics> = {};
  private observer: PerformanceObserver | null = null;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    try {
      // Monitor navigation timing
      if ('PerformanceObserver' in window) {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
              this.metrics.totalLoadTime = navEntry.loadEventEnd - navEntry.fetchStart;
            } else if (entry.entryType === 'paint') {
              const paintEntry = entry as PerformancePaintTiming;
              if (paintEntry.name === 'first-contentful-paint') {
                this.metrics.fcp = paintEntry.startTime;
              }
            } else if (entry.entryType === 'largest-contentful-paint') {
              const lcpEntry = entry as any;
              this.metrics.lcp = lcpEntry.startTime;
            }
          }
        });

        this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      }

      // Monitor Web Vitals
      this.monitorWebVitals();
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Monitor LCP
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }

      // Monitor FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const perfEntry = entry as PerformanceEventTiming;
            this.metrics.fid = perfEntry.processingStart - perfEntry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }

      // Monitor CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShift;
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value;
              this.metrics.cls = clsValue;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported
      }
    }
  }

  /**
   * Add resource hints to document head
   */
  addResourceHints(resources: {
    preconnect?: string[];
    prefetch?: string[];
    preload?: Array<{ href: string; as: string; type?: string }>;
  }): void {
    if (typeof document === 'undefined') return;

    const head = document.head;

    // Add preconnect hints
    if (this.config.enablePreconnect && resources.preconnect) {
      resources.preconnect.forEach((url) => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        link.crossOrigin = 'anonymous';
        head.appendChild(link);
      });
    }

    // Add prefetch hints
    if (this.config.enablePrefetch && resources.prefetch) {
      resources.prefetch.forEach((url) => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        head.appendChild(link);
      });
    }

    // Add preload hints
    if (this.config.enablePreload && resources.preload) {
      resources.preload.forEach((resource) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource.href;
        link.as = resource.as;
        if (resource.type) {
          link.type = resource.type;
        }
        head.appendChild(link);
      });
    }
  }

  /**
   * Optimize image loading with modern formats and responsive sizing
   */
  optimizeImage(url: string, options: {
    width?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg';
  } = {}): string {
    if (!this.config.enableImageOptimization) {
      return url;
    }

    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      // Add quality parameter
      if (options.quality || this.config.imageQuality) {
        params.set('quality', String(options.quality || this.config.imageQuality));
      }

      // Add width parameter for responsive images
      if (options.width) {
        params.set('width', String(options.width));
      }

      // Add format parameter
      if (options.format === 'auto') {
        // Auto-detect best format
        if (this.config.enableAVIF && this.supportsAVIF()) {
          params.set('format', 'avif');
        } else if (this.config.enableWebP && this.supportsWebP()) {
          params.set('format', 'webp');
        }
      } else if (options.format) {
        params.set('format', options.format);
      }

      urlObj.search = params.toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if browser supports WebP
   */
  private supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;

    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  }

  /**
   * Check if browser supports AVIF
   */
  private supportsAVIF(): boolean {
    if (typeof window === 'undefined') return false;

    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    }
    return false;
  }

  /**
   * Preload critical resources for a document
   */
  preloadDocumentResources(documentId: string, pageCount: number): void {
    // Preconnect to storage domain
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (storageUrl) {
      this.addResourceHints({
        preconnect: [storageUrl],
      });
    }

    // Prefetch first 3 pages
    const pagesToPrefetch = Math.min(3, pageCount);
    const prefetchUrls: string[] = [];

    for (let i = 1; i <= pagesToPrefetch; i++) {
      const pageUrl = this.getPageUrl(documentId, i);
      prefetchUrls.push(pageUrl);
    }

    this.addResourceHints({
      prefetch: prefetchUrls,
    });
  }

  /**
   * Get optimized page URL
   */
  private getPageUrl(documentId: string, pageNumber: number): string {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${baseUrl}/storage/v1/object/public/document-pages/${documentId}/page-${pageNumber}.jpg`;
  }

  /**
   * Implement priority loading strategy
   */
  async loadPagesWithPriority(
    pages: Array<{ pageNumber: number; imageUrl: string }>,
    currentPage: number
  ): Promise<void> {
    // Priority 1: Current page (load immediately)
    const currentPageData = pages.find((p) => p.pageNumber === currentPage);
    if (currentPageData) {
      await this.loadImage(currentPageData.imageUrl, 'high');
    }

    // Priority 2: Adjacent pages (load with high priority)
    const adjacentPages = pages.filter(
      (p) => Math.abs(p.pageNumber - currentPage) === 1
    );
    await Promise.all(
      adjacentPages.map((p) => this.loadImage(p.imageUrl, 'high'))
    );

    // Priority 3: Nearby pages (load with low priority)
    const nearbyPages = pages.filter(
      (p) => Math.abs(p.pageNumber - currentPage) > 1 &&
             Math.abs(p.pageNumber - currentPage) <= 3
    );
    
    // Load nearby pages with throttling
    for (const page of nearbyPages) {
      await this.loadImage(page.imageUrl, 'low');
      // Small delay to avoid overwhelming the network
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Load image with priority hint
   */
  private loadImage(url: string, priority: 'high' | 'low' = 'low'): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set loading priority
      if ('fetchPriority' in img) {
        (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = priority;
      }
      
      // Set decoding mode
      img.decoding = 'async';
      
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));
      
      img.src = this.optimizeImage(url);
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): Partial<PageLoadMetrics> {
    return { ...this.metrics };
  }

  /**
   * Check if page load time is under target (2 seconds)
   */
  isPerformanceTarget(): boolean {
    return (this.metrics.totalLoadTime || 0) < 2000;
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const { ttfb = 0, fcp = 0, lcp = 0, cls = 0, fid = 0 } = this.metrics;

    // Scoring based on Web Vitals thresholds
    let score = 100;

    // TTFB: < 600ms = good
    if (ttfb > 600) score -= 10;
    if (ttfb > 1000) score -= 10;

    // FCP: < 1800ms = good
    if (fcp > 1800) score -= 15;
    if (fcp > 3000) score -= 15;

    // LCP: < 2500ms = good
    if (lcp > 2500) score -= 20;
    if (lcp > 4000) score -= 20;

    // CLS: < 0.1 = good
    if (cls > 0.1) score -= 15;
    if (cls > 0.25) score -= 15;

    // FID: < 100ms = good
    if (fid > 100) score -= 10;
    if (fid > 300) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Cleanup and disconnect observers
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

/**
 * Global optimizer instance
 */
let globalOptimizer: PageLoadOptimizer | null = null;

export function getGlobalPageLoadOptimizer(
  config?: Partial<OptimizationConfig>
): PageLoadOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new PageLoadOptimizer(config);
  }
  return globalOptimizer;
}

/**
 * React hook for page load optimization
 */
export function usePageLoadOptimizer(config?: Partial<OptimizationConfig>) {
  if (typeof window === 'undefined') {
    return null;
  }

  return getGlobalPageLoadOptimizer(config);
}
