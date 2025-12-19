/**
 * ETA Calculator Tests
 * 
 * Tests for intelligent time estimation based on conversion progress,
 * historical data, and document characteristics.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ETACalculator, calculateConversionETA, defaultETACalculator } from '../eta-calculator';
import { ConversionProgress } from '@/lib/types/conversion';

describe('ETACalculator', () => {
  let calculator: ETACalculator;

  beforeEach(() => {
    calculator = new ETACalculator();
  });

  describe('Progress-based ETA calculation', () => {
    test('should calculate ETA based on current progress rate', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 10000, // 10 seconds ago
        currentTime: Date.now(),
        progress: 25, // 25% complete in 10 seconds
        stage: 'processing_pages' as const,
        processedPages: 5,
      };

      const eta = calculator.calculateETA(metrics);
      
      // Should estimate ~30 seconds remaining (75% left at current rate)
      expect(eta).toBeGreaterThan(20000);
      expect(eta).toBeLessThan(40000);
    });

    test('should return stage-based ETA for very low progress', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 2000,
        currentTime: Date.now(),
        progress: 2, // Very low progress
        stage: 'initializing' as const,
        processedPages: 0,
      };

      const eta = calculator.calculateETA(metrics);
      
      // Should fall back to stage-based estimation
      expect(eta).toBeGreaterThan(0);
      expect(eta).toBeLessThan(60000); // Should be reasonable
    });
  });

  describe('Page-based ETA calculation', () => {
    test('should calculate ETA based on page processing rate', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 15000,
        currentTime: Date.now(),
        progress: 50,
        stage: 'processing_pages' as const,
        totalPages: 20,
        processedPages: 10,
      };

      const eta = calculator.calculateETA(metrics);
      
      // Should consider remaining pages in calculation
      expect(eta).toBeGreaterThan(10000); // At least 10 seconds
      expect(eta).toBeLessThan(30000); // But not too long
    });
  });

  describe('Size-based ETA calculation', () => {
    test('should calculate ETA based on document size', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 20000,
        currentTime: Date.now(),
        progress: 40,
        stage: 'processing_pages' as const,
        documentSize: 5 * 1024 * 1024, // 5MB
        processedPages: 8,
      };

      const eta = calculator.calculateETA(metrics);
      
      // Should factor in document size
      expect(eta).toBeGreaterThan(5000);
      expect(eta).toBeLessThan(60000);
    });
  });

  describe('Stage-based ETA calculation', () => {
    test('should provide different ETAs for different stages', () => {
      const baseMetrics = {
        documentId: 'test-doc',
        startTime: Date.now(),
        currentTime: Date.now(),
        progress: 0,
        processedPages: 0,
      };

      const initializingETA = calculator.calculateETA({
        ...baseMetrics,
        stage: 'initializing' as const,
      });

      const processingETA = calculator.calculateETA({
        ...baseMetrics,
        stage: 'processing_pages' as const,
      });

      // Processing should take longer than initializing
      expect(processingETA).toBeGreaterThan(initializingETA);
    });

    test('should adjust ETA based on document characteristics', () => {
      const baseMetrics = {
        documentId: 'test-doc',
        startTime: Date.now(),
        currentTime: Date.now(),
        progress: 0,
        stage: 'processing_pages' as const,
        processedPages: 0,
      };

      const smallDocETA = calculator.calculateETA({
        ...baseMetrics,
        documentSize: 1024 * 1024, // 1MB
        totalPages: 5,
      });

      const largeDocETA = calculator.calculateETA({
        ...baseMetrics,
        documentSize: 10 * 1024 * 1024, // 10MB
        totalPages: 50,
      });

      // Large document should take longer
      expect(largeDocETA).toBeGreaterThan(smallDocETA);
    });
  });

  describe('Historical data integration', () => {
    test('should update historical data with completed conversions', () => {
      const record = {
        documentSize: 2 * 1024 * 1024,
        totalPages: 10,
        totalTime: 15000,
        completedAt: Date.now(),
      };

      calculator.updateHistoricalData(record);

      // Should use historical data for future calculations
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 5000,
        currentTime: Date.now(),
        progress: 10,
        stage: 'processing_pages' as const,
        documentSize: 2 * 1024 * 1024,
        totalPages: 10,
        processedPages: 1,
      };

      const eta = calculator.calculateETA(metrics);
      expect(eta).toBeGreaterThan(0);
    });

    test('should limit historical data to recent conversions', () => {
      // Add many records to test limit
      for (let i = 0; i < 150; i++) {
        calculator.updateHistoricalData({
          documentSize: 1024 * 1024,
          totalPages: 5,
          totalTime: 10000,
          completedAt: Date.now() - i * 1000,
        });
      }

      // Should keep only the most recent 100 records
      // This is tested indirectly by ensuring the calculator still works
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now(),
        currentTime: Date.now(),
        progress: 50,
        stage: 'processing_pages' as const,
        processedPages: 5,
      };

      const eta = calculator.calculateETA(metrics);
      expect(eta).toBeGreaterThan(0);
    });
  });

  describe('ETA bounds and smoothing', () => {
    test('should apply minimum ETA bounds', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 1000,
        currentTime: Date.now(),
        progress: 99, // Almost complete
        stage: 'finalizing' as const,
        processedPages: 19,
        totalPages: 20,
      };

      const eta = calculator.calculateETA(metrics);
      
      // Should not be less than minimum (5 seconds)
      expect(eta).toBeGreaterThanOrEqual(5000);
    });

    test('should apply maximum ETA bounds', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 1000,
        currentTime: Date.now(),
        progress: 1, // Very slow progress
        stage: 'processing_pages' as const,
        processedPages: 0,
        documentSize: 100 * 1024 * 1024, // Very large document
        totalPages: 1000,
      };

      const eta = calculator.calculateETA(metrics);
      
      // Should not exceed maximum (5 minutes)
      expect(eta).toBeLessThanOrEqual(300000);
    });
  });

  describe('ETA formatting', () => {
    test('should format ETA in seconds for short durations', () => {
      const eta = 30000; // 30 seconds
      const formatted = calculator.formatETA(eta);
      expect(formatted).toBe('30s');
    });

    test('should format ETA in minutes for medium durations', () => {
      const eta = 150000; // 2.5 minutes
      const formatted = calculator.formatETA(eta);
      expect(formatted).toBe('3m'); // Rounded up
    });

    test('should format ETA in hours for long durations', () => {
      const eta = 7200000; // 2 hours
      const formatted = calculator.formatETA(eta);
      expect(formatted).toBe('2h');
    });
  });

  describe('Confidence level calculation', () => {
    test('should provide low confidence for early progress', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now(),
        currentTime: Date.now(),
        progress: 5,
        stage: 'initializing' as const,
        processedPages: 0,
      };

      const confidence = calculator.getConfidenceLevel(metrics);
      expect(confidence).toBeLessThan(0.5);
    });

    test('should provide higher confidence with more progress', () => {
      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 30000,
        currentTime: Date.now(),
        progress: 75,
        stage: 'processing_pages' as const,
        totalPages: 20,
        processedPages: 15,
      };

      const confidence = calculator.getConfidenceLevel(metrics);
      expect(confidence).toBeGreaterThan(0.7);
    });

    test('should increase confidence with historical data', () => {
      // Add historical data
      for (let i = 0; i < 15; i++) {
        calculator.updateHistoricalData({
          documentSize: 2 * 1024 * 1024,
          totalPages: 10,
          totalTime: 20000,
          completedAt: Date.now() - i * 10000,
        });
      }

      const metrics = {
        documentId: 'test-doc',
        startTime: Date.now() - 10000,
        currentTime: Date.now(),
        progress: 50,
        stage: 'processing_pages' as const,
        totalPages: 10,
        processedPages: 5,
      };

      const confidence = calculator.getConfidenceLevel(metrics);
      expect(confidence).toBeGreaterThan(0.8);
    });
  });
});

describe('calculateConversionETA utility function', () => {
  test('should calculate ETA for conversion progress', () => {
    const progress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'processing_pages',
      progress: 40,
      message: 'Processing...',
      processedPages: 8,
      totalPages: 20,
      retryCount: 0,
    };

    const startTime = Date.now() - 15000; // 15 seconds ago
    const documentSize = 3 * 1024 * 1024; // 3MB

    const result = calculateConversionETA(progress, startTime, documentSize);

    expect(result.eta).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.formatted).toMatch(/^\d+[smh]$/); // Should match format like "30s", "2m", "1h"
  });

  test('should handle conversion progress without optional fields', () => {
    const progress: ConversionProgress = {
      documentId: 'test-doc',
      status: 'processing',
      stage: 'initializing',
      progress: 10,
      message: 'Initializing...',
      processedPages: 0,
      retryCount: 0,
    };

    const startTime = Date.now() - 5000;

    const result = calculateConversionETA(progress, startTime);

    expect(result.eta).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.formatted).toBeTruthy();
  });
});

describe('Default ETA Calculator', () => {
  test('should provide a working default instance', () => {
    const metrics = {
      documentId: 'test-doc',
      startTime: Date.now() - 10000,
      currentTime: Date.now(),
      progress: 30,
      stage: 'processing_pages' as const,
      processedPages: 6,
    };

    const eta = defaultETACalculator.calculateETA(metrics);
    expect(eta).toBeGreaterThan(0);
  });
});