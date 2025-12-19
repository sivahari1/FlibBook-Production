/**
 * Image Optimization Service
 * 
 * Provides WebP format with JPEG fallback, adaptive quality based on network speed,
 * and progressive loading for large images in the JStudyRoom document viewing system.
 */

export interface ImageOptimizationOptions {
  /** Target width for the optimized image */
  width?: number;
  /** Target height for the optimized image */
  height?: number;
  /** Quality setting (0-100) */
  quality?: number;
  /** Whether to use progressive loading */
  progressive?: boolean;
  /** Network speed hint for adaptive quality */
  networkSpeed?: 'slow' | 'fast' | 'auto';
  /** Preferred format (webp, jpeg, auto) */
  format?: 'webp' | 'jpeg' | 'auto';
}

export interface OptimizedImage {
  /** Primary image URL (WebP if supported) */
  url: string;
  /** Fallback image URL (JPEG) */
  fallbackUrl: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** File size in bytes */
  size: number;
  /** Image format */
  format: 'webp' | 'jpeg';
  /** Whether the image is progressively encoded */
  progressive: boolean;
}

export interface NetworkSpeedInfo {
  /** Connection type */
  type: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  /** Effective bandwidth in Mbps */
  downlink: number;
  /** Round-trip time in ms */
  rtt: number;
  /** Save data preference */
  saveData: boolean;
}

class ImageOptimizer {
  private static instance: ImageOptimizer;
  private networkInfo: NetworkSpeedInfo | null = null;
  private webpSupported: boolean | null = null;

  private constructor() {
    this.detectNetworkSpeed();
    this.detectWebPSupport();
  }

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  /**
   * Optimize an image URL with the given options
   */
  async optimizeImage(
    originalUrl: string,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImage> {
    const networkSpeed = options.networkSpeed || this.getAdaptiveNetworkSpeed();
    const quality = options.quality || this.getAdaptiveQuality(networkSpeed);
    const format = options.format || (await this.getOptimalFormat());
    
    // Build optimization parameters
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    params.set('q', quality.toString());
    
    if (options.progressive !== false) {
      params.set('progressive', 'true');
    }

    // Generate optimized URLs
    const optimizedUrl = this.buildOptimizedUrl(originalUrl, params, format);
    const fallbackUrl = this.buildOptimizedUrl(originalUrl, params, 'jpeg');

    return {
      url: optimizedUrl,
      fallbackUrl,
      width: options.width || 0,
      height: options.height || 0,
      size: 0, // Will be determined by actual image
      format: format as 'webp' | 'jpeg',
      progressive: options.progressive !== false
    };
  }

  /**
   * Get multiple image sizes for responsive loading
   */
  async getResponsiveImages(
    originalUrl: string,
    sizes: number[],
    options: Omit<ImageOptimizationOptions, 'width'> = {}
  ): Promise<OptimizedImage[]> {
    const promises = sizes.map(width =>
      this.optimizeImage(originalUrl, { ...options, width })
    );
    
    return Promise.all(promises);
  }

  /**
   * Preload critical images
   */
  preloadImage(url: string, fallbackUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve();
      img.onerror = () => {
        if (fallbackUrl) {
          // Try fallback
          const fallbackImg = new Image();
          fallbackImg.onload = () => resolve();
          fallbackImg.onerror = () => reject(new Error('Failed to load image and fallback'));
          fallbackImg.src = fallbackUrl;
        } else {
          reject(new Error('Failed to load image'));
        }
      };
      
      img.src = url;
    });
  }

  /**
   * Detect network speed and capabilities
   */
  private detectNetworkSpeed(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkInfo = {
          type: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 1,
          rtt: connection.rtt || 1000,
          saveData: connection.saveData || false
        };
      }
    }
  }

  /**
   * Detect WebP support
   */
  private async detectWebPSupport(): Promise<boolean> {
    if (this.webpSupported !== null) {
      return this.webpSupported;
    }

    // Check if we're in a browser environment
    if (typeof Image === 'undefined') {
      this.webpSupported = false;
      return false;
    }

    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        this.webpSupported = webP.height === 2;
        resolve(this.webpSupported);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Get adaptive network speed classification
   */
  private getAdaptiveNetworkSpeed(): 'slow' | 'fast' {
    if (!this.networkInfo) return 'fast';
    
    const { type, downlink, saveData } = this.networkInfo;
    
    if (saveData) return 'slow';
    
    if (type === 'slow-2g' || type === '2g') return 'slow';
    if (downlink < 1.5) return 'slow';
    
    return 'fast';
  }

  /**
   * Get adaptive quality based on network speed
   */
  private getAdaptiveQuality(networkSpeed: 'slow' | 'fast'): number {
    switch (networkSpeed) {
      case 'slow':
        return 60; // Lower quality for slow connections
      case 'fast':
        return 85; // Higher quality for fast connections
      default:
        return 75; // Default quality
    }
  }

  /**
   * Get optimal image format
   */
  private async getOptimalFormat(): Promise<'webp' | 'jpeg'> {
    const webpSupported = await this.detectWebPSupport();
    return webpSupported ? 'webp' : 'jpeg';
  }

  /**
   * Build optimized image URL
   */
  private buildOptimizedUrl(
    originalUrl: string,
    params: URLSearchParams,
    format: string
  ): string {
    try {
      // Check if this is a Supabase storage URL
      if (originalUrl.includes('supabase')) {
        return this.buildSupabaseOptimizedUrl(originalUrl, params, format);
      }
      
      // For other URLs, use a generic transformation service
      return this.buildGenericOptimizedUrl(originalUrl, params, format);
    } catch (error) {
      // Fallback to original URL if optimization fails
      console.warn('Failed to build optimized URL:', error);
      return originalUrl;
    }
  }

  /**
   * Build Supabase optimized URL with transformation parameters
   */
  private buildSupabaseOptimizedUrl(
    originalUrl: string,
    params: URLSearchParams,
    format: string
  ): string {
    // Supabase supports image transformations via query parameters
    const url = new URL(originalUrl);
    
    // Add transformation parameters
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    
    // Set format
    url.searchParams.set('format', format);
    
    return url.toString();
  }

  /**
   * Build generic optimized URL (fallback)
   */
  private buildGenericOptimizedUrl(
    originalUrl: string,
    params: URLSearchParams,
    format: string
  ): string {
    try {
      // For now, return original URL with cache busting
      // In production, this would integrate with a CDN or image service
      const url = new URL(originalUrl);
      
      // Add optimization parameters
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      
      url.searchParams.set('opt', '1');
      url.searchParams.set('f', format);
      
      return url.toString();
    } catch (error) {
      // If URL is invalid, return original with basic parameters
      return `${originalUrl}?opt=1&f=${format}`;
    }
  }

  /**
   * Get current network information
   */
  getNetworkInfo(): NetworkSpeedInfo | null {
    return this.networkInfo;
  }

  /**
   * Check if WebP is supported
   */
  async isWebPSupported(): Promise<boolean> {
    return this.detectWebPSupport();
  }
}

export const imageOptimizer = ImageOptimizer.getInstance();
export default imageOptimizer;