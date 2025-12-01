/**
 * Mobile Optimizer - Performance Optimization for Mobile Devices
 * 
 * Implements mobile-specific optimizations:
 * - Reduced animation complexity
 * - Optimized touch event handlers
 * - Low-end device detection and adaptation
 * 
 * Requirements: 6.5, 17.5, 20.5
 */

export interface MobileOptimizationOptions {
  /**
   * Enable reduced animations on mobile
   * @default true
   */
  reduceAnimations?: boolean;

  /**
   * Enable touch event optimization
   * @default true
   */
  optimizeTouchEvents?: boolean;

  /**
   * Enable low-end device detection
   * @default true
   */
  detectLowEndDevice?: boolean;

  /**
   * Animation duration multiplier for mobile (0-1)
   * @default 0.7
   */
  animationSpeedMultiplier?: number;

  /**
   * Touch debounce delay in milliseconds
   * @default 16
   */
  touchDebounceDelay?: number;
}

export type DevicePerformance = 'high' | 'medium' | 'low';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isLowEnd: boolean;
  performance: DevicePerformance;
  screenSize: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  touchSupport: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number; // in GB
}

/**
 * MobileOptimizer handles mobile-specific performance optimizations
 */
export class MobileOptimizer {
  private options: Required<MobileOptimizationOptions>;
  private deviceInfo: DeviceInfo;
  private touchHandlers: Map<string, any> = new Map();

  constructor(options: MobileOptimizationOptions = {}) {
    this.options = {
      reduceAnimations: options.reduceAnimations ?? true,
      optimizeTouchEvents: options.optimizeTouchEvents ?? true,
      detectLowEndDevice: options.detectLowEndDevice ?? true,
      animationSpeedMultiplier: options.animationSpeedMultiplier ?? 0.7,
      touchDebounceDelay: options.touchDebounceDelay ?? 16,
    };

    this.deviceInfo = this.detectDevice();
  }

  /**
   * Detect device capabilities
   */
  private detectDevice(): DeviceInfo {
    if (typeof window === 'undefined') {
      return this.getDefaultDeviceInfo();
    }

    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    
    // Device Memory API (Chrome only)
    const nav = navigator as any;
    const deviceMemory = nav.deviceMemory; // in GB

    // Detect low-end device
    const isLowEnd = this.options.detectLowEndDevice && this.isLowEndDevice({
      hardwareConcurrency,
      deviceMemory,
      pixelRatio,
      screenWidth,
      screenHeight,
    });

    // Determine performance level
    const performance = this.determinePerformance({
      hardwareConcurrency,
      deviceMemory,
      isLowEnd,
      isMobile,
    });

    return {
      isMobile,
      isTablet,
      isLowEnd,
      performance,
      screenSize: {
        width: screenWidth,
        height: screenHeight,
      },
      pixelRatio,
      touchSupport,
      hardwareConcurrency,
      deviceMemory,
    };
  }

  /**
   * Check if device is low-end
   */
  private isLowEndDevice(specs: {
    hardwareConcurrency: number;
    deviceMemory?: number;
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
  }): boolean {
    // Low-end indicators
    const lowCores = specs.hardwareConcurrency <= 2;
    const lowMemory = specs.deviceMemory !== undefined && specs.deviceMemory <= 2;
    const lowResolution = specs.screenWidth * specs.screenHeight < 1280 * 720;

    // Consider low-end if 2 or more indicators are true
    const indicators = [lowCores, lowMemory, lowResolution].filter(Boolean).length;
    return indicators >= 2;
  }

  /**
   * Determine device performance level
   */
  private determinePerformance(specs: {
    hardwareConcurrency: number;
    deviceMemory?: number;
    isLowEnd: boolean;
    isMobile: boolean;
  }): DevicePerformance {
    if (specs.isLowEnd) {
      return 'low';
    }

    if (specs.hardwareConcurrency >= 8 && (!specs.deviceMemory || specs.deviceMemory >= 8)) {
      return 'high';
    }

    if (specs.hardwareConcurrency >= 4 && (!specs.deviceMemory || specs.deviceMemory >= 4)) {
      return 'medium';
    }

    return specs.isMobile ? 'low' : 'medium';
  }

  /**
   * Get default device info (for SSR)
   */
  private getDefaultDeviceInfo(): DeviceInfo {
    return {
      isMobile: false,
      isTablet: false,
      isLowEnd: false,
      performance: 'medium',
      screenSize: { width: 1920, height: 1080 },
      pixelRatio: 1,
      touchSupport: false,
      hardwareConcurrency: 4,
    };
  }

  /**
   * Get device information
   */
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  /**
   * Get optimized animation duration
   */
  getAnimationDuration(baseDuration: number): number {
    if (!this.options.reduceAnimations) {
      return baseDuration;
    }

    // Reduce animation duration on mobile and low-end devices
    if (this.deviceInfo.isLowEnd) {
      return baseDuration * 0.5; // 50% speed
    }

    if (this.deviceInfo.isMobile) {
      return baseDuration * this.options.animationSpeedMultiplier;
    }

    return baseDuration;
  }

