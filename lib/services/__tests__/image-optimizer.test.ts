/**
 * Tests for Image Optimizer Service
 */

import { imageOptimizer } from '../image-optimizer';

// Mock navigator.connection
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false
};

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: mockConnection
});

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  height: number = 0;

  constructor() {
    setTimeout(() => {
      // Simulate WebP support detection
      if (this.src.includes('webp')) {
        this.height = 2; // WebP supported
      }
      this.onload?.();
    }, 0);
  }
} as any;

describe('ImageOptimizer', () => {
  beforeEach(() => {
    // Reset connection mock
    (navigator as any).connection = mockConnection;
    
    // Reset singleton instance for testing
    (imageOptimizer as any).networkInfo = null;
    (imageOptimizer as any).webpSupported = null;
    (imageOptimizer as any).detectNetworkSpeed();
  });

  describe('optimizeImage', () => {
    it('should optimize image with default options', async () => {
      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg');
      
      expect(result).toMatchObject({
        url: expect.stringContaining('https://'),
        fallbackUrl: expect.stringContaining('https://'),
        format: expect.stringMatching(/webp|jpeg/),
        progressive: true
      });
    });

    it('should use WebP format when supported', async () => {
      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {
        format: 'auto'
      });
      
      expect(result.format).toBe('webp');
    });

    it('should apply custom dimensions', async () => {
      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {
        width: 800,
        height: 600
      });
      
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should apply custom quality', async () => {
      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {
        quality: 90
      });
      
      expect(result.url).toContain('q=90');
    });

    it('should handle Supabase URLs', async () => {
      const supabaseUrl = 'https://project.supabase.co/storage/v1/object/public/bucket/image.jpg';
      const result = await imageOptimizer.optimizeImage(supabaseUrl);
      
      expect(result.url).toContain('supabase');
      expect(result.url).toContain('format=webp');
    });
  });

  describe('getResponsiveImages', () => {
    it('should generate multiple image sizes', async () => {
      const sizes = [320, 640, 1024];
      const results = await imageOptimizer.getResponsiveImages(
        'https://example.com/image.jpg',
        sizes
      );
      
      expect(results).toHaveLength(3);
      expect(results[0].width).toBe(320);
      expect(results[1].width).toBe(640);
      expect(results[2].width).toBe(1024);
    });
  });

  describe('preloadImage', () => {
    it('should preload image successfully', async () => {
      await expect(
        imageOptimizer.preloadImage('https://example.com/image.jpg')
      ).resolves.toBeUndefined();
    });

    it('should fallback to fallback URL on error', async () => {
      // Mock image error
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src: string = '';

        constructor() {
          setTimeout(() => {
            if (this.src.includes('error')) {
              this.onerror?.();
            } else {
              this.onload?.();
            }
          }, 0);
        }
      } as any;

      await expect(
        imageOptimizer.preloadImage(
          'https://example.com/error.jpg',
          'https://example.com/fallback.jpg'
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('network detection', () => {
    it('should detect fast network', () => {
      (navigator as any).connection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false
      };
      (imageOptimizer as any).networkInfo = null;
      (imageOptimizer as any).detectNetworkSpeed();

      const networkInfo = imageOptimizer.getNetworkInfo();
      expect(networkInfo?.type).toBe('4g');
      expect(networkInfo?.downlink).toBe(10);
    });

    it('should detect slow network', () => {
      (navigator as any).connection = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 2000,
        saveData: true
      };
      (imageOptimizer as any).networkInfo = null;
      (imageOptimizer as any).detectNetworkSpeed();

      const networkInfo = imageOptimizer.getNetworkInfo();
      expect(networkInfo?.type).toBe('2g');
      expect(networkInfo?.saveData).toBe(true);
    });

    it('should handle missing connection API', () => {
      (navigator as any).connection = undefined;
      (imageOptimizer as any).networkInfo = null;
      (imageOptimizer as any).detectNetworkSpeed();
      
      const networkInfo = imageOptimizer.getNetworkInfo();
      expect(networkInfo).toBeNull();
    });
  });

  describe('WebP detection', () => {
    it('should detect WebP support', async () => {
      const supported = await imageOptimizer.isWebPSupported();
      expect(typeof supported).toBe('boolean');
    });
  });

  describe('adaptive quality', () => {
    it('should use lower quality for slow networks', async () => {
      (navigator as any).connection = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 2000,
        saveData: false
      };
      (imageOptimizer as any).networkInfo = null;
      (imageOptimizer as any).detectNetworkSpeed();

      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {
        networkSpeed: 'auto'
      });
      
      expect(result.url).toContain('q=60');
    });

    it('should use higher quality for fast networks', async () => {
      (navigator as any).connection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false
      };
      (imageOptimizer as any).networkInfo = null;
      (imageOptimizer as any).detectNetworkSpeed();

      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {
        networkSpeed: 'auto'
      });
      
      expect(result.url).toContain('q=85');
    });

    it('should respect saveData preference', async () => {
      (navigator as any).connection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: true
      };
      (imageOptimizer as any).networkInfo = null;
      (imageOptimizer as any).detectNetworkSpeed();

      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {
        networkSpeed: 'auto'
      });
      
      expect(result.url).toContain('q=60');
    });
  });

  describe('URL building', () => {
    it('should build Supabase URLs correctly', async () => {
      const supabaseUrl = 'https://project.supabase.co/storage/v1/object/public/bucket/image.jpg';
      const result = await imageOptimizer.optimizeImage(supabaseUrl, {
        width: 800,
        quality: 80,
        format: 'webp'
      });
      
      expect(result.url).toContain('w=800');
      expect(result.url).toContain('q=80');
      expect(result.url).toContain('format=webp');
    });

    it('should build generic URLs with optimization markers', async () => {
      const genericUrl = 'https://cdn.example.com/image.jpg';
      const result = await imageOptimizer.optimizeImage(genericUrl);
      
      expect(result.url).toContain('opt=1');
      expect(result.url).toContain('f=webp');
    });
  });

  describe('error handling', () => {
    it('should handle invalid URLs gracefully', async () => {
      await expect(
        imageOptimizer.optimizeImage('invalid-url')
      ).resolves.toMatchObject({
        url: expect.any(String),
        fallbackUrl: expect.any(String)
      });
    });

    it('should handle missing options', async () => {
      const result = await imageOptimizer.optimizeImage('https://example.com/image.jpg', {});
      
      expect(result).toMatchObject({
        url: expect.any(String),
        fallbackUrl: expect.any(String),
        progressive: true
      });
    });
  });
});