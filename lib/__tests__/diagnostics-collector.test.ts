/**
 * Unit Tests for DiagnosticsCollector
 * 
 * Tests performance tracking, bottleneck identification, and diagnostic data collection
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { RenderingMethod, RenderingStage, ErrorType } from '../pdf-reliability/types';
import { createReliabilityConfig } from '../pdf-reliability/config';

describe('DiagnosticsCollector', () => {
  let diagnosticsCollector: DiagnosticsCollector;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = createReliabilityConfig({
      enableDiagnostics: true,
      memoryPressureThreshold: 100 * 1024 * 1024, // 100MB
    });
    diagnosticsCollector = new DiagnosticsCollector(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Diagnostics Lifecycle', () => {
    test('should start diagnostics collection correctly', () => {
      const renderingId = 'test-rendering-1';
      const method = RenderingMethod.PDFJS_CANVAS;
      const stage = RenderingStage.INITIALIZING;

      diagnosticsCollector.startDiagnostics(renderingId, method, stage);

      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics).toBeDefined();
      expect(diagnostics!.renderingId).toBe(renderingId);
      expect(diagnostics!.method).toBe(method);
      expect(diagnostics!.stage).toBe(stage);
      expect(diagnostics!.startTime).toBeInstanceOf(Date);
      expect(diagnostics!.errors).toEqual([]);
      expect(diagnostics!.browserInfo).toBeDefined();
      expect(diagnostics!.browserInfo.userAgent).toBeDefined();
    });

    test('should not start diagnostics when disabled', () => {
      const disabledConfig = createReliabilityConfig({
        enableDiagnostics: false,
      });
      const disabledCollector = new DiagnosticsCollector(disabledConfig);

      disabledCollector.startDiagnostics('test-id', RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);

      const diagnostics = disabledCollector.getDiagnostics('test-id');
      expect(diagnostics).toBeNull();
    });

    test('should update stage correctly', () => {
      const renderingId = 'test-rendering-2';
      
      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      diagnosticsCollector.updateStage(renderingId, RenderingStage.FETCHING);

      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics!.stage).toBe(RenderingStage.FETCHING);
    });

    test('should complete diagnostics and calculate total time', () => {
      const renderingId = 'test-rendering-3';
      
      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      // Wait a small amount to ensure time difference
      const startTime = Date.now();
      
      const completedDiagnostics = diagnosticsCollector.completeDiagnostics(renderingId);
      
      expect(completedDiagnostics).toBeDefined();
      expect(completedDiagnostics!.endTime).toBeInstanceOf(Date);
      expect(completedDiagnostics!.totalTime).toBeGreaterThanOrEqual(0);
      
      // Should be removed from active diagnostics
      const activeDiagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(activeDiagnostics).toBeNull();
    });
  });

  describe('Performance Metrics Tracking', () => {
    test('should update performance metrics correctly', () => {
      const renderingId = 'test-perf-1';
      const metrics = {
        networkTime: 2500,
        parseTime: 1200,
        renderTime: 8000,
        memoryUsage: 45.5,
      };

      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.RENDERING);
      diagnosticsCollector.updatePerformanceMetrics(renderingId, metrics);

      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics!.performanceMetrics).toEqual(metrics);
    });

    test('should merge performance metrics updates', () => {
      const renderingId = 'test-perf-2';

      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.FETCHING);
      
      diagnosticsCollector.updatePerformanceMetrics(renderingId, {
        networkTime: 1500,
      });
      
      diagnosticsCollector.updatePerformanceMetrics(renderingId, {
        parseTime: 800,
        renderTime: 5000,
      });

      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics!.performanceMetrics.networkTime).toBe(1500);
      expect(diagnostics!.performanceMetrics.parseTime).toBe(800);
      expect(diagnostics!.performanceMetrics.renderTime).toBe(5000);
    });

    test('should handle memory usage tracking', () => {
      const renderingId = 'test-memory-1';
      
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      };
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true,
      });

      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.RENDERING);
      const completedDiagnostics = diagnosticsCollector.completeDiagnostics(renderingId);

      expect(completedDiagnostics!.performanceMetrics.memoryUsage).toBeCloseTo(50, 1);
    });
  });

  describe('Error Tracking', () => {
    test('should add errors to diagnostics', () => {
      const renderingId = 'test-error-1';
      const error = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Failed to fetch PDF',
        stage: RenderingStage.FETCHING,
        method: RenderingMethod.PDFJS_CANVAS,
        timestamp: new Date(),
        context: { url: 'https://example.com/test.pdf' },
        recoverable: true,
      };

      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.FETCHING);
      diagnosticsCollector.addError(renderingId, error);

      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics!.errors).toHaveLength(1);
      expect(diagnostics!.errors[0]).toEqual(error);
    });

    test('should accumulate multiple errors', () => {
      const renderingId = 'test-error-2';
      const errors = [
        {
          type: ErrorType.NETWORK_ERROR,
          message: 'Network timeout',
          stage: RenderingStage.FETCHING,
          method: RenderingMethod.PDFJS_CANVAS,
          timestamp: new Date(),
          context: {},
          recoverable: true,
        },
        {
          type: ErrorType.CANVAS_ERROR,
          message: 'Canvas context lost',
          stage: RenderingStage.RENDERING,
          method: RenderingMethod.PDFJS_CANVAS,
          timestamp: new Date(),
          context: {},
          recoverable: true,
        },
      ];

      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.FETCHING);
      errors.forEach(error => diagnosticsCollector.addError(renderingId, error));

      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics!.errors).toHaveLength(2);
      expect(diagnostics!.errors).toEqual(errors);
    });
  });

  describe('Bottleneck Identification', () => {
    test('should identify slow network as bottleneck', () => {
      const diagnostics = {
        renderingId: 'test-bottleneck-1',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [],
        performanceMetrics: {
          networkTime: 12000, // > 10s threshold
          parseTime: 2000,
          renderTime: 5000,
        },
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics);
      expect(bottlenecks).toContain('Slow network response (>10s)');
    });

    test('should identify slow parsing as bottleneck', () => {
      const diagnostics = {
        renderingId: 'test-bottleneck-2',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [],
        performanceMetrics: {
          networkTime: 3000,
          parseTime: 6000, // > 5s threshold
          renderTime: 4000,
        },
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics);
      expect(bottlenecks).toContain('Slow PDF parsing (>5s)');
    });

    test('should identify slow rendering as bottleneck', () => {
      const diagnostics = {
        renderingId: 'test-bottleneck-3',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [],
        performanceMetrics: {
          networkTime: 2000,
          parseTime: 1500,
          renderTime: 18000, // > 15s threshold
        },
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics);
      expect(bottlenecks).toContain('Slow rendering (>15s)');
    });

    test('should identify high memory usage as bottleneck', () => {
      const diagnostics = {
        renderingId: 'test-bottleneck-4',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [],
        performanceMetrics: {
          networkTime: 2000,
          parseTime: 1500,
          renderTime: 8000,
          memoryUsage: 150, // > 100MB threshold
        },
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics);
      expect(bottlenecks).toContain('High memory usage');
    });

    test('should identify multiple errors as bottleneck', () => {
      const diagnostics = {
        renderingId: 'test-bottleneck-5',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [
          { type: ErrorType.NETWORK_ERROR, message: 'Error 1' },
          { type: ErrorType.CANVAS_ERROR, message: 'Error 2' },
          { type: ErrorType.MEMORY_ERROR, message: 'Error 3' },
        ] as any,
        performanceMetrics: {},
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics);
      expect(bottlenecks).toContain('Multiple errors occurred');
    });

    test('should identify multiple bottlenecks', () => {
      const diagnostics = {
        renderingId: 'test-bottleneck-6',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [
          { type: ErrorType.NETWORK_ERROR, message: 'Error 1' },
          { type: ErrorType.CANVAS_ERROR, message: 'Error 2' },
          { type: ErrorType.MEMORY_ERROR, message: 'Error 3' },
        ] as any,
        performanceMetrics: {
          networkTime: 12000, // Slow network
          renderTime: 20000, // Slow rendering
          memoryUsage: 200, // High memory
        },
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics);
      expect(bottlenecks).toHaveLength(4);
      expect(bottlenecks).toContain('Slow network response (>10s)');
      expect(bottlenecks).toContain('Slow rendering (>15s)');
      expect(bottlenecks).toContain('High memory usage');
      expect(bottlenecks).toContain('Multiple errors occurred');
    });
  });

  describe('Diagnostic Reporting', () => {
    test('should generate comprehensive diagnostic report', () => {
      const diagnostics = {
        renderingId: 'test-report-1',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:15Z'),
        totalTime: 15000,
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [
          {
            type: ErrorType.NETWORK_ERROR,
            message: 'Temporary network issue',
            stage: RenderingStage.FETCHING,
            method: RenderingMethod.PDFJS_CANVAS,
            timestamp: new Date('2024-01-01T10:00:05Z'),
            context: { retryCount: 1 },
            recoverable: true,
          },
        ],
        performanceMetrics: {
          networkTime: 3000,
          parseTime: 2000,
          renderTime: 8000,
          memoryUsage: 75.5,
        },
        browserInfo: {
          userAgent: 'Mozilla/5.0 (Test Browser)',
          platform: 'Test Platform',
          language: 'en-US',
        },
      };

      const report = diagnosticsCollector.generateReport(diagnostics);

      // Check report structure and content
      expect(report).toContain('=== PDF Rendering Diagnostics Report ===');
      expect(report).toContain('Rendering ID: test-report-1');
      expect(report).toContain('Method: pdfjs-canvas');
      expect(report).toContain('Stage: complete');
      expect(report).toContain('Total Time: 15000ms');
      
      // Performance metrics
      expect(report).toContain('--- Performance Metrics ---');
      expect(report).toContain('Network Time: 3000ms');
      expect(report).toContain('Parse Time: 2000ms');
      expect(report).toContain('Render Time: 8000ms');
      expect(report).toContain('Memory Usage: 75.50MB');
      
      // Errors
      expect(report).toContain('--- Errors (1) ---');
      expect(report).toContain('[network-error] Temporary network issue');
      expect(report).toContain('Recoverable: true');
      
      // Browser info
      expect(report).toContain('--- Browser Information ---');
      expect(report).toContain('User Agent: Mozilla/5.0 (Test Browser)');
      expect(report).toContain('Platform: Test Platform');
      expect(report).toContain('Language: en-US');
    });

    test('should include bottlenecks in report', () => {
      const diagnostics = {
        renderingId: 'test-report-2',
        startTime: new Date(),
        method: RenderingMethod.PDFJS_CANVAS,
        stage: RenderingStage.COMPLETE,
        errors: [],
        performanceMetrics: {
          networkTime: 12000, // Will trigger bottleneck
          renderTime: 5000,
        },
        browserInfo: {
          userAgent: 'test',
          platform: 'test',
          language: 'en',
        },
      };

      const report = diagnosticsCollector.generateReport(diagnostics);
      
      expect(report).toContain('--- Performance Bottlenecks ---');
      expect(report).toContain('1. Slow network response (>10s)');
    });
  });

  describe('Data Export and Management', () => {
    test('should export diagnostics as JSON', () => {
      const renderingId = 'test-export-1';
      
      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.RENDERING);
      diagnosticsCollector.updatePerformanceMetrics(renderingId, {
        renderTime: 5000,
        memoryUsage: 50,
      });

      const exportedData = diagnosticsCollector.exportDiagnostics(renderingId);
      expect(exportedData).toBeDefined();
      
      const parsedData = JSON.parse(exportedData!);
      expect(parsedData.renderingId).toBe(renderingId);
      expect(parsedData.method).toBe(RenderingMethod.PDFJS_CANVAS);
      expect(parsedData.performanceMetrics.renderTime).toBe(5000);
      expect(parsedData.performanceMetrics.memoryUsage).toBe(50);
    });

    test('should return null for non-existent diagnostics export', () => {
      const exportedData = diagnosticsCollector.exportDiagnostics('non-existent-id');
      expect(exportedData).toBeNull();
    });

    test('should clear all diagnostics data', () => {
      const renderingId1 = 'test-clear-1';
      const renderingId2 = 'test-clear-2';
      
      diagnosticsCollector.startDiagnostics(renderingId1, RenderingMethod.PDFJS_CANVAS, RenderingStage.RENDERING);
      diagnosticsCollector.startDiagnostics(renderingId2, RenderingMethod.NATIVE_BROWSER, RenderingStage.PARSING);

      expect(diagnosticsCollector.getDiagnostics(renderingId1)).toBeDefined();
      expect(diagnosticsCollector.getDiagnostics(renderingId2)).toBeDefined();

      diagnosticsCollector.clearAll();

      expect(diagnosticsCollector.getDiagnostics(renderingId1)).toBeNull();
      expect(diagnosticsCollector.getDiagnostics(renderingId2)).toBeNull();
    });
  });

  describe('Browser Information Collection', () => {
    test('should collect browser information', () => {
      const renderingId = 'test-browser-1';
      
      diagnosticsCollector.startDiagnostics(renderingId, RenderingMethod.PDFJS_CANVAS, RenderingStage.INITIALIZING);
      
      const diagnostics = diagnosticsCollector.getDiagnostics(renderingId);
      expect(diagnostics!.browserInfo).toBeDefined();
      expect(diagnostics!.browserInfo.userAgent).toBeDefined();
      expect(diagnostics!.browserInfo.platform).toBeDefined();
      expect(diagnostics!.browserInfo.language).toBeDefined();
    });
  });
});