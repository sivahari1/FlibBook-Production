/**
 * Page Loader - Performance Optimization for Flipbook Pages
 * 
 * Implements lazy loading and preloading strategies for flipbook page images
 * to optimize initial load time and provide smooth navigation experience.
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Intelligent preloading of adjacent pages
 * - Image compression optimization
 * - Memory-efficient page management
 * 
 * Requirements: 17.3, 17.5, 20.1
 */

export interface PageLoadOptions {
  /**
   * Number of pages to preload ahead of current page
   * @default 2
   */
  preloadAhead?: number;

  /**
   * Number of pages to preload behind current page
   * @default 1
   */
  preloadBehind?: number;

  /**
   * Root margin for intersection observer (in pixels)
   * @default '50px'
   */
  rootMargin?: string;

  /**
   * Threshold for intersection observer (0-1)
   * @default 0.1
   */
  threshold?: number;

  /**
   * Enable image compression optimization
   * @default true
   */
  optimizeCompression?: boolean;
}

export interface PageImage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  loaded: boolean;
  loading: boolean;
  error: boolean;
}

/**
 * PageLoader class manages lazy loading and preloading of flipbook pages
 */
export class PageLoader {
  private pages: Map<number, PageImage> = new Map();
  private loadingQueue: Set<number> = new Set();
  private observer: IntersectionObserver | null = null;
  private options: Required<PageLoadOptions>;

  constructor(options: PageLoadOptions = {}) {
    this.options = {
      preloadAhead: options.preloadAhead ?? 2,
      preloadBehind: options.preloadBehind ?? 1,
      rootMargin: options.rootMargin ?? '50px',
      threshold: options.threshold ?? 0.1,
      optimizeCompression: options.optimizeCompression ?? true,
    };

    this.initializeObserver();
  }

  /**
   * Initialize Intersection Observer for lazy loading
   */
  private initializeObserver(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNumber = parseInt(
              entry.target.getAttribute('data-page-number') || '0',
              10
            );
            this.loadPage(pageNumber);
          }
        });
      },
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold,
      }
    );
  }

  /**
   * Register pages for lazy loading
   */
  registerPages(pages: Array<{ pageNumber: number; imageUrl: string; width: number; height: number }>): void {
    pages.forEach((page) => {
      if (!this.pages.has(page.pageNumber)) {
        this.pages.set(page.pageNumber, {
          ...page,
          loaded: false,
          loading: false,
          error: false,
        });
      }
    });
  }

  /**
   * Observe an element for lazy loading
   */
  observe(element: HTMLElement, pageNumber: number): void {
    if (this.observer) {
      element.setAttribute('data-page-number', pageNumber.toString());
      this.observer.observe(element);
    } else {
      // Fallback: load immediately if IntersectionObserver not available
      this.loadPage(pageNumber);
    }
  }

  /**
   * Unobserve an element
   */
  unobserve(element: HTMLElement): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  /**
   * Load a specific page image
   */
  async loadPage(pageNumber: number): Promise<void> {
    const page = this.pages.get(pageNumber);
    if (!page || page.loaded || page.loading || this.loadingQueue.has(pageNumber)) {
      return;
    }

    this.loadingQueue.add(pageNumber);
    page.loading = true;

    try {
      await this.loadImage(page.imageUrl);
      page.loaded = true;
      page.loading = false;
      page.error = false;
    } catch (error) {
      console.error(`Failed to load page ${pageNumber}:`, error);
      page.loaded = false;
      page.loading = false;
      page.error = true;
    } finally {
      this.loadingQueue.delete(pageNumber);
    }
  }

  /**
   * Preload pages around the current page
   */
  async preloadAdjacentPages(currentPage: number, totalPages: number): Promise<void> {
    const pagesToPreload: number[] = [];

    // Preload ahead
    for (let i = 1; i <= this.options.preloadAhead; i++) {
      const pageNum = currentPage + i;
      if (pageNum < totalPages) {
        pagesToPreload.push(pageNum);
      }
    }

    // Preload behind
    for (let i = 1; i <= this.options.preloadBehind; i++) {
      const pageNum = currentPage - i;
      if (pageNum >= 0) {
        pagesToPreload.push(pageNum);
      }
    }

    // Load pages in parallel
    await Promise.all(pagesToPreload.map((pageNum) => this.loadPage(pageNum)));
  }

  /**
   * Load an image and return a promise
   */
  private loadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      
      // Add compression optimization parameters if enabled
      if (this.options.optimizeCompression) {
        const optimizedUrl = this.optimizeImageUrl(url);
        img.src = optimizedUrl;
      } else {
        img.src = url;
      }
    });
  }

  /**
   * Optimize image URL with compression parameters
   */
  private optimizeImageUrl(url: string): string {
    // If using Supabase or similar service, add optimization parameters
    // This is a placeholder - adjust based on your storage service
    try {
      const urlObj = new URL(url);
      
      // Add quality parameter if not already present
      if (!urlObj.searchParams.has('quality')) {
        urlObj.searchParams.set('quality', '85');
      }
      
      // Add format parameter for modern browsers
      if (this.supportsWebP() && !urlObj.searchParams.has('format')) {
        urlObj.searchParams.set('format', 'webp');
      }
      
      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Check if browser supports WebP format
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
   * Get page status
   */
  getPageStatus(pageNumber: number): PageImage | undefined {
    return this.pages.get(pageNumber);
  }

  /**
   * Get all pages
   */
  getAllPages(): PageImage[] {
    return Array.from(this.pages.values()).sort((a, b) => a.pageNumber - b.pageNumber);
  }

  /**
   * Clear all loaded pages (for memory management)
   */
  clearPages(): void {
    this.pages.clear();
    this.loadingQueue.clear();
  }

  /**
   * Cleanup and disconnect observer
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.clearPages();
  }
}

/**
 * React hook for using PageLoader
 */
export function usePageLoader(options: PageLoadOptions = {}) {
  const [loader] = useState(() => new PageLoader(options));

  useEffect(() => {
    return () => {
      loader.destroy();
    };
  }, [loader]);

  return loader;
}
