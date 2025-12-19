/**
 * Load Testing Configuration
 * 
 * Configuration settings and utilities for performance load testing
 * of the document viewing system.
 */

export interface LoadTestScenario {
  name: string;
  description: string;
  duration: number; // in milliseconds
  concurrentUsers: number;
  rampUpTime: number; // in milliseconds
  documentTypes: DocumentTestType[];
  expectedMetrics: ExpectedMetrics;
}

export interface DocumentTestType {
  type: 'small' | 'medium' | 'large' | 'xlarge';
  pageCount: number;
  fileSizeMB: number;
  weight: number; // percentage of total load
}

export interface ExpectedMetrics {
  maxResponseTime: number;
  minThroughput: number;
  minSuccessRate: number;
  maxMemoryUsageMB: number;
  maxCpuUsage: number;
  maxErrorRate: number;
}

export interface LoadTestResult {
  scenario: string;
  startTime: Date;
  endTime: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  peakMemoryUsage: number;
  averageCpuUsage: number;
  peakCpuUsage: number;
  errorRate: number;
  errors: LoadTestError[];
}

export interface LoadTestError {
  timestamp: Date;
  type: string;
  message: string;
  userId?: string;
  documentId?: string;
  stackTrace?: string;
}

/**
 * Predefined load test scenarios for different use cases
 */
export const LOAD_TEST_SCENARIOS: LoadTestScenario[] = [
  {
    name: 'light_load',
    description: 'Light load with few concurrent users',
    duration: 60000, // 1 minute
    concurrentUsers: 10,
    rampUpTime: 10000, // 10 seconds
    documentTypes: [
      { type: 'small', pageCount: 5, fileSizeMB: 1, weight: 50 },
      { type: 'medium', pageCount: 20, fileSizeMB: 5, weight: 40 },
      { type: 'large', pageCount: 50, fileSizeMB: 15, weight: 10 },
    ],
    expectedMetrics: {
      maxResponseTime: 500,
      minThroughput: 50,
      minSuccessRate: 99,
      maxMemoryUsageMB: 100,
      maxCpuUsage: 40,
      maxErrorRate: 1,
    },
  },
  
  {
    name: 'moderate_load',
    description: 'Moderate load simulating typical usage',
    duration: 300000, // 5 minutes
    concurrentUsers: 50,
    rampUpTime: 30000, // 30 seconds
    documentTypes: [
      { type: 'small', pageCount: 5, fileSizeMB: 1, weight: 30 },
      { type: 'medium', pageCount: 20, fileSizeMB: 5, weight: 50 },
      { type: 'large', pageCount: 50, fileSizeMB: 15, weight: 20 },
    ],
    expectedMetrics: {
      maxResponseTime: 1500,
      minThroughput: 30,
      minSuccessRate: 95,
      maxMemoryUsageMB: 300,
      maxCpuUsage: 70,
      maxErrorRate: 5,
    },
  },
  
  {
    name: 'heavy_load',
    description: 'Heavy load testing system limits',
    duration: 600000, // 10 minutes
    concurrentUsers: 100,
    rampUpTime: 60000, // 1 minute
    documentTypes: [
      { type: 'small', pageCount: 5, fileSizeMB: 1, weight: 20 },
      { type: 'medium', pageCount: 20, fileSizeMB: 5, weight: 40 },
      { type: 'large', pageCount: 50, fileSizeMB: 15, weight: 30 },
      { type: 'xlarge', pageCount: 200, fileSizeMB: 50, weight: 10 },
    ],
    expectedMetrics: {
      maxResponseTime: 3000,
      minThroughput: 15,
      minSuccessRate: 90,
      maxMemoryUsageMB: 600,
      maxCpuUsage: 85,
      maxErrorRate: 10,
    },
  },
  
  {
    name: 'stress_test',
    description: 'Stress test to find breaking point',
    duration: 300000, // 5 minutes
    concurrentUsers: 200,
    rampUpTime: 30000, // 30 seconds
    documentTypes: [
      { type: 'medium', pageCount: 20, fileSizeMB: 5, weight: 60 },
      { type: 'large', pageCount: 50, fileSizeMB: 15, weight: 40 },
    ],
    expectedMetrics: {
      maxResponseTime: 10000,
      minThroughput: 5,
      minSuccessRate: 75,
      maxMemoryUsageMB: 1000,
      maxCpuUsage: 95,
      maxErrorRate: 25,
    },
  },
  
  {
    name: 'spike_test',
    description: 'Sudden spike in traffic',
    duration: 120000, // 2 minutes
    concurrentUsers: 150,
    rampUpTime: 5000, // 5 seconds (very fast ramp-up)
    documentTypes: [
      { type: 'small', pageCount: 5, fileSizeMB: 1, weight: 70 },
      { type: 'medium', pageCount: 20, fileSizeMB: 5, weight: 30 },
    ],
    expectedMetrics: {
      maxResponseTime: 5000,
      minThroughput: 10,
      minSuccessRate: 80,
      maxMemoryUsageMB: 500,
      maxCpuUsage: 90,
      maxErrorRate: 20,
    },
  },
  
  {
    name: 'endurance_test',
    description: 'Long-running test for memory leaks',
    duration: 1800000, // 30 minutes
    concurrentUsers: 25,
    rampUpTime: 60000, // 1 minute
    documentTypes: [
      { type: 'small', pageCount: 5, fileSizeMB: 1, weight: 40 },
      { type: 'medium', pageCount: 20, fileSizeMB: 5, weight: 40 },
      { type: 'large', pageCount: 50, fileSizeMB: 15, weight: 20 },
    ],
    expectedMetrics: {
      maxResponseTime: 1000,
      minThroughput: 20,
      minSuccessRate: 95,
      maxMemoryUsageMB: 200, // Should not grow significantly over time
      maxCpuUsage: 60,
      maxErrorRate: 5,
    },
  },
];

