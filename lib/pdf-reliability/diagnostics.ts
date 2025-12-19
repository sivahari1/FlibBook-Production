/**
 * PDF Rendering Diagnostics Collector
 * 
 * Comprehensive diagnostics and monitoring for PDF rendering operations
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import type { 
  DiagnosticsData, 
  RenderError, 
  RenderingMethod, 
  RenderingStage,
  ReliabilityConfig 
} from './types';

/**
 * Performance Metrics Interface
 */
interface PerformanceMetrics {
  memoryUsage?: number;
  networkTime?: number;
  parseTime?: number;
  renderTime?: number;
}

/**
 * Browser Information Interface
 */
interface BrowserInfo {
  userAgent: string;
  platform: string;
  language: string;
}

/**
 * Diagnostics Collector Class
 */
export class DiagnosticsCollector {
  private diagnosticsData: Map<string, DiagnosticsData> = new Map();
  private config: ReliabilityConfig;

  constructor(config: ReliabilityConfig) {
    this.config = config;
  }

  /**
   * Start diagnostics collection for a rendering operation
   */
  startDiagnostics(
    renderingId: string,
    method: RenderingMethod,
    stage: RenderingStage
  ): void {
    if (!this.config.enableDiagnostics) {
      return;
    }

    const diagnostics: DiagnosticsData = {
      renderingId,
      startTime: new Date(),
      method,
      stage,
      errors: [],
      performanceMetrics: {},
      browserInfo: this.getBrowserInfo(),
    };

    this.diagnosticsData.set(renderingId, diagnostics);
  }

  /**
   * Update diagnostics stage
   */
  updateStage(renderingId: string, stage: RenderingStage): void {
    if (!this.config.enableDiagnostics) {
      return;
    }

    const diagnostics = this.diagnosticsData.get(renderingId);
    if (diagnostics) {
      diagnostics.stage = stage;
    }
  }

  /**
   * Add error to diagnostics
   */
  addError(renderingId: string, error: RenderError): void {
    if (!this.config.enableDiagnostics) {
      return;
    }

    const diagnostics = this.diagnosticsData.get(renderingId);
    if (diagnostics) {
      diagnostics.errors.push(error);
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(
    renderingId: string,
    metrics: Partial<PerformanceMetrics>
  ): void {
    if (!this.config.enableDiagnostics) {
      return;
    }

    const diagnostics = this.diagnosticsData.get(renderingId);
    if (diagnostics) {
      diagnostics.performanceMetrics = {
        ...diagnostics.performanceMetrics,
        ...metrics,
      };
    }
  }

  /**
   * Complete diagnostics collection
   */
  completeDiagnostics(renderingId: string): DiagnosticsData | null {
    if (!this.config.enableDiagnostics) {
      return null;
    }

    const diagnostics = this.diagnosticsData.get(renderingId);
    if (diagnostics) {
      diagnostics.endTime = new Date();
      diagnostics.totalTime = diagnostics.endTime.getTime() - diagnostics.startTime.getTime();
      
      // Add final memory usage
      this.updateMemoryUsage(renderingId);
      
      // Remove from active diagnostics
      this.diagnosticsData.delete(renderingId);
      
      return diagnostics;
    }

    return null;
  }

  /**
   * Get current diagnostics data
   */
  getDiagnostics(renderingId: string): DiagnosticsData | null {
    if (!this.config.enableDiagnostics) {
      return null;
    }

    return this.diagnosticsData.get(renderingId) || null;
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryUsage(renderingId: string): void {
    try {
      // Use performance.memory if available (Chrome)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        
        this.updatePerformanceMetrics(renderingId, {
          memoryUsage,
        });
      }
    } catch (error) {
      // Memory API not available or blocked
      console.warn('Memory usage tracking not available:', error);
    }
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): BrowserInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };
  }

