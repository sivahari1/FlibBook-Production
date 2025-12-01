/**
 * Media Optimizer - Performance Optimization for Media Streaming
 * 
 * Implements adaptive bitrate streaming and buffering strategies
 * for audio/video annotations to optimize playback on various networks.
 * 
 * Requirements: 17.2, 20.3
 */

export interface MediaOptimizationOptions {
  /**
   * Enable adaptive bitrate streaming
   * @default true
   */
  adaptiveBitrate?: boolean;

  /**
   * Buffer size in seconds
   * @default 10
   */
  bufferSize?: number;

  /**
   * Minimum buffer before playback starts (seconds)
   * @default 3
   */
  minBufferForPlayback?: number;

  /**
   * Enable mobile network optimization
   * @default true
   */
  mobileOptimization?: boolean;

  /**
   * Quality levels for adaptive streaming
   */
  qualityLevels?: QualityLevel[];
}

export interface QualityLevel {
  label: string;
  bitrate: number; // in kbps
  resolution?: string;
}

export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
export type ConnectionQuality = 'poor' | 'moderate' | 'good' | 'excellent';

/**
 * Default quality levels for adaptive streaming
 */
const DEFAULT_QUALITY_LEVELS: QualityLevel[] = [
  { label: 'Low', bitrate: 128, resolution: '360p' },
  { label: 'Medium', bitrate: 256, resolution: '480p' },
  { label: 'High', bitrate: 512, resolution: '720p' },
  { label: 'HD', bitrate: 1024, resolution: '1080p' },
];

/**
 * MediaOptimizer handles adaptive streaming and buffering
 */
export class MediaOptimizer {
  private options: Required<MediaOptimizationOptions>;
  private currentQuality: QualityLevel;
  private networkInfo: NetworkInformation | null = null;
  private connectionQuality: ConnectionQuality = 'good';

  constructor(options: MediaOptimizationOptions = {}) {
    this.options = {
      adaptiveBitrate: options.adaptiveBitrate ?? true,
      bufferSize: options.bufferSize ?? 10,
      minBufferForPlayback: options.minBufferForPlayback ?? 3,
      mobileOptimization: options.mobileOptimization ?? true,
      qualityLevels: options.qualityLevels ?? DEFAULT_QUALITY_LEVELS,
    };

    // Start with medium quality
    this.currentQuality = this.options.qualityLevels[1] || this.options.qualityLevels[0];

    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Check for Network Information API
    const nav = navigator as any;
    if ('connection' in nav || 'mozConnection' in nav || 'webkitConnection' in nav) {
      this.networkInfo = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      // Listen for network changes
      this.networkInfo?.addEventListener('change', () => {
        this.updateConnectionQuality();
      });

      this.updateConnectionQuality();
    }
  }

  /**
   * Update connection quality based on network info
   */
  private updateConnectionQuality(): void {
    if (!this.networkInfo) {
      this.connectionQuality = 'good';
      return;
    }

    const effectiveType = this.networkInfo.effectiveType as NetworkType;
    const downlink = this.networkInfo.downlink; // Mbps
    const rtt = this.networkInfo.rtt; // ms

    // Determine connection quality
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5 || rtt > 500) {
      this.connectionQuality = 'poor';
    } else if (effectiveType === '3g' || downlink < 2 || rtt > 200) {
      this.connectionQuality = 'moderate';
    } else if (effectiveType === '4g' || downlink < 10) {
      this.connectionQuality = 'good';
    } else {
      this.connectionQuality = 'excellent';
    }

