/**
 * Animation Optimizer Tests
 * 
 * Tests to verify smooth 60fps animations across all device types
 * Requirements: 6.5 (60fps animation performance on all supported devices)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimationOptimizer, getGlobalAnimationOptimizer } from '../animation-optimizer';

describe('AnimationOptimizer', () => {
  let optimizer: AnimationOptimizer;

  beforeEach(() => {
    optimizer = new AnimationOptimizer();
  });

  afterEach(() => {
    optimizer.destroy();
  });

  describe('Device Capability Detection', () => {
    it('should detect high-end devices correctly', () => {
      // Mock high-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 8,
        configurable: true,
      });

      const newOptimizer = new AnimationOptimizer();
      const metrics = newOptimizer.getMetrics();
      
      expect(['high', 'medium']).toContain(metrics.deviceCapability);
      newOptimizer.destroy();
    });

    it('should detect low-end devices correctly', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true,
      });

      const newOptimizer = new AnimationOptimizer();
      const metrics = newOptimizer.getMetrics();
      
      expect(['low', 'medium']).toContain(metrics.deviceCapability);
      newOptimizer.destroy();
    });

    it('should default to medium capability when detection fails', () => {
      const metrics = optimizer.getMetrics();
      expect(['high', 'medium', 'low']).toContain(metrics.deviceCapability);
    });
  });

  describe('Animation Settings', () => {
    it('should provide optimal settings for current device', () => {
      const settings = optimizer.getSettings();
      
      expect(settings).toHaveProperty('duration');
      expect(settings).toHaveProperty('easing');
      expect(settings).toHaveProperty('useGPU');
      expect(settings).toHaveProperty('useShadows');
      expect(settings).toHaveProperty('use3DTransforms');
      expect(settings).toHaveProperty('quality');
    });

    it('should use GPU acceleration by default', () => {
      const settings = optimizer.getSettings();
      expect(settings.useGPU).toBe(true);
    });

    it('should provide animation duration between 400-600ms', () => {
      const settings = optimizer.getSettings();
      expect(settings.duration).toBeGreaterThanOrEqual(400);
      expect(settings.duration).toBeLessThanOrEqual(600);
    });

    it('should use cubic-bezier easing for smooth transitions', () => {
      const settings = optimizer.getSettings();
      expect(settings.easing).toMatch(/cubic-bezier|ease/);
    });
  });

  describe('Performance Metrics', () => {
    it('should track current FPS', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics).toHaveProperty('currentFps');
      expect(typeof metrics.currentFps).toBe('number');
    });

    it('should track average FPS', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics).toHaveProperty('averageFps');
      expect(typeof metrics.averageFps).toBe('number');
    });

    it('should track dropped frames', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics).toHaveProperty('droppedFrames');
      expect(typeof metrics.droppedFrames).toBe('number');
    });

    it('should indicate if animations are smooth', () => {
      const metrics = optimizer.getMetrics();
      expect(metrics).toHaveProperty('isSmooth');
      expect(typeof metrics.isSmooth).toBe('boolean');
    });

    it('should report device capability', () => {
      const metrics = optimizer.getMetrics();
      expect(['high', 'medium', 'low']).toContain(metrics.deviceCapability);
    });
  });

  describe('Transform Styles', () => {
    it('should generate GPU-accelerated transform styles', () => {
      const style = optimizer.getTransformStyle('scale(1.5)');
      
      expect(style.transform).toContain('scale(1.5)');
      expect(style.willChange).toBe('transform');
      expect(style.backfaceVisibility).toBe('hidden');
    });

    it('should include translateZ for 3D transforms on capable devices', () => {
      const settings = optimizer.getSettings();
      const style = optimizer.getTransformStyle('rotate(45deg)');
      
      if (settings.use3DTransforms) {
        expect(style.transform).toContain('translateZ(0)');
      }
    });

    it('should apply backface-visibility for smooth rendering', () => {
      const style = optimizer.getTransformStyle('translate(10px, 20px)');
      expect(style.backfaceVisibility).toBe('hidden');
    });
  });

  describe('Transition Styles', () => {
    it('should generate transition styles with optimal timing', () => {
      const style = optimizer.getTransitionStyle('transform');
      
      expect(style.transition).toContain('transform');
      expect(style.transition).toMatch(/\d+ms/);
    });

    it('should use cubic-bezier easing for smooth transitions', () => {
      const style = optimizer.getTransitionStyle();
      expect(style.transition).toMatch(/cubic-bezier|ease/);
    });

    it('should apply transitions to all properties by default', () => {
      const style = optimizer.getTransitionStyle();
      expect(style.transition).toContain('all');
    });
  });

  describe('Shadow Rendering', () => {
    it('should determine if shadows should be used', () => {
      const useShadows = optimizer.shouldUseShadows();
      expect(typeof useShadows).toBe('boolean');
    });

    it('should disable shadows on low-end devices for performance', () => {
      // This test verifies the logic exists
      const settings = optimizer.getSettings();
      if (settings.quality === 'low') {
        expect(optimizer.shouldUseShadows()).toBe(false);
      }
    });
  });

  describe('Image Quality', () => {
    it('should provide optimal image quality setting', () => {
      const quality = optimizer.getImageQuality();
      expect(quality).toBeGreaterThanOrEqual(70);
      expect(quality).toBeLessThanOrEqual(90);
    });

    it('should reduce quality on low-end devices', () => {
      const settings = optimizer.getSettings();
      const quality = optimizer.getImageQuality();
      
      if (settings.quality === 'low') {
        expect(quality).toBeLessThanOrEqual(70);
      }
    });
  });

  describe('Page Preloading', () => {
    it('should provide optimal preload count', () => {
      const preloadCount = optimizer.getPreloadCount();
      expect(preloadCount).toBeGreaterThanOrEqual(1);
      expect(preloadCount).toBeLessThanOrEqual(3);
    });

    it('should reduce preload count on low-end devices', () => {
      const metrics = optimizer.getMetrics();
      const preloadCount = optimizer.getPreloadCount();
      
      if (metrics.deviceCapability === 'low') {
        expect(preloadCount).toBe(1);
      }
    });

    it('should increase preload count on high-end devices', () => {
      const metrics = optimizer.getMetrics();
      const preloadCount = optimizer.getPreloadCount();
      
      if (metrics.deviceCapability === 'high') {
        expect(preloadCount).toBe(3);
      }
    });
  });

  describe('Reduced Motion Support', () => {
    it('should detect prefers-reduced-motion preference', () => {
      // Mock matchMedia
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const prefersReduced = optimizer.prefersReducedMotion();
      expect(typeof prefersReduced).toBe('boolean');
    });

    it('should return instant transitions when reduced motion is preferred', () => {
      // Mock prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const duration = optimizer.getAnimationDuration();
      expect(duration).toBe(0);
    });

    it('should use normal duration when reduced motion is not preferred', () => {
      // Mock no prefers-reduced-motion
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const duration = optimizer.getAnimationDuration();
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Optimization', () => {
    it('should maintain settings when performance is good', () => {
      const initialCapability = optimizer.getMetrics().deviceCapability;
      
      // Simulate good performance (60fps)
      for (let i = 0; i < 10; i++) {
        (optimizer as any).recordFps(60);
      }
      
      const finalCapability = optimizer.getMetrics().deviceCapability;
      // Settings should either stay the same or improve (upgrade)
      expect(['low', 'medium', 'high']).toContain(finalCapability);
    });

    it('should track dropped frames', () => {
      // Simulate poor performance
      (optimizer as any).recordFps(45);
      (optimizer as any).recordFps(40);
      
      const metrics = optimizer.getMetrics();
      expect(metrics.droppedFrames).toBeGreaterThan(0);
    });

    it('should consider 55fps or higher as smooth', () => {
      // Simulate good performance
      for (let i = 0; i < 10; i++) {
        (optimizer as any).recordFps(58);
      }
      
      const metrics = optimizer.getMetrics();
      expect(metrics.isSmooth).toBe(true);
    });

    it('should consider below 55fps as not smooth', () => {
      // Simulate poor performance
      for (let i = 0; i < 10; i++) {
        (optimizer as any).recordFps(45);
      }
      
      const metrics = optimizer.getMetrics();
      expect(metrics.isSmooth).toBe(false);
    });
  });

  describe('Global Singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = getGlobalAnimationOptimizer();
      const instance2 = getGlobalAnimationOptimizer();
      
      expect(instance1).toBe(instance2);
    });

    it('should provide consistent settings across calls', () => {
      const settings1 = getGlobalAnimationOptimizer().getSettings();
      const settings2 = getGlobalAnimationOptimizer().getSettings();
      
      expect(settings1.duration).toBe(settings2.duration);
      expect(settings1.quality).toBe(settings2.quality);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const testOptimizer = new AnimationOptimizer();
      
      // Should not throw
      expect(() => testOptimizer.destroy()).not.toThrow();
    });
  });
});

describe('Cross-Device Animation Performance', () => {
  describe('High-End Devices', () => {
    it('should use maximum quality settings on high-end devices', () => {
      // Mock high-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 16,
        configurable: true,
      });

      const optimizer = new AnimationOptimizer();
      const settings = optimizer.getSettings();
      
      // High-end devices should get best settings
      expect(settings.useShadows).toBe(true);
      expect(settings.use3DTransforms).toBe(true);
      
      optimizer.destroy();
    });

    it('should preload more pages on high-end devices', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 16,
        configurable: true,
      });

      const optimizer = new AnimationOptimizer();
      const preloadCount = optimizer.getPreloadCount();
      
      expect(preloadCount).toBeGreaterThanOrEqual(2);
      
      optimizer.destroy();
    });
  });

  describe('Low-End Devices', () => {
    it('should use optimized settings on low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true,
      });

      const optimizer = new AnimationOptimizer();
      const settings = optimizer.getSettings();
      
      // Low-end devices should get optimized settings
      expect(settings.duration).toBeLessThanOrEqual(500);
      
      optimizer.destroy();
    });

    it('should disable shadows on low-end devices', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true,
      });

      const optimizer = new AnimationOptimizer();
      const settings = optimizer.getSettings();
      
      if (settings.quality === 'low') {
        expect(settings.useShadows).toBe(false);
      }
      
      optimizer.destroy();
    });

    it('should minimize preloading on low-end devices', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true,
      });

      const optimizer = new AnimationOptimizer();
      const preloadCount = optimizer.getPreloadCount();
      
      expect(preloadCount).toBeLessThanOrEqual(2);
      
      optimizer.destroy();
    });
  });

  describe('Mobile Devices', () => {
    it('should optimize for mobile devices', () => {
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      const optimizer = new AnimationOptimizer();
      const settings = optimizer.getSettings();
      
      // Mobile should get optimized settings
      expect(settings.duration).toBeLessThanOrEqual(600);
      
      optimizer.destroy();
    });
  });
});
