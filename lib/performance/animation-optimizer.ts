/**
 * Animation Optimizer - Ensures smooth 60fps animations on all devices
 * 
 * Implements adaptive animation optimization based on device capabilities
 * and runtime performance monitoring.
 * 
 * Requirements: 6.5 (60fps animation performance on all supported devices)
 */

export interface AnimationPerformanceMetrics {
  currentFps: number;
  averageFps: number;
  droppedFrames: number;
  isSmooth: boolean;
  deviceCapability: 'high' | 'medium' | 'low';
}

export interface AnimationSettings {
  duration: number;
  easing: string;
  useGPU: boolean;
  useShadows: boolean;
  use3DTransforms: boolean;
  quality: 'high' | 'medium' | 'low';
}

/**
 * AnimationOptimizer ensures smooth animations across all devices
 */
export class AnimationOptimizer {
  private targetFps = 60;
  private frameHistory: number[] = [];
  private lastFrameTime = 0;
  private droppedFrames = 0;
  private performanceCheckInterval: NodeJS.Timeout | null = null;
  private currentSettings: AnimationSettings;
  private deviceCapability: 'high' | 'medium' | 'low';

  constructor() {
    this.deviceCapability = this.detectDeviceCapability();
    this.currentSettings = this.getOptimalSettings(this.deviceCapability);
    this.startPerformanceMonitoring();
  }

  /**
   * Detect device capability based on hardware specs
   */
  private detectDeviceCapability(): 'high' | 'medium' | 'low' {
    if (typeof window === 'undefined') {
      return 'medium';
    }

    const nav = navigator as any;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = nav.deviceMemory; // GB (Chrome only)
    const pixelRatio = window.devicePixelRatio || 1;

    // High-end device indicators
    if (hardwareConcurrency >= 8 && (!deviceMemory || deviceMemory >= 8)) {
      return 'high';
    }

    // Low-end device indicators
    if (hardwareConcurrency <= 2 || (deviceMemory && deviceMemory <= 2)) {
      return 'low';
    }

    // Check for mobile devices
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    if (isMobile && hardwareConcurrency <= 4) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Get optimal animation settings for device capability
   */
  private getOptimalSettings(capability: 'high' | 'medium' | 'low'): AnimationSettings {
    const settings: Record<string, AnimationSettings> = {
      high: {
        duration: 600,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        useGPU: true,
        useShadows: true,
        use3DTransforms: true,
        quality: 'high',
      },
      medium: {
        duration: 500,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        useGPU: true,
        useShadows: true,
        use3DTransforms: true,
        quality: 'medium',
      },
      low: {
        duration: 400,
        easing: 'ease-out',
        useGPU: true,
        useShadows: false,
        use3DTransforms: false,
        quality: 'low',
      },
    };

    return settings[capability];
  }

  /**
   * Start monitoring animation performance
   */
  private startPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    let frameCount = 0;
    let lastTime = performance.now();

    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTime;

      frameCount++;

      // Measure FPS every second
      if (delta >= 1000) {
        const fps = Math.round((frameCount * 1000) / delta);
        this.recordFps(fps);

        frameCount = 0;
        lastTime = now;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  /**
   * Record FPS measurement
   */
  private recordFps(fps: number): void {
    this.frameHistory.push(fps);

    // Keep last 10 measurements
    if (this.frameHistory.length > 10) {
      this.frameHistory.shift();
    }

    // Count dropped frames (below 55fps is considered dropped)
    if (fps < 55) {
      this.droppedFrames++;
    }

    // Adaptive optimization: downgrade if consistently poor performance
    if (this.frameHistory.length >= 5) {
      const avgFps = this.getAverageFps();
      
      if (avgFps < 50 && this.deviceCapability !== 'low') {
        this.downgradeSettings();
      } else if (avgFps >= 58 && this.deviceCapability === 'low') {
        this.upgradeSettings();
      }
    }
  }

  /**
   * Downgrade animation settings for better performance
   */
  private downgradeSettings(): void {
    if (this.deviceCapability === 'high') {
      this.deviceCapability = 'medium';
    } else if (this.deviceCapability === 'medium') {
      this.deviceCapability = 'low';
    }

    this.currentSettings = this.getOptimalSettings(this.deviceCapability);
    console.log('[AnimationOptimizer] Downgraded to', this.deviceCapability, 'settings');
  }

  /**
   * Upgrade animation settings when performance allows
   */
  private upgradeSettings(): void {
    if (this.deviceCapability === 'low') {
      this.deviceCapability = 'medium';
      this.currentSettings = this.getOptimalSettings(this.deviceCapability);
      console.log('[AnimationOptimizer] Upgraded to', this.deviceCapability, 'settings');
    }
  }

  /**
   * Get current animation settings
   */
  getSettings(): AnimationSettings {
    return { ...this.currentSettings };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): AnimationPerformanceMetrics {
    const avgFps = this.getAverageFps();
    const currentFps = this.frameHistory[this.frameHistory.length - 1] || 0;

    return {
      currentFps,
      averageFps: avgFps,
      droppedFrames: this.droppedFrames,
      isSmooth: avgFps >= 55, // 55fps is acceptable (92% of 60fps)
      deviceCapability: this.deviceCapability,
    };
  }

  /**
   * Get average FPS from history
   */
  private getAverageFps(): number {
    if (this.frameHistory.length === 0) return 60;

    const sum = this.frameHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.frameHistory.length);
  }

  /**
   * Get CSS transform string with GPU acceleration
   */
  getTransformStyle(transform: string): React.CSSProperties {
    if (!this.currentSettings.useGPU) {
      return { transform };
    }

    return {
      transform: this.currentSettings.use3DTransforms
        ? `${transform} translateZ(0)`
        : transform,
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
    };
  }

  /**
   * Get transition CSS with optimal timing
   */
  getTransitionStyle(property: string = 'all'): React.CSSProperties {
    return {
      transition: `${property} ${this.currentSettings.duration}ms ${this.currentSettings.easing}`,
    };
  }

  /**
   * Check if shadows should be rendered
   */
  shouldUseShadows(): boolean {
    return this.currentSettings.useShadows;
  }

  /**
   * Get optimal image quality setting
   */
  getImageQuality(): number {
    const qualityMap = {
      high: 90,
      medium: 80,
      low: 70,
    };

    return qualityMap[this.currentSettings.quality];
  }

  /**
   * Get optimal page preload count
   */
  getPreloadCount(): number {
    const preloadMap = {
      high: 3,
      medium: 2,
      low: 1,
    };

    return preloadMap[this.deviceCapability];
  }

  /**
   * Check if device prefers reduced motion
   */
  prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Get animation duration with reduced motion support
   */
  getAnimationDuration(baseDuration?: number): number {
    if (this.prefersReducedMotion()) {
      return 0; // Instant transitions for reduced motion
    }

    return baseDuration || this.currentSettings.duration;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
    }
  }
}

/**
 * Global singleton instance
 */
let globalAnimationOptimizer: AnimationOptimizer | null = null;

export function getGlobalAnimationOptimizer(): AnimationOptimizer {
  if (!globalAnimationOptimizer) {
    globalAnimationOptimizer = new AnimationOptimizer();
  }
  return globalAnimationOptimizer;
}

/**
 * React hook for using AnimationOptimizer
 */
export function useAnimationOptimizer(): AnimationOptimizer {
  return getGlobalAnimationOptimizer();
}