  /**
   * Get optimized animation settings for flipbook
   */
  getFlipbookAnimationSettings(): {
    flippingTime: number;
    useSimpleAnimation: boolean;
    disableShadows: boolean;
  } {
    const baseFlippingTime = 600; // ms

    return {
      flippingTime: this.getAnimationDuration(baseFlippingTime),
      useSimpleAnimation: this.deviceInfo.isLowEnd,
      disableShadows: this.deviceInfo.isLowEnd || this.deviceInfo.performance === 'low',
    };
  }

  /**
   * Create optimized touch event handler
   */
  createTouchHandler(
    callback: (event: TouchEvent) => void,
    options: {
      passive?: boolean;
      debounce?: boolean;
    } = {}
  ): (event: TouchEvent) => void {
    if (!this.options.optimizeTouchEvents) {
      return callback;
    }

    const passive = options.passive ?? true;
    const debounce = options.debounce ?? true;

    if (debounce) {
      return this.debounce(callback, this.options.touchDebounceDelay);
    }

    return callback;
  }

  /**
   * Debounce function
   */
  private debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }

  /**
   * Throttle function
   */
  private throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Get optimized image quality settings
   */
  getImageQualitySettings(): {
    quality: number;
    maxWidth: number;
    maxHeight: number;
    format: 'webp' | 'jpeg';
  } {
    const baseQuality = 85;
    const baseMaxWidth = 2048;
    const baseMaxHeight = 2048;

    if (this.deviceInfo.isLowEnd) {
      return {
        quality: 70,
        maxWidth: 1024,
        maxHeight: 1536,
        format: 'jpeg', // Better compatibility
      };
    }

    if (this.deviceInfo.isMobile) {
      return {
        quality: 80,
        maxWidth: 1536,
        maxHeight: 2048,
        format: 'webp',
      };
    }

    return {
      quality: baseQuality,
      maxWidth: baseMaxWidth,
      maxHeight: baseMaxHeight,
      format: 'webp',
    };
  }

  /**
   * Get optimized page rendering settings
   */
  getPageRenderingSettings(): {
    useVirtualization: boolean;
    maxPagesInView: number;
    preloadDistance: number;
    useLowQualityPreview: boolean;
  } {
    if (this.deviceInfo.isLowEnd) {
      return {
        useVirtualization: true,
        maxPagesInView: 2,
        preloadDistance: 1,
        useLowQualityPreview: true,
      };
    }

    if (this.deviceInfo.isMobile) {
      return {
        useVirtualization: true,
        maxPagesInView: 3,
        preloadDistance: 2,
        useLowQualityPreview: false,
      };
    }

    return {
      useVirtualization: false,
      maxPagesInView: 5,
      preloadDistance: 3,
      useLowQualityPreview: false,
    };
  }

  /**
   * Check if should use reduced motion
   */
  shouldUseReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;

    // Check user preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    return prefersReducedMotion || this.deviceInfo.isLowEnd;
  }

  /**
   * Get CSS transform optimization
   */
  getCSSTransformOptimization(): {
    useWillChange: boolean;
    useTransform3d: boolean;
    useGPUAcceleration: boolean;
  } {
    // Use GPU acceleration on all devices except very low-end
    const useGPU = !this.deviceInfo.isLowEnd;

    return {
      useWillChange: useGPU,
      useTransform3d: useGPU,
      useGPUAcceleration: useGPU,
    };
  }

  /**
   * Get scroll optimization settings
   */
  getScrollOptimizationSettings(): {
    usePassiveListeners: boolean;
    throttleDelay: number;
    useNativeScroll: boolean;
  } {
    return {
      usePassiveListeners: true,
      throttleDelay: this.deviceInfo.isLowEnd ? 32 : 16,
      useNativeScroll: this.deviceInfo.isMobile,
    };
  }

  /**
   * Optimize element for performance
   */
  optimizeElement(element: HTMLElement): void {
    const cssOptimization = this.getCSSTransformOptimization();

    if (cssOptimization.useWillChange) {
      element.style.willChange = 'transform';
    }

    if (cssOptimization.useGPUAcceleration) {
      element.style.transform = 'translateZ(0)';
    }

    // Disable text selection on mobile for better performance
    if (this.deviceInfo.isMobile) {
      element.style.userSelect = 'none';
      element.style.webkitUserSelect = 'none';
      element.style.webkitTouchCallout = 'none';
    }
  }

  /**
   * Get recommended viewport settings
   */
  getViewportSettings(): {
    width: string;
    initialScale: number;
    maximumScale: number;
    userScalable: boolean;
  } {
    return {
      width: 'device-width',
      initialScale: 1.0,
      maximumScale: this.deviceInfo.isMobile ? 3.0 : 5.0,
      userScalable: true,
    };
  }
}

/**
 * Singleton instance for global mobile optimization
 */
let globalMobileOptimizer: MobileOptimizer | null = null;

export function getGlobalMobileOptimizer(options?: MobileOptimizationOptions): MobileOptimizer {
  if (!globalMobileOptimizer) {
    globalMobileOptimizer = new MobileOptimizer(options);
  }
  return globalMobileOptimizer;
}

/**
 * React hook for using MobileOptimizer
 */
export function useMobileOptimizer(options?: MobileOptimizationOptions): MobileOptimizer {
  return getGlobalMobileOptimizer(options);
}
