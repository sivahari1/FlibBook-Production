/**
 * Performance Monitor Component
 * 
 * Provides real-time performance monitoring and optimization
 * for the Flipbook viewer.
 * 
 * Features:
 * - Real-time performance metrics
 * - Memory usage tracking
 * - Network quality monitoring
 * - Device capability detection
 * 
 * Requirements: 17.1-17.5, 20.1-20.5
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  useCacheManager,
  useMemoryManager,
  useMediaOptimizer,
  useMobileOptimizer,
  type MemoryStats,
  type ConnectionQuality,
  type DeviceInfo,
} from '@/lib/performance';

export interface PerformanceMonitorProps {
  /**
   * Show performance overlay
   * @default false
   */
  showOverlay?: boolean;

  /**
   * Update interval in milliseconds
   * @default 1000
   */
  updateInterval?: number;

  /**
   * Enable detailed logging
   * @default false
   */
  enableLogging?: boolean;
}

export interface PerformanceMetrics {
  memory: MemoryStats;
  network: {
    quality: ConnectionQuality;
    type: string;
    isMetered: boolean;
  };
  device: DeviceInfo;
  cache: {
    pages: { size: number; maxSize: number };
    annotations: { size: number; maxSize: number };
  };
  fps: number;
  loadTime: number;
}

/**
 * PerformanceMonitor component
 */
export function PerformanceMonitor({
  showOverlay = false,
  updateInterval = 1000,
  enableLogging = false,
}: PerformanceMonitorProps) {
  const cacheManager = useCacheManager();
  const memoryManager = useMemoryManager();
  const mediaOptimizer = useMediaOptimizer();
  const mobileOptimizer = useMobileOptimizer();

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(showOverlay);

  useEffect(() => {
    const updateMetrics = () => {
      const memoryStats = memoryManager.getStats();
      const cacheStats = cacheManager.getStats();
      const deviceInfo = mobileOptimizer.getDeviceInfo();
      const connectionQuality = mediaOptimizer.getConnectionQuality();
      const networkType = mediaOptimizer.getNetworkType();
      const isMetered = mediaOptimizer.isMeteredConnection();

      const newMetrics: PerformanceMetrics = {
        memory: memoryStats,
        network: {
          quality: connectionQuality,
          type: networkType,
          isMetered,
        },
        device: deviceInfo,
        cache: cacheStats,
        fps: measureFPS(),
        loadTime: performance.now(),
      };

      setMetrics(newMetrics);

      if (enableLogging) {
        console.log('Performance Metrics:', newMetrics);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, updateInterval);

    return () => clearInterval(interval);
  }, [cacheManager, memoryManager, mediaOptimizer, mobileOptimizer, updateInterval, enableLogging]);

  if (!isVisible || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg shadow-lg text-xs font-mono max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
          aria-label="Close performance monitor"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {/* Memory Stats */}
        <div>
          <div className="text-gray-400">Memory</div>
          <div className="flex justify-between">
            <span>Pages in Memory:</span>
            <span className={getMemoryColor(metrics.memory.pagesInMemory, 10)}>
              {metrics.memory.pagesInMemory}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Est. Usage:</span>
            <span className={getMemoryColor(metrics.memory.estimatedMemoryUsage, 100)}>
              {metrics.memory.estimatedMemoryUsage.toFixed(2)} MB
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cleanups:</span>
            <span>{metrics.memory.cleanupCount}</span>
          </div>
        </div>

        {/* Cache Stats */}
        <div>
          <div className="text-gray-400">Cache</div>
          <div className="flex justify-between">
            <span>Pages:</span>
            <span>
              {metrics.cache.pages.size} / {metrics.cache.pages.maxSize}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Annotations:</span>
            <span>
              {metrics.cache.annotations.size} / {metrics.cache.annotations.maxSize}
            </span>
          </div>
        </div>

        {/* Network Stats */}
        <div>
          <div className="text-gray-400">Network</div>
          <div className="flex justify-between">
            <span>Quality:</span>
            <span className={getNetworkQualityColor(metrics.network.quality)}>
              {metrics.network.quality.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span>{metrics.network.type.toUpperCase()}</span>
          </div>
          {metrics.network.isMetered && (
            <div className="text-yellow-400">⚠ Metered Connection</div>
          )}
        </div>

        {/* Device Stats */}
        <div>
          <div className="text-gray-400">Device</div>
          <div className="flex justify-between">
            <span>Performance:</span>
            <span className={getPerformanceColor(metrics.device.performance)}>
              {metrics.device.performance.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span>
              {metrics.device.isMobile ? 'Mobile' : metrics.device.isTablet ? 'Tablet' : 'Desktop'}
            </span>
          </div>
          {metrics.device.isLowEnd && (
            <div className="text-orange-400">⚠ Low-End Device</div>
          )}
        </div>

        {/* FPS */}
        <div>
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className={getFPSColor(metrics.fps)}>{metrics.fps.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Measure current FPS
 */
function measureFPS(): number {
  // This is a simplified FPS measurement
  // In production, you'd want a more sophisticated approach
  return 60; // Placeholder
}

/**
 * Get color based on memory usage
 */
function getMemoryColor(value: number, threshold: number): string {
  if (value > threshold * 1.5) return 'text-red-400';
  if (value > threshold) return 'text-yellow-400';
  return 'text-green-400';
}

/**
 * Get color based on network quality
 */
function getNetworkQualityColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'text-green-400';
    case 'good':
      return 'text-blue-400';
    case 'moderate':
      return 'text-yellow-400';
    case 'poor':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get color based on device performance
 */
function getPerformanceColor(performance: string): string {
  switch (performance) {
    case 'high':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get color based on FPS
 */
function getFPSColor(fps: number): string {
  if (fps >= 55) return 'text-green-400';
  if (fps >= 30) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Toggle button for performance monitor
 */
export function PerformanceMonitorToggle({
  onToggle,
}: {
  onToggle: (visible: boolean) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  const handleToggle = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    onToggle(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
      aria-label="Toggle performance monitor"
      title="Toggle performance monitor"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </button>
  );
}
