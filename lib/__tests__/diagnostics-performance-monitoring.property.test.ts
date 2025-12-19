/**
 * Property-Based Tests for DiagnosticsCollector Performance Monitoring
 * 
 * **PDF Rendering Reliability Fix, Property 18: Performance monitoring**
 * **Validates: Requirements 8.3**
 */

import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { DiagnosticsCollector } from '../pdf-reliability/diagnostics';
import { RenderingMethod, RenderingStage, ErrorType } from '../pdf-reliability/types';
import { createReliabilityConfig } from '../pdf-reliability/config';

describe('DiagnosticsCollector Performance Monitoring Properties', () => {
  let diagnosticsCollector: DiagnosticsCollector;

  beforeEach(() => {
    const config = createReliabilityConfig({
      enableDiagnostics: true,
    });
    diagnosticsCollector = new DiagnosticsCollector(config);
  });

  test('**PDF Rendering Reliability Fix, Property 18: Performance monitoring** - should track timing and resource usage for all rendering operations', async () => {
    await fc.assert(fc.asyncProperty(
      fc.uuid(), // renderingId
      fc.constantFrom(...Object.values(RenderingMethod)), // method
      fc.constantFrom(...Object.values(RenderingStage)), // stage
      fc.integer({ min: 100, max: 30000 }), // networkTime
      fc.integer({ min: 50, max: 15000 }), // parseTime
      fc.integer({ min: 200, max: 60000 }), // renderTime
      fc.float({ min: 10, max: 500, noNaN: true }), // memoryUsage (MB)
      async (renderingId, method, stage, networkTime, parseTime, renderTime, memoryUsage) => {
        // Start diagnostics collection
        diagnosticsCollector.startDiagnostics(renderingId, method, stage);
        
        // Simulate performance metrics updates
        diagnosticsCollector.updatePerformanceMetrics(renderingId, {
          networkTime,
          parseTime,
          renderTime,
          memoryUsage,
        });
        
        // Complete diagnostics
        const diagnostics = diagnosticsCollector.completeDiagnostics(renderingId);
        
        // Property: Performance monitoring should capture all timing and resource data
        expect(diagnostics).toBeDefined();
        expect(diagnostics!.renderingId).toBe(renderingId);
        expect(diagnostics!.method).toBe(method);
        expect(diagnostics!.startTime).toBeInstanceOf(Date);
        expect(diagnostics!.endTime).toBeInstanceOf(Date);
        expect(diagnostics!.totalTime).toBeGreaterThanOrEqual(0);
        
        // Performance metrics should be captured
        expect(diagnostics!.performanceMetrics.networkTime).toBe(networkTime);
        expect(diagnostics!.performanceMetrics.parseTime).toBe(parseTime);
        expect(diagnostics!.performanceMetrics.renderTime).toBe(renderTime);
        expect(diagnostics!.performanceMetrics.memoryUsage).toBe(memoryUsage);
        
        // Browser info should be captured
        expect(diagnostics!.browserInfo.userAgent).toBeDefined();
        expect(diagnostics!.browserInfo.platform).toBeDefined();
        expect(diagnostics!.browserInfo.language).toBeDefined();
      }
    ), { numRuns: 100 });
  });

  test('should identify performance bottlenecks correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.uuid(), // renderingId
      fc.constantFrom(...Object.values(RenderingMethod)), // method
      fc.constantFrom(...Object.values(RenderingStage)), // stage
      fc.record({
        networkTime: fc.option(fc.integer({ min: 1000, max: 30000 })),
        parseTime: fc.option(fc.integer({ min: 1000, max: 20000 })),
        renderTime: fc.option(fc.integer({ min: 5000, max: 60000 })),
        memoryUsage: fc.option(fc.float({ min: 50, max: 1000, noNaN: true })),
      }),
      fc.array(fc.record({
        type: fc.constantFrom(...Object.values(ErrorType)),
        message: fc.string({ minLength: 10, maxLength: 100 }),
        stage: fc.constantFrom(...Object.values(RenderingStage)),
        method: fc.constantFrom(...Object.values(RenderingMethod)),
        timestamp: fc.date(),
        context: fc.record({}),
        recoverable: fc.boolean(),
      }), { minLength: 0, maxLength: 5 }),
      async (renderingId, method, stage, metrics, errors) => {
        // Start diagnostics
        diagnosticsCollector.startDiagnostics(renderingId, method, stage);
        
        // Add performance metrics
        if (metrics.networkTime !== null) {
          diagnosticsCollector.updatePerformanceMetrics(renderingId, {
            networkTime: metrics.networkTime,
          });
        }
        if (metrics.parseTime !== null) {
          diagnosticsCollector.updatePerformanceMetrics(renderingId, {
            parseTime: metrics.parseTime,
          });
        }
        if (metrics.renderTime !== null) {
          diagnosticsCollector.updatePerformanceMetrics(renderingId, {
            renderTime: metrics.renderTime,
          });
        }
        if (metrics.memoryUsage !== null) {
          diagnosticsCollector.updatePerformanceMetrics(renderingId, {
            memoryUsage: metrics.memoryUsage,
          });
        }
        
        // Add errors
        errors.forEach(error => {
          diagnosticsCollector.addError(renderingId, error);
        });
        
        // Complete diagnostics
        const diagnostics = diagnosticsCollector.completeDiagnostics(renderingId);
        
        // Identify bottlenecks
        const bottlenecks = diagnosticsCollector.identifyBottlenecks(diagnostics!);
        
        // Property: Bottleneck identification should be accurate
        let expectedBottlenecks = 0;
        
        if (metrics.networkTime && metrics.networkTime > 10000) {
          expectedBottlenecks++;
          expect(bottlenecks.some(b => b.includes('Slow network'))).toBe(true);
        }
        
        if (metrics.parseTime && metrics.parseTime > 5000) {
          expectedBottlenecks++;
          expect(bottlenecks.some(b => b.includes('Slow PDF parsing'))).toBe(true);
        }
        
        if (metrics.renderTime && metrics.renderTime > 15000) {
          expectedBottlenecks++;
          expect(bottlenecks.some(b => b.includes('Slow rendering'))).toBe(true);
        }
        
        if (errors.length > 2) {
          expectedBottlenecks++;
          expect(bottlenecks.some(b => b.includes('Multiple errors'))).toBe(true);
        }
        
        // Should have at least the expected bottlenecks
        expect(bottlenecks.length).toBeGreaterThanOrEqual(expectedBottlenecks);
      }
    ), { numRuns: 100 });
  });

  test('should generate comprehensive diagnostic reports', async () => {
    await fc.assert(fc.asyncProperty(
      fc.uuid(), // renderingId
      fc.constantFrom(...Object.values(RenderingMethod)), // method
      fc.constantFrom(...Object.values(RenderingStage)), // stage
      fc.record({
        networkTime: fc.integer({ min: 1000, max: 10000 }),
        parseTime: fc.integer({ min: 500, max: 5000 }),
        renderTime: fc.integer({ min: 1000, max: 15000 }),
        memoryUsage: fc.float({ min: 10, max: 200, noNaN: true }),
      }),
      async (renderingId, method, stage, metrics) => {
        // Start and complete diagnostics with metrics
        diagnosticsCollector.startDiagnostics(renderingId, method, stage);
        diagnosticsCollector.updatePerformanceMetrics(renderingId, metrics);
        const diagnostics = diagnosticsCollector.completeDiagnostics(renderingId);
        
        // Generate report
        const report = diagnosticsCollector.generateReport(diagnostics!);
        
        // Property: Report should contain all essential information
        expect(report).toContain(renderingId);
        expect(report).toContain(method);
        expect(report).toContain(stage);
        expect(report).toContain('Performance Metrics');
        expect(report).toContain(`Network Time: ${metrics.networkTime}ms`);
        expect(report).toContain(`Parse Time: ${metrics.parseTime}ms`);
        expect(report).toContain(`Render Time: ${metrics.renderTime}ms`);
        expect(report).toContain(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
        expect(report).toContain('Browser Information');
        
        // Report should be properly formatted
        expect(report.split('\n').length).toBeGreaterThan(10);
        expect(report).toContain('===');
        expect(report).toContain('---');
      }
    ), { numRuns: 100 });
  });

  test('should handle diagnostics export correctly', async () => {
    await fc.assert(fc.asyncProperty(
      fc.uuid(), // renderingId
      fc.constantFrom(...Object.values(RenderingMethod)), // method
      fc.constantFrom(...Object.values(RenderingStage)), // stage
      async (renderingId, method, stage) => {
        // Start diagnostics
        diagnosticsCollector.startDiagnostics(renderingId, method, stage);
        
        // Export while active
        const activeExport = diagnosticsCollector.exportDiagnostics(renderingId);
        expect(activeExport).toBeDefined();
        
        // Should be valid JSON
        const activeData = JSON.parse(activeExport!);
        expect(activeData.renderingId).toBe(renderingId);
        expect(activeData.method).toBe(method);
        expect(activeData.stage).toBe(stage);
        
        // Complete diagnostics
        diagnosticsCollector.completeDiagnostics(renderingId);
        
        // Export after completion should return null (data removed)
        const completedExport = diagnosticsCollector.exportDiagnostics(renderingId);
        expect(completedExport).toBeNull();
      }
    ), { numRuns: 100 });
  });
});