/**
 * Performance thresholds for different document sizes
 */
export const PERFORMANCE_THRESHOLDS = {
  small: {
    maxLoadTime: 200,
    maxRenderTime: 100,
    maxMemoryPerDocument: 5, // MB
  },
  medium: {
    maxLoadTime: 800,
    maxRenderTime: 300,
    maxMemoryPerDocument: 20, // MB
  },
  large: {
    maxLoadTime: 2000,
    maxRenderTime: 800,
    maxMemoryPerDocument: 50, // MB
  },
  xlarge: {
    maxLoadTime: 5000,
    maxRenderTime: 2000,
    maxMemoryPerDocument: 150, // MB
  },
};

/**
 * Memory usage benchmarks for different scenarios
 */
export const MEMORY_BENCHMARKS = {
  baseline: 50, // MB - baseline memory usage
  perUser: 2, // MB - additional memory per concurrent user
  perDocument: {
    small: 1,
    medium: 5,
    large: 15,
    xlarge: 40,
  },
  maxTotal: 1000, // MB - absolute maximum memory usage
  gcThreshold: 500, // MB - trigger garbage collection
};

/**
 * CPU usage benchmarks
 */
export const CPU_BENCHMARKS = {
  idle: 5, // % - CPU usage when idle
  perUser: 0.5, // % - additional CPU per concurrent user
  conversion: 30, // % - CPU usage during document conversion
  rendering: 20, // % - CPU usage during page rendering
  maxSustained: 80, // % - maximum sustained CPU usage
  maxPeak: 95, // % - maximum peak CPU usage
};

/**
 * Network and I/O benchmarks
 */
export const NETWORK_BENCHMARKS = {
  maxLatency: 200, // ms - maximum acceptable network latency
  minBandwidth: 1, // Mbps - minimum required bandwidth per user
  maxConcurrentConnections: 1000,
  connectionTimeout: 30000, // ms
  requestTimeout: 60000, // ms
};

/**
 * Error rate thresholds
 */
export const ERROR_THRESHOLDS = {
  acceptable: 1, // % - acceptable error rate under normal load
  warning: 5, // % - warning threshold
  critical: 15, // % - critical threshold
  maxConsecutiveErrors: 10,
  maxErrorsPerMinute: 50,
};

/**
 * Utility functions for load testing
 */
export class LoadTestUtils {
  /**
   * Generate a random document type based on weights
   */
  static selectDocumentType(documentTypes: DocumentTestType[]): DocumentTestType {
    const totalWeight = documentTypes.reduce((sum, doc) => sum + doc.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const docType of documentTypes) {
      currentWeight += docType.weight;
      if (random <= currentWeight) {
        return docType;
      }
    }
    
    return documentTypes[0]; // Fallback
  }

  /**
   * Calculate expected memory usage for a scenario
   */
  static calculateExpectedMemory(scenario: LoadTestScenario): number {
    const baseMemory = MEMORY_BENCHMARKS.baseline;
    const userMemory = scenario.concurrentUsers * MEMORY_BENCHMARKS.perUser;
    
    const documentMemory = scenario.documentTypes.reduce((total, docType) => {
      const memoryPerDoc = MEMORY_BENCHMARKS.perDocument[docType.type];
      const weightedMemory = memoryPerDoc * (docType.weight / 100);
      return total + weightedMemory;
    }, 0);
    
    return baseMemory + userMemory + (documentMemory * scenario.concurrentUsers);
  }

