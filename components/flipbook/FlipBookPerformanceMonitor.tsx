'use client';

import React, { useEffect, useState, useRef } from 'react';

interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameTime: number;
  isSmooth: boolean;
}

interface FlipBookPerformanceMonitorProps {
  enabled?: boolean;
  targetFps?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

/**
 * FlipBookPerformanceMonitor - Monitors animation performance
 * 
 * Tracks FPS and frame times to ensure smooth 60fps animations
 * Requirements: 6.5 (60fps animation performance)
 */
export function FlipBookPerformanceMonitor({
  enabled = false,
  targetFps = 60,
  onMetricsUpdate,
}: FlipBookPerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    avgFps: 0,
    minFps: 0,
    maxFps: 0,
    frameTime: 0,
    isSmooth: true,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const measurePerformance = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        // Calculate FPS
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        
        // Update FPS history (keep last 10 measurements)
        fpsHistoryRef.current.push(fps);
        if (fpsHistoryRef.current.length > 10) {
          fpsHistoryRef.current.shift();
        }

        // Calculate statistics
        const avgFps = Math.round(
          fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
        );
        const minFps = Math.min(...fpsHistoryRef.current);
        const maxFps = Math.max(...fpsHistoryRef.current);
        const frameTime = delta / frameCountRef.current;
        const isSmooth = avgFps >= targetFps * 0.9; // 90% of target FPS

        const newMetrics: PerformanceMetrics = {
          fps,
          avgFps,
          minFps,
          maxFps,
          frameTime,
          isSmooth,
        };

        setMetrics(newMetrics);
        onMetricsUpdate?.(newMetrics);

        // Reset counters
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      frameCountRef.current++;
      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    };

    animationFrameRef.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, targetFps, onMetricsUpdate]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 backdrop-blur-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">FPS:</span>
          <span className={metrics.isSmooth ? 'text-green-400' : 'text-red-400'}>
            {metrics.fps}
          </span>
          <span className="text-gray-500">/ {targetFps}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Avg:</span>
          <span>{metrics.avgFps}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Min/Max:</span>
          <span>{metrics.minFps} / {metrics.maxFps}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Frame:</span>
          <span>{metrics.frameTime.toFixed(2)}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Status:</span>
          <span className={metrics.isSmooth ? 'text-green-400' : 'text-yellow-400'}>
            {metrics.isSmooth ? '✓ Smooth' : '⚠ Choppy'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for using performance monitoring
 */
export function useFlipBookPerformance(enabled: boolean = false) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
    setMetrics(newMetrics);
  };

  return {
    metrics,
    handleMetricsUpdate,
    PerformanceMonitor: () => (
      <FlipBookPerformanceMonitor
        enabled={enabled}
        onMetricsUpdate={handleMetricsUpdate}
      />
    ),
  };
}
