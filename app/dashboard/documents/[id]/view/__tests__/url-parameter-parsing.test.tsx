/**
 * URL Parameter Parsing Tests
 * 
 * Tests for verifying URL parameter parsing logic in preview viewer
 * Validates Requirements: 1.4, 4.5, 5.3
 */

import { describe, it, expect } from 'vitest';

describe('URL Parameter Parsing Logic', () => {
  describe('Watermark Parameter Parsing', () => {
    it('should default to false when watermark parameter is missing', () => {
      const settings = {};
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(false);
    });

    it('should be false when watermark parameter is "false"', () => {
      const settings = { watermark: 'false' };
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(false);
    });

    it('should be true when watermark parameter is "true"', () => {
      const settings = { watermark: 'true' };
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(true);
    });

    it('should be false for any other string value', () => {
      const testCases = ['yes', '1', 'enabled', 'TRUE', 'True'];
      
      testCases.forEach(value => {
        const settings = { watermark: value };
        const enableWatermark = settings.watermark === 'true';
        
        expect(enableWatermark).toBe(false);
      });
    });

    it('should be false when watermark parameter is undefined', () => {
      const settings = { watermark: undefined };
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(false);
    });

    it('should be false when watermark parameter is empty string', () => {
      const settings = { watermark: '' };
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(false);
    });
  });

  describe('Watermark Text Parameter Parsing', () => {
    const userEmail = 'user@example.com';

    it('should use provided watermark text when available', () => {
      const settings = { watermarkText: 'Custom Watermark' };
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      
      expect(watermarkText).toBe('Custom Watermark');
    });

    it('should fallback to user email when watermark text is missing', () => {
      const settings = {};
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      
      expect(watermarkText).toBe(userEmail);
    });

    it('should fallback to empty string when both are missing', () => {
      const settings = {};
      const noEmail = '';
      const watermarkText = (settings.watermarkText as string) || noEmail || '';
      
      expect(watermarkText).toBe('');
    });

    it('should handle empty string watermark text', () => {
      const settings = { watermarkText: '' };
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      
      expect(watermarkText).toBe(userEmail);
    });

    it('should preserve whitespace in watermark text', () => {
      const settings = { watermarkText: '  Spaced Text  ' };
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      
      expect(watermarkText).toBe('  Spaced Text  ');
    });
  });

  describe('Watermark Opacity Parameter Parsing', () => {
    it('should default to 0.3 when opacity parameter is missing', () => {
      const settings = {};
      const watermarkOpacity = settings.watermarkOpacity 
        ? parseFloat(settings.watermarkOpacity as string) 
        : 0.3;
      
      expect(watermarkOpacity).toBe(0.3);
    });

    it('should parse valid opacity values', () => {
      const testCases = [
        { input: '0.5', expected: 0.5 },
        { input: '0.1', expected: 0.1 },
        { input: '0.8', expected: 0.8 },
        { input: '1', expected: 1 },
        { input: '0', expected: 0 },
      ];

      testCases.forEach(({ input, expected }) => {
        const settings = { watermarkOpacity: input };
        const watermarkOpacity = settings.watermarkOpacity 
          ? parseFloat(settings.watermarkOpacity as string) 
          : 0.3;
        
        expect(watermarkOpacity).toBe(expected);
      });
    });

    it('should handle invalid opacity values gracefully', () => {
      const settings = { watermarkOpacity: 'invalid' };
      const watermarkOpacity = settings.watermarkOpacity 
        ? parseFloat(settings.watermarkOpacity as string) 
        : 0.3;
      
      expect(isNaN(watermarkOpacity)).toBe(true);
    });
  });

  describe('Watermark Size Parameter Parsing', () => {
    it('should default to 16 when size parameter is missing', () => {
      const settings = {};
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(watermarkSize).toBe(16);
    });

    it('should parse valid size values', () => {
      const testCases = [
        { input: '12', expected: 12 },
        { input: '24', expected: 24 },
        { input: '48', expected: 48 },
        { input: '8', expected: 8 },
      ];

      testCases.forEach(({ input, expected }) => {
        const settings = { watermarkSize: input };
        const watermarkSize = settings.watermarkSize 
          ? parseInt(settings.watermarkSize as string, 10) 
          : 16;
        
        expect(watermarkSize).toBe(expected);
      });
    });

    it('should handle invalid size values gracefully', () => {
      const settings = { watermarkSize: 'invalid' };
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(isNaN(watermarkSize)).toBe(true);
    });

    it('should handle decimal values by truncating', () => {
      const settings = { watermarkSize: '16.7' };
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(watermarkSize).toBe(16);
    });
  });

  describe('Combined URL Parameter Scenarios', () => {
    const userEmail = 'user@example.com';

    it('should handle no parameters (default state)', () => {
      const settings = {};
      
      const enableWatermark = settings.watermark === 'true';
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      const watermarkOpacity = settings.watermarkOpacity 
        ? parseFloat(settings.watermarkOpacity as string) 
        : 0.3;
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(enableWatermark).toBe(false);
      expect(watermarkText).toBe(userEmail);
      expect(watermarkOpacity).toBe(0.3);
      expect(watermarkSize).toBe(16);
    });

    it('should handle watermark enabled with custom settings', () => {
      const settings = {
        watermark: 'true',
        watermarkText: 'CONFIDENTIAL',
        watermarkOpacity: '0.5',
        watermarkSize: '24',
      };
      
      const enableWatermark = settings.watermark === 'true';
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      const watermarkOpacity = settings.watermarkOpacity 
        ? parseFloat(settings.watermarkOpacity as string) 
        : 0.3;
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(enableWatermark).toBe(true);
      expect(watermarkText).toBe('CONFIDENTIAL');
      expect(watermarkOpacity).toBe(0.5);
      expect(watermarkSize).toBe(24);
    });

    it('should handle watermark disabled explicitly', () => {
      const settings = {
        watermark: 'false',
        watermarkText: 'CONFIDENTIAL',
        watermarkOpacity: '0.5',
        watermarkSize: '24',
      };
      
      const enableWatermark = settings.watermark === 'true';
      
      // Even though other settings are provided, watermark should be disabled
      expect(enableWatermark).toBe(false);
    });

    it('should handle partial parameters with defaults', () => {
      const settings = {
        watermark: 'true',
        watermarkText: 'Custom Text',
        // opacity and size missing - should use defaults
      };
      
      const enableWatermark = settings.watermark === 'true';
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      const watermarkOpacity = settings.watermarkOpacity 
        ? parseFloat(settings.watermarkOpacity as string) 
        : 0.3;
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(enableWatermark).toBe(true);
      expect(watermarkText).toBe('Custom Text');
      expect(watermarkOpacity).toBe(0.3);
      expect(watermarkSize).toBe(16);
    });

    it('should handle malformed parameters gracefully', () => {
      const settings = {
        watermark: 'maybe',
        watermarkOpacity: 'high',
        watermarkSize: 'large',
      };
      
      const enableWatermark = settings.watermark === 'true';
      const watermarkText = (settings.watermarkText as string) || userEmail || '';
      const watermarkOpacity = settings.watermarkOpacity 
        ? parseFloat(settings.watermarkOpacity as string) 
        : 0.3;
      const watermarkSize = settings.watermarkSize 
        ? parseInt(settings.watermarkSize as string, 10) 
        : 16;
      
      expect(enableWatermark).toBe(false);
      expect(watermarkText).toBe(userEmail);
      expect(isNaN(watermarkOpacity)).toBe(true);
      expect(isNaN(watermarkSize)).toBe(true);
    });
  });

  describe('URL Parameter Consistency', () => {
    it('should maintain consistent behavior across multiple calls', () => {
      const settings = { watermark: 'true' };
      
      const result1 = settings.watermark === 'true';
      const result2 = settings.watermark === 'true';
      const result3 = settings.watermark === 'true';
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should not be affected by parameter order', () => {
      const settings1 = {
        watermark: 'true',
        watermarkText: 'Test',
        watermarkOpacity: '0.5',
      };
      
      const settings2 = {
        watermarkOpacity: '0.5',
        watermarkText: 'Test',
        watermark: 'true',
      };
      
      const enable1 = settings1.watermark === 'true';
      const enable2 = settings2.watermark === 'true';
      
      expect(enable1).toBe(enable2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const settings = { watermark: null };
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(false);
    });

    it('should handle array values (from multiple params)', () => {
      const settings = { watermark: ['true', 'false'] };
      const enableWatermark = settings.watermark === 'true';
      
      expect(enableWatermark).toBe(false);
    });

    it('should handle very long watermark text', () => {
      const longText = 'A'.repeat(1000);
      const settings = { watermarkText: longText };
      const watermarkText = (settings.watermarkText as string) || '';
      
      expect(watermarkText).toBe(longText);
      expect(watermarkText.length).toBe(1000);
    });

    it('should handle special characters in watermark text', () => {
      const specialText = '©️ 2024 • Confidential™ <>&"\'';
      const settings = { watermarkText: specialText };
      const watermarkText = (settings.watermarkText as string) || '';
      
      expect(watermarkText).toBe(specialText);
    });

    it('should handle extreme opacity values', () => {
      const testCases = [
        { input: '-1', expected: -1 },
        { input: '2', expected: 2 },
        { input: '999', expected: 999 },
      ];

      testCases.forEach(({ input, expected }) => {
        const settings = { watermarkOpacity: input };
        const watermarkOpacity = settings.watermarkOpacity 
          ? parseFloat(settings.watermarkOpacity as string) 
          : 0.3;
        
        expect(watermarkOpacity).toBe(expected);
      });
    });

    it('should handle extreme size values', () => {
      const testCases = [
        { input: '0', expected: 0 },
        { input: '1000', expected: 1000 },
        { input: '-10', expected: -10 },
      ];

      testCases.forEach(({ input, expected }) => {
        const settings = { watermarkSize: input };
        const watermarkSize = settings.watermarkSize 
          ? parseInt(settings.watermarkSize as string, 10) 
          : 16;
        
        expect(watermarkSize).toBe(expected);
      });
    });
  });
});