  /**
   * Calculate expected CPU usage for a scenario
   */
  static calculateExpectedCPU(scenario: LoadTestScenario): number {
    const baseCPU = CPU_BENCHMARKS.idle;
    const userCPU = scenario.concurrentUsers * CPU_BENCHMARKS.perUser;
    const renderingCPU = CPU_BENCHMARKS.rendering;
    
    return Math.min(baseCPU + userCPU + renderingCPU, CPU_BENCHMARKS.maxSustained);
  }

  /**
   * Validate load test results against expected metrics
   */
  static validateResults(result: LoadTestResult, expected: ExpectedMetrics): {
    passed: boolean;
    failures: string[];
  } {
    const failures: string[] = [];

    if (result.averageResponseTime > expected.maxResponseTime) {
      failures.push(`Average response time ${result.averageResponseTime}ms exceeds limit ${expected.maxResponseTime}ms`);
    }

    if (result.throughput < expected.minThroughput) {
      failures.push(`Throughput ${result.throughput} below minimum ${expected.minThroughput}`);
    }

    const successRate = (result.successfulRequests / result.totalRequests) * 100;
    if (successRate < expected.minSuccessRate) {
      failures.push(`Success rate ${successRate.toFixed(1)}% below minimum ${expected.minSuccessRate}%`);
    }

    if (result.peakMemoryUsage > expected.maxMemoryUsageMB) {
      failures.push(`Peak memory usage ${result.peakMemoryUsage}MB exceeds limit ${expected.maxMemoryUsageMB}MB`);
    }

    if (result.peakCpuUsage > expected.maxCpuUsage) {
      failures.push(`Peak CPU usage ${result.peakCpuUsage}% exceeds limit ${expected.maxCpuUsage}%`);
    }

    if (result.errorRate > expected.maxErrorRate) {
      failures.push(`Error rate ${result.errorRate}% exceeds limit ${expected.maxErrorRate}%`);
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Generate load test report
   */
  static generateReport(results: LoadTestResult[]): string {
    const report = ['# Load Test Report', ''];
    
    results.forEach(result => {
      report.push(`## ${result.scenario}`);
      report.push(`- Duration: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}s`);
      report.push(`- Total Requests: ${result.totalRequests}`);
      report.push(`- Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`);
      report.push(`- Average Response Time: ${result.averageResponseTime}ms`);
      report.push(`- P95 Response Time: ${result.p95ResponseTime}ms`);
      report.push(`- P99 Response Time: ${result.p99ResponseTime}ms`);
      report.push(`- Throughput: ${result.throughput} req/s`);
      report.push(`- Peak Memory: ${result.peakMemoryUsage}MB`);
      report.push(`- Peak CPU: ${result.peakCpuUsage}%`);
      report.push(`- Error Rate: ${result.errorRate}%`);
      report.push('');
    });
    
    return report.join('\n');
  }
}

/**
 * Mock load test runner for testing purposes
 */
export class MockLoadTestRunner {
  async runScenario(scenario: LoadTestScenario): Promise<LoadTestResult> {
    const startTime = new Date();
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = new Date();
    const totalRequests = scenario.concurrentUsers * Math.floor(scenario.duration / 1000);
    const successRate = Math.max(0.75, scenario.expectedMetrics.minSuccessRate / 100);
    const successfulRequests = Math.floor(totalRequests * successRate);
    const failedRequests = totalRequests - successfulRequests;
    
    return {
      scenario: scenario.name,
      startTime,
      endTime,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: scenario.expectedMetrics.maxResponseTime * 0.7,
      p95ResponseTime: scenario.expectedMetrics.maxResponseTime * 0.9,
      p99ResponseTime: scenario.expectedMetrics.maxResponseTime,
      throughput: scenario.expectedMetrics.minThroughput * 1.2,
      peakMemoryUsage: scenario.expectedMetrics.maxMemoryUsageMB * 0.8,
      averageCpuUsage: scenario.expectedMetrics.maxCpuUsage * 0.6,
      peakCpuUsage: scenario.expectedMetrics.maxCpuUsage * 0.9,
      errorRate: scenario.expectedMetrics.maxErrorRate * 0.5,
      errors: [],
    };
  }
}