  /**
   * Check for performance bottlenecks
   */
  identifyBottlenecks(diagnostics: DiagnosticsData): string[] {
    const bottlenecks: string[] = [];
    const metrics = diagnostics.performanceMetrics;

    // Check network time
    if (metrics.networkTime && metrics.networkTime > 10000) {
      bottlenecks.push('Slow network response (>10s)');
    }

    // Check parse time
    if (metrics.parseTime && metrics.parseTime > 5000) {
      bottlenecks.push('Slow PDF parsing (>5s)');
    }

    // Check render time
    if (metrics.renderTime && metrics.renderTime > 15000) {
      bottlenecks.push('Slow rendering (>15s)');
    }

    // Check memory usage
    if (metrics.memoryUsage && metrics.memoryUsage > this.config.memoryPressureThreshold / (1024 * 1024)) {
      bottlenecks.push('High memory usage');
    }

    // Check error count
    if (diagnostics.errors.length > 2) {
      bottlenecks.push('Multiple errors occurred');
    }

    return bottlenecks;
  }

  /**
   * Generate diagnostic report
   */
  generateReport(diagnostics: DiagnosticsData): string {
    const report = [];
    
    report.push(`=== PDF Rendering Diagnostics Report ===`);
    report.push(`Rendering ID: ${diagnostics.renderingId}`);
    report.push(`Method: ${diagnostics.method}`);
    report.push(`Stage: ${diagnostics.stage}`);
    report.push(`Start Time: ${diagnostics.startTime.toISOString()}`);
    
    if (diagnostics.endTime) {
      report.push(`End Time: ${diagnostics.endTime.toISOString()}`);
      report.push(`Total Time: ${diagnostics.totalTime}ms`);
    }

    // Performance metrics
    report.push(`\n--- Performance Metrics ---`);
    const metrics = diagnostics.performanceMetrics;
    if (metrics.networkTime) report.push(`Network Time: ${metrics.networkTime}ms`);
    if (metrics.parseTime) report.push(`Parse Time: ${metrics.parseTime}ms`);
    if (metrics.renderTime) report.push(`Render Time: ${metrics.renderTime}ms`);
    if (metrics.memoryUsage) report.push(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);

    // Errors
    if (diagnostics.errors.length > 0) {
      report.push(`\n--- Errors (${diagnostics.errors.length}) ---`);
      diagnostics.errors.forEach((error, index) => {
        report.push(`${index + 1}. [${error.type}] ${error.message}`);
        report.push(`   Stage: ${error.stage}, Method: ${error.method}`);
        report.push(`   Time: ${error.timestamp.toISOString()}`);
        report.push(`   Recoverable: ${error.recoverable}`);
      });
    }

    // Bottlenecks
    const bottlenecks = this.identifyBottlenecks(diagnostics);
    if (bottlenecks.length > 0) {
      report.push(`\n--- Performance Bottlenecks ---`);
      bottlenecks.forEach((bottleneck, index) => {
        report.push(`${index + 1}. ${bottleneck}`);
      });
    }

    // Browser info
    report.push(`\n--- Browser Information ---`);
    report.push(`User Agent: ${diagnostics.browserInfo.userAgent}`);
    report.push(`Platform: ${diagnostics.browserInfo.platform}`);
    report.push(`Language: ${diagnostics.browserInfo.language}`);

    return report.join('\n');
  }

  /**
   * Export diagnostics data as JSON
   */
  exportDiagnostics(renderingId: string): string | null {
    const diagnostics = this.getDiagnostics(renderingId);
    if (!diagnostics) {
      return null;
    }

    return JSON.stringify(diagnostics, null, 2);
  }

  /**
   * Clean up diagnostics data for a specific rendering
   * 
   * Requirements: 3.2, 1.3 - Implement proper cleanup for reliability renderer
   */
  cleanup(renderingId: string): void {
    this.diagnosticsData.delete(renderingId);
  }

  /**
   * Clear all diagnostics data
   */
  clearAll(): void {
    this.diagnosticsData.clear();
  }
}