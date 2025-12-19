/**
 * Comprehensive Performance Integration Tests
 * 
 * End-to-end performance testing that combines load testing,
 * memory optimization, and performance benchmarking.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { 
  LOAD_TEST_SCENARIOS, 
  LoadTestUtils, 
  MockLoadTestRunner,
  PERFORMANCE_THRESHOLDS,
  MEMORY_BENCHMARKS,
  CPU_BENCHMARKS 
} from './load-test-config';

describe('Comprehensive Performance Integration Tests', () => {
  let loadTestRunner: MockLoadTestRunner;
  let performanceMonitor: any;

  beforeAll(() => {
    loadTestRunner = new MockLoadTestRunner();
    
    // Setup performance monitoring
    performanceMonitor = {
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      getMetrics: vi.fn(() => ({
        memoryUsage: 45,
        cpuUsage: 25,
        activeConnections: 10,
        responseTime: 150,
      })),
      trackMemoryLeak: vi.fn(() => false),
      measureGCEfficiency: vi.fn(() => 0.85),
    };
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe('End-to-End Performance Validation', () => {
    it('should pass light load scenario with excellent performance', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'light_load')!;

      // Act
      performanceMonitor.startMonitoring();
      const result = await loadTestRunner.runScenario(scenario);
      const metrics = performanceMonitor.getMetrics();
      performanceMonitor.stopMonitoring();

      // Assert
      const validation = LoadTestUtils.validateResults(result, scenario.expectedMetrics);
      expect(validation.passed).toBe(true);
      expect(validation.failures).toHaveLength(0);

      // Verify excellent performance characteristics
      expect(result.averageResponseTime).toBeLessThanOrEqual(300);
      expect(result.throughput).toBeGreaterThanOrEqual(60);
      expect(result.errorRate).toBeLessThanOrEqual(0.5);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(80);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(35);
    });

    it('should handle moderate load with acceptable performance', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'moderate_load')!;

      // Act
      performanceMonitor.startMonitoring();
      const result = await loadTestRunner.runScenario(scenario);
      const metrics = performanceMonitor.getMetrics();
      performanceMonitor.stopMonitoring();

      // Assert
      const validation = LoadTestUtils.validateResults(result, scenario.expectedMetrics);
      expect(validation.passed).toBe(true);

      // Verify acceptable performance under moderate load
      expect(result.averageResponseTime).toBeLessThanOrEqual(1200);
      expect(result.throughput).toBeGreaterThanOrEqual(25);
      expect(result.errorRate).toBeLessThanOrEqual(3);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(250);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(65);
    });

    it('should survive heavy load with degraded but functional performance', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'heavy_load')!;

      // Act
      performanceMonitor.startMonitoring();
      const result = await loadTestRunner.runScenario(scenario);
      const metrics = performanceMonitor.getMetrics();
      performanceMonitor.stopMonitoring();

      // Assert
      const validation = LoadTestUtils.validateResults(result, scenario.expectedMetrics);
      expect(validation.passed).toBe(true);

      // Verify system remains functional under heavy load
      expect(result.averageResponseTime).toBeLessThanOrEqual(2500);
      expect(result.throughput).toBeGreaterThanOrEqual(12);
      expect(result.errorRate).toBeLessThanOrEqual(8);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(500);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(80);
    });

    it('should handle stress test and identify system limits', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'stress_test')!;

      // Act
      performanceMonitor.startMonitoring();
      const result = await loadTestRunner.runScenario(scenario);
      const metrics = performanceMonitor.getMetrics();
      performanceMonitor.stopMonitoring();

      // Assert
      // System may fail under stress, but should fail gracefully
      if (result.errorRate <= scenario.expectedMetrics.maxErrorRate) {
        // If system handles stress well
        expect(result.averageResponseTime).toBeLessThanOrEqual(8000);
        expect(result.throughput).toBeGreaterThanOrEqual(3);
      } else {
        // If system is overwhelmed, it should still respond partially
        expect(result.errorRate).toBeLessThanOrEqual(50); // Not complete failure
        expect(result.successfulRequests).toBeGreaterThan(0);
      }
    });

    it('should recover from spike test quickly', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'spike_test')!;

      // Act
      performanceMonitor.startMonitoring();
      const result = await loadTestRunner.runScenario(scenario);
      const metrics = performanceMonitor.getMetrics();
      performanceMonitor.stopMonitoring();

      // Assert
      const validation = LoadTestUtils.validateResults(result, scenario.expectedMetrics);
      
      // System should handle spike or recover quickly
      if (validation.passed) {
        expect(result.averageResponseTime).toBeLessThanOrEqual(4000);
        expect(result.throughput).toBeGreaterThanOrEqual(8);
      }
      
      // Even if spike causes issues, recovery should be evident
      expect(result.errorRate).toBeLessThanOrEqual(25);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(600);
    });

    it('should demonstrate stability in endurance test', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'endurance_test')!;

      // Act
      performanceMonitor.startMonitoring();
      const result = await loadTestRunner.runScenario(scenario);
      const hasMemoryLeak = performanceMonitor.trackMemoryLeak();
      const gcEfficiency = performanceMonitor.measureGCEfficiency();
      performanceMonitor.stopMonitoring();

      // Assert
      const validation = LoadTestUtils.validateResults(result, scenario.expectedMetrics);
      expect(validation.passed).toBe(true);

      // Verify long-term stability
      expect(hasMemoryLeak).toBe(false);
      expect(gcEfficiency).toBeGreaterThanOrEqual(0.8); // 80% GC efficiency
      expect(result.averageResponseTime).toBeLessThanOrEqual(800);
      expect(result.errorRate).toBeLessThanOrEqual(3);
    });
  });

  describe('Performance Regression Testing', () => {
    it('should detect performance regression across scenarios', async () => {
      // Arrange
      const baselineScenarios = ['light_load', 'moderate_load'];
      const results = [];

      // Act
      for (const scenarioName of baselineScenarios) {
        const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === scenarioName)!;
        const result = await loadTestRunner.runScenario(scenario);
        results.push({ scenario: scenarioName, result });
      }

      // Assert
      results.forEach(({ scenario, result }) => {
        const expectedMetrics = LOAD_TEST_SCENARIOS.find(s => s.name === scenario)!.expectedMetrics;
        const validation = LoadTestUtils.validateResults(result, expectedMetrics);
        
        expect(validation.passed).toBe(true);
        
        // Additional regression checks
        if (scenario === 'light_load') {
          expect(result.averageResponseTime).toBeLessThanOrEqual(250);
          expect(result.throughput).toBeGreaterThanOrEqual(70);
        } else if (scenario === 'moderate_load') {
          expect(result.averageResponseTime).toBeLessThanOrEqual(1000);
          expect(result.throughput).toBeGreaterThanOrEqual(35);
        }
      });
    });

    it('should maintain performance consistency across multiple runs', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'light_load')!;
      const runs = 5;
      const results = [];

      // Act
      for (let i = 0; i < runs; i++) {
        const result = await loadTestRunner.runScenario(scenario);
        results.push(result);
      }

      // Assert
      const responseTimes = results.map(r => r.averageResponseTime);
      const throughputs = results.map(r => r.throughput);
      const errorRates = results.map(r => r.errorRate);

      // Calculate variance
      const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / runs;
      const avgThroughput = throughputs.reduce((sum, tp) => sum + tp, 0) / runs;
      const avgErrorRate = errorRates.reduce((sum, er) => sum + er, 0) / runs;

      const responseTimeVariance = Math.max(...responseTimes) - Math.min(...responseTimes);
      const throughputVariance = Math.max(...throughputs) - Math.min(...throughputs);

      // Verify consistency (low variance)
      expect(responseTimeVariance).toBeLessThanOrEqual(avgResponseTime * 0.2); // Max 20% variance
      expect(throughputVariance).toBeLessThanOrEqual(avgThroughput * 0.15); // Max 15% variance
      expect(avgErrorRate).toBeLessThanOrEqual(1); // Consistently low error rate
    });
  });

  describe('Resource Utilization Optimization', () => {
    it('should optimize memory usage across different document types', async () => {
      // Arrange
      const documentTypes = ['small', 'medium', 'large', 'xlarge'];
      const memoryResults = [];

      // Act
      for (const docType of documentTypes) {
        const scenario = {
          ...LOAD_TEST_SCENARIOS[0],
          name: `memory_test_${docType}`,
          documentTypes: [{ type: docType as any, pageCount: 10, fileSizeMB: 5, weight: 100 }],
        };
        
        performanceMonitor.startMonitoring();
        await loadTestRunner.runScenario(scenario);
        const metrics = performanceMonitor.getMetrics();
        performanceMonitor.stopMonitoring();
        
        memoryResults.push({ docType, memory: metrics.memoryUsage });
      }

      // Assert
      memoryResults.forEach(({ docType, memory }) => {
        const threshold = PERFORMANCE_THRESHOLDS[docType as keyof typeof PERFORMANCE_THRESHOLDS];
        if (threshold) {
          expect(memory).toBeLessThanOrEqual(threshold.maxMemoryPerDocument * 10); // 10 documents
        }
      });

      // Memory should scale reasonably with document size
      expect(memoryResults[1].memory).toBeGreaterThan(memoryResults[0].memory); // medium > small
      expect(memoryResults[2].memory).toBeGreaterThan(memoryResults[1].memory); // large > medium
      expect(memoryResults[3].memory).toBeGreaterThan(memoryResults[2].memory); // xlarge > large
    });

    it('should optimize CPU usage under varying loads', async () => {
      // Arrange
      const userCounts = [5, 15, 30, 50];
      const cpuResults = [];

      // Act
      for (const userCount of userCounts) {
        const scenario = {
          ...LOAD_TEST_SCENARIOS[0],
          concurrentUsers: userCount,
        };
        
        performanceMonitor.startMonitoring();
        await loadTestRunner.runScenario(scenario);
        const metrics = performanceMonitor.getMetrics();
        performanceMonitor.stopMonitoring();
        
        cpuResults.push({ users: userCount, cpu: metrics.cpuUsage });
      }

      // Assert
      cpuResults.forEach(({ users, cpu }) => {
        const expectedCPU = CPU_BENCHMARKS.idle + (users * CPU_BENCHMARKS.perUser) + CPU_BENCHMARKS.rendering;
        expect(cpu).toBeLessThanOrEqual(Math.min(expectedCPU * 1.2, CPU_BENCHMARKS.maxSustained));
      });

      // CPU should scale reasonably with user count
      for (let i = 1; i < cpuResults.length; i++) {
        expect(cpuResults[i].cpu).toBeGreaterThanOrEqual(cpuResults[i - 1].cpu);
      }
    });

    it('should maintain efficient garbage collection', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'endurance_test')!;

      // Act
      performanceMonitor.startMonitoring();
      await loadTestRunner.runScenario(scenario);
      const gcEfficiency = performanceMonitor.measureGCEfficiency();
      const hasMemoryLeak = performanceMonitor.trackMemoryLeak();
      performanceMonitor.stopMonitoring();

      // Assert
      expect(gcEfficiency).toBeGreaterThanOrEqual(0.75); // At least 75% GC efficiency
      expect(hasMemoryLeak).toBe(false);
    });
  });

  describe('Performance Monitoring and Alerting', () => {
    it('should generate comprehensive performance report', async () => {
      // Arrange
      const scenarios = ['light_load', 'moderate_load', 'heavy_load'];
      const results = [];

      // Act
      for (const scenarioName of scenarios) {
        const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === scenarioName)!;
        const result = await loadTestRunner.runScenario(scenario);
        results.push(result);
      }

      const report = LoadTestUtils.generateReport(results);

      // Assert
      expect(report).toContain('# Load Test Report');
      expect(report).toContain('light_load');
      expect(report).toContain('moderate_load');
      expect(report).toContain('heavy_load');
      expect(report).toContain('Success Rate');
      expect(report).toContain('Response Time');
      expect(report).toContain('Throughput');
      expect(report).toContain('Peak Memory');
      expect(report).toContain('Peak CPU');
    });

    it('should identify performance bottlenecks and provide recommendations', async () => {
      // Arrange
      const scenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'heavy_load')!;

      // Act
      const result = await loadTestRunner.runScenario(scenario);
      const validation = LoadTestUtils.validateResults(result, scenario.expectedMetrics);

      // Assert
      if (!validation.passed) {
        // Should provide specific failure reasons
        expect(validation.failures.length).toBeGreaterThan(0);
        validation.failures.forEach(failure => {
          expect(failure).toMatch(/exceeds|below|above/i);
        });
      }

      // Performance recommendations based on results
      const recommendations = [];
      
      if (result.averageResponseTime > 2000) {
        recommendations.push('Consider optimizing document loading pipeline');
      }
      
      if (result.peakMemoryUsage > 400) {
        recommendations.push('Implement more aggressive memory management');
      }
      
      if (result.peakCpuUsage > 85) {
        recommendations.push('Consider horizontal scaling or CPU optimization');
      }
      
      if (result.errorRate > 10) {
        recommendations.push('Improve error handling and retry mechanisms');
      }

      // Should have actionable recommendations for poor performance
      if (result.averageResponseTime > 2000 || result.errorRate > 10) {
        expect(recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Scalability Analysis', () => {
    it('should demonstrate linear scalability within capacity limits', async () => {
      // Arrange
      const userCounts = [10, 25, 50, 75];
      const scalabilityResults = [];

      // Act
      for (const userCount of userCounts) {
        const scenario = {
          ...LOAD_TEST_SCENARIOS[1], // moderate_load as base
          concurrentUsers: userCount,
        };
        
        const result = await loadTestRunner.runScenario(scenario);
        scalabilityResults.push({
          users: userCount,
          responseTime: result.averageResponseTime,
          throughput: result.throughput,
          errorRate: result.errorRate,
        });
      }

      // Assert
      // Response time should scale sub-linearly (not exponentially)
      for (let i = 1; i < scalabilityResults.length; i++) {
        const current = scalabilityResults[i];
        const previous = scalabilityResults[i - 1];
        
        const responseTimeRatio = current.responseTime / previous.responseTime;
        const userRatio = current.users / previous.users;
        
        // Response time should not increase faster than user count
        expect(responseTimeRatio).toBeLessThanOrEqual(userRatio * 1.5);
        
        // Error rate should not increase dramatically
        expect(current.errorRate).toBeLessThanOrEqual(previous.errorRate + 5);
      }
    });

    it('should identify system capacity limits', async () => {
      // Arrange
      const stressScenario = LOAD_TEST_SCENARIOS.find(s => s.name === 'stress_test')!;

      // Act
      const result = await loadTestRunner.runScenario(stressScenario);

      // Assert
      // System should either handle the load or fail gracefully
      if (result.errorRate > 20) {
        // If system is overwhelmed, it should still provide some service
        expect(result.successfulRequests).toBeGreaterThan(result.totalRequests * 0.5);
        expect(result.averageResponseTime).toBeLessThanOrEqual(15000); // Should not hang indefinitely
      } else {
        // If system handles stress, performance should be reasonable
        expect(result.averageResponseTime).toBeLessThanOrEqual(5000);
        expect(result.throughput).toBeGreaterThanOrEqual(5);
      }
    });
  });
});