    // Adjust quality based on connection
    if (this.options.adaptiveBitrate) {
      this.adjustQualityForConnection();
    }
  }

  /**
   * Adjust quality level based on connection quality
   */
  private adjustQualityForConnection(): void {
    const levels = this.options.qualityLevels;

    switch (this.connectionQuality) {
      case 'poor':
        this.currentQuality = levels[0]; // Lowest quality
        break;
      case 'moderate':
        this.currentQuality = levels[Math.min(1, levels.length - 1)];
        break;
      case 'good':
        this.currentQuality = levels[Math.min(2, levels.length - 1)];
        break;
      case 'excellent':
        this.currentQuality = levels[levels.length - 1]; // Highest quality
        break;
    }
  }

  /**
   * Get optimal quality level for current network
   */
  getOptimalQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Get recommended buffer size based on network
   */
  getRecommendedBufferSize(): number {
    switch (this.connectionQuality) {
      case 'poor':
        return this.options.bufferSize * 2; // Double buffer for poor connections
      case 'moderate':
        return this.options.bufferSize * 1.5;
      case 'good':
        return this.options.bufferSize;
      case 'excellent':
        return this.options.bufferSize * 0.75; // Smaller buffer for fast connections
      default:
        return this.options.bufferSize;
    }
  }

  /**
   * Get minimum buffer before playback
   */
  getMinBufferForPlayback(): number {
    switch (this.connectionQuality) {
      case 'poor':
        return this.options.minBufferForPlayback * 2;
      case 'moderate':
        return this.options.minBufferForPlayback * 1.5;
      default:
        return this.options.minBufferForPlayback;
    }
  }

  /**
   * Check if device is mobile
   */
  isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /**
   * Get optimized media URL with quality parameters
   */
  getOptimizedMediaUrl(baseUrl: string, mediaType: 'audio' | 'video'): string {
    try {
      const url = new URL(baseUrl);
      
      // Add quality parameter
      url.searchParams.set('quality', this.currentQuality.label.toLowerCase());
      
      // Add bitrate hint
      url.searchParams.set('bitrate', this.currentQuality.bitrate.toString());
      
      // Add mobile optimization flag
      if (this.options.mobileOptimization && this.isMobileDevice()) {
        url.searchParams.set('mobile', '1');
      }
      
      // Add buffer size hint
      url.searchParams.set('buffer', this.getRecommendedBufferSize().toString());
      
      return url.toString();
    } catch {
      // If URL parsing fails, return original
      return baseUrl;
    }
  }

  /**
   * Get connection quality
   */
  getConnectionQuality(): ConnectionQuality {
    return this.connectionQuality;
  }

  /**
   * Get network type
   */
  getNetworkType(): NetworkType {
    if (!this.networkInfo) return 'unknown';
    return (this.networkInfo.effectiveType as NetworkType) || 'unknown';
  }

  /**
   * Check if connection is metered (mobile data)
   */
  isMeteredConnection(): boolean {
    if (!this.networkInfo) return false;
    return this.networkInfo.saveData || false;
  }

  /**
   * Get buffering strategy based on network
   */
  getBufferingStrategy(): {
    preloadAhead: number; // seconds
    preloadBehind: number; // seconds
    aggressiveBuffering: boolean;
  } {
    switch (this.connectionQuality) {
      case 'poor':
        return {
          preloadAhead: 5,
          preloadBehind: 0,
          aggressiveBuffering: false,
        };
      case 'moderate':
        return {
          preloadAhead: 10,
          preloadBehind: 5,
          aggressiveBuffering: false,
        };
      case 'good':
        return {
          preloadAhead: 15,
          preloadBehind: 10,
          aggressiveBuffering: true,
        };
      case 'excellent':
        return {
          preloadAhead: 30,
          preloadBehind: 15,
          aggressiveBuffering: true,
        };
      default:
        return {
          preloadAhead: 10,
          preloadBehind: 5,
          aggressiveBuffering: false,
        };
    }
  }

  /**
   * Get media element configuration
   */
  getMediaElementConfig(): {
    preload: 'none' | 'metadata' | 'auto';
    autoplay: boolean;
    playsInline: boolean;
  } {
    const isMobile = this.isMobileDevice();
    const isMetered = this.isMeteredConnection();

    return {
      preload: isMetered || this.connectionQuality === 'poor' ? 'metadata' : 'auto',
      autoplay: false, // Never autoplay to save bandwidth
      playsInline: isMobile, // Required for iOS
    };
  }

  /**
   * Monitor playback and adjust quality
   */
  monitorPlayback(mediaElement: HTMLMediaElement): () => void {
    let stallCount = 0;
    let lastBuffered = 0;

    const handleStall = () => {
      stallCount++;
      if (stallCount > 2 && this.options.adaptiveBitrate) {
        // Downgrade quality after multiple stalls
        this.downgradeQuality();
      }
    };

    const handleProgress = () => {
      if (mediaElement.buffered.length > 0) {
        const buffered = mediaElement.buffered.end(0);
        if (buffered > lastBuffered) {
          // Buffering is progressing, reset stall count
          stallCount = 0;
          lastBuffered = buffered;
        }
      }
    };

    const handleCanPlay = () => {
      // Reset stall count when media can play
      stallCount = 0;
    };

    mediaElement.addEventListener('stalled', handleStall);
    mediaElement.addEventListener('waiting', handleStall);
    mediaElement.addEventListener('progress', handleProgress);
    mediaElement.addEventListener('canplay', handleCanPlay);

    // Return cleanup function
    return () => {
      mediaElement.removeEventListener('stalled', handleStall);
      mediaElement.removeEventListener('waiting', handleStall);
      mediaElement.removeEventListener('progress', handleProgress);
      mediaElement.removeEventListener('canplay', handleCanPlay);
    };
  }

  /**
   * Downgrade quality level
   */
  private downgradeQuality(): void {
    const levels = this.options.qualityLevels;
    const currentIndex = levels.indexOf(this.currentQuality);
    
    if (currentIndex > 0) {
      this.currentQuality = levels[currentIndex - 1];
      console.log(`Quality downgraded to ${this.currentQuality.label}`);
    }
  }

  /**
   * Upgrade quality level
   */
  upgradeQuality(): void {
    const levels = this.options.qualityLevels;
    const currentIndex = levels.indexOf(this.currentQuality);
    
    if (currentIndex < levels.length - 1) {
      this.currentQuality = levels[currentIndex + 1];
      console.log(`Quality upgraded to ${this.currentQuality.label}`);
    }
  }
}

/**
 * Singleton instance for global media optimization
 */
let globalMediaOptimizer: MediaOptimizer | null = null;

export function getGlobalMediaOptimizer(options?: MediaOptimizationOptions): MediaOptimizer {
  if (!globalMediaOptimizer) {
    globalMediaOptimizer = new MediaOptimizer(options);
  }
  return globalMediaOptimizer;
}

/**
 * React hook for using MediaOptimizer
 */
export function useMediaOptimizer(options?: MediaOptimizationOptions): MediaOptimizer {
  return getGlobalMediaOptimizer(options);
}

/**
 * Network Information API types
 */
interface NetworkInformation extends EventTarget {
  downlink: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
}
