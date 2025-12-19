/**
 * Unit Tests for Integrated Monitoring System
 * 
 * Tests the integration of monitoring, alerting, and feedback collection
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  IntegratedMonitoringSystem, 
  MonitoringEvent, 
  DEFAULT_MONITORING_CONFIG,
  type IntegratedMonitoringConfig,
  type MonitoringEventData,
} from '../pdf-reliability/monitoring-integration';
import type { 
  RenderingMethod, 
  RenderingStage, 
  RenderResult, 
  RenderError,
  ErrorType 
} from '../pdf-reliability/types';

import { vi } from 'vitest';

// Mock DOM and localStorage for feedback collector
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'test-user-agent',
    platform: 'test-platform',
    language: 'en-US',
  },
});

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => ({
      style: { cssText: '' },
      className: '',
      textContent: '',
      addEventListener: vi.fn(),
      appendChild: vi.fn(),
      insertBefore: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      remove: vi.fn(),
    })),
    body: {
      appendChild: vi.fn(),
    },
  },
});

describe('IntegratedMonitoringSystem', () => {
  let monitoringSystem: IntegratedMonitoringSystem;
  let config: IntegratedMonitoringConfig;
  let eventLog: MonitoringEventData[] = [];

  beforeEach(() => {
    config = {
      ...DEFAULT_MONITORING_CONFIG,
      monitoring: {
        ...DEFAULT_MONITORING_CONFIG.monitoring,
        metricsInterval: 100, // Faster for testing
      },
      feedback: {
        ...DEFAULT_MONITORING_CONFIG.feedback,
        showPrompt: false, // Disable prompts for testing
      },
    };
    
    monitoringSystem = new IntegratedMonitoringSystem(config);
    eventLog = [];
    
    // Set up event listener to capture all events
    Object.values(MonitoringEvent).forEach(event => {
      monitoringSystem.addEventListener(event, (eventData) => {
        eventLog.push(eventData);
      });
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    monitoringSystem.shutdown();
  });

  describe('Operation Lifecycle Monitoring', () => {
    it('should track complete operation lifecycle', async () => {
      const renderingId = 'lifecycle-test';
      const method: RenderingMethod = 'pdfjs-canvas';

      // Start operation
      monitoringSystem.startOperation(renderingId, method);
      
      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe(MonitoringEvent.OPERATION_STARTED);
      expect(eventLog[0].renderingId).toBe(renderingId);
      expect(eventLog[0].data.method).toBe(method);

      // Update stage
      monitoringSystem.updateOperationStage(renderingId, 'fetching');
      
      // Record performance metrics
      monitoringSystem.updatePerformanceMetrics(renderingId, {
        networkTime: 1000,
        memoryUsage: 50,
      });

      // Complete operation successfully
      const result: RenderResult = {
        success: true,
        renderingId,
        method,
        pages: [],
        diagnostics: {
          renderingId,
          startTime: new Date(Date.now() - 2000),
          endTime: new Date(),
          totalTime: 2000,
          method,
          stage: 'complete',
          errors: [],
          performanceMetrics: {
            networkTime: 1000,
            memoryUsage: 50,
          },
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
        },
      };

      monitoringSystem.completeOperation(renderingId, result);

      // Should have operation completed event
      const completedEvent = eventLog.find(e => e.event === MonitoringEvent.OPERATION_COMPLETED);
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.renderingId).toBe(renderingId);
      expect(completedEvent?.data.result.success).toBe(true);
    });

    it('should track failed operations', async () => {
      const renderingId = 'failed-test';
      const method: RenderingMethod = 'server-conversion';

      monitoringSystem.startOperation(renderingId, method);

      // Record error
      const error: RenderError = {
        type: 'network-error' as ErrorType,
        message: 'Connection timeout',
        stage: 'fetching' as RenderingStage,
        method,
        timestamp: new Date(),
        context: { url: 'test-url' },
        recoverable: true,
      };

      monitoringSystem.recordError(renderingId, error);

      expect(eventLog.some(e => e.event === MonitoringEvent.ERROR_OCCURRED)).toBe(true);

      // Complete with failure
      const result: RenderResult = {
        success: false,
        renderingId,
        method,
        pages: [],
        error,
        diagnostics: {
          renderingId,
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(),
          totalTime: 1000,
          method,
          stage: 'error',
          errors: [error],
          performanceMetrics: {},
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
        },
      };

      monitoringSystem.completeOperation(renderingId, result);

      const failedEvent = eventLog.find(e => e.event === MonitoringEvent.OPERATION_FAILED);
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.data.result.success).toBe(false);
    });
  });

  describe('Performance Metrics Integration', () => {
    it('should collect and provide performance metrics', async () => {
      // Complete several operations to generate metrics
      for (let i = 0; i < 5; i++) {
        const renderingId = `metrics-test-${i}`;
        const method: RenderingMethod = 'pdfjs-canvas';
        const success = i < 4; // 4 successful, 1 failed

        monitoringSystem.startOperation(renderingId, method);

        const result: RenderResult = {
          success,
          renderingId,
          method,
          pages: [],
          ...(success ? {} : {
            error: {
              type: 'timeout-error' as ErrorType,
              message: 'Timeout',
              stage: 'rendering' as RenderingStage,
              method,
              timestamp: new Date(),
              context: {},
              recoverable: true,
            }
          }),
          diagnostics: {
            renderingId,
            startTime: new Date(Date.now() - 2000),
            endTime: new Date(),
            totalTime: 2000,
            method,
            stage: success ? 'complete' : 'error',
            errors: success ? [] : [{
              type: 'timeout-error' as ErrorType,
              message: 'Timeout',
              stage: 'rendering' as RenderingStage,
              method,
              timestamp: new Date(),
              context: {},
              recoverable: true,
            }],
            performanceMetrics: {
              renderTime: 2000,
              memoryUsage: 40,
            },
            browserInfo: {
              userAgent: 'test-agent',
              platform: 'test-platform',
              language: 'en',
            },
          },
        };

        monitoringSystem.completeOperation(renderingId, result);
      }

      const metrics = monitoringSystem.getPerformanceMetrics();
      
      expect(metrics.totalOperations).toBe(5);
      expect(metrics.successfulOperations).toBe(4);
      expect(metrics.failedOperations).toBe(1);
      expect(metrics.successRate).toBe(80);
      expect(metrics.averageRenderTime).toBe(2000);
      expect(metrics.averageMemoryUsage).toBe(40);
    });
  });

  describe('Alert Management', () => {
    it('should trigger and manage alerts', async () => {
      // Configure low thresholds to trigger alerts
      const alertConfig = {
        ...config,
        monitoring: {
          ...config.monitoring,
          alertThresholds: {
            errorRate: 10,
            successRate: 90,
            averageRenderTime: 1000,
            memoryUsage: 30,
          },
        },
      };

      const alertSystem = new IntegratedMonitoringSystem(alertConfig);
      
      // Add event listener for alerts
      alertSystem.addEventListener(MonitoringEvent.ALERT_TRIGGERED, (eventData) => {
        eventLog.push(eventData);
      });

      // Generate operations that should trigger alerts
      for (let i = 0; i < 3; i++) {
        const renderingId = `alert-test-${i}`;
        alertSystem.startOperation(renderingId, 'pdfjs-canvas');

        const result: RenderResult = {
          success: false, // All failed to trigger high error rate
          renderingId,
          method: 'pdfjs-canvas',
          pages: [],
          error: {
            type: 'memory-error' as ErrorType,
            message: 'Out of memory',
            stage: 'rendering' as RenderingStage,
            method: 'pdfjs-canvas',
            timestamp: new Date(),
            context: {},
            recoverable: false,
          },
          diagnostics: {
            renderingId,
            startTime: new Date(Date.now() - 3000),
            endTime: new Date(),
            totalTime: 3000, // Slow performance
            method: 'pdfjs-canvas',
            stage: 'error',
            errors: [{
              type: 'memory-error' as ErrorType,
              message: 'Out of memory',
              stage: 'rendering' as RenderingStage,
              method: 'pdfjs-canvas',
              timestamp: new Date(),
              context: {},
              recoverable: false,
            }],
            performanceMetrics: {
              renderTime: 3000,
              memoryUsage: 100, // High memory usage
            },
            browserInfo: {
              userAgent: 'test-agent',
              platform: 'test-platform',
              language: 'en',
            },
          },
        };

        alertSystem.completeOperation(renderingId, result);
      }

      // Wait for metrics update and alert processing
      await new Promise(resolve => setTimeout(resolve, 150));

      const alerts = alertSystem.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      // Test alert acknowledgment
      if (alerts.length > 0) {
        const acknowledged = alertSystem.acknowledgeAlert(alerts[0].id);
        expect(acknowledged).toBe(true);
        
        const activeAlertsAfterAck = alertSystem.getActiveAlerts();
        expect(activeAlertsAfterAck.length).toBe(alerts.length - 1);
      }

      alertSystem.shutdown();
    });
  });

  describe('User Feedback Integration', () => {
    it('should collect user feedback for failed operations', async () => {
      const feedbackConfig = {
        ...config,
        feedback: {
          ...config.feedback,
          enabled: true,
          showPrompt: true,
        },
      };

      const feedbackSystem = new IntegratedMonitoringSystem(feedbackConfig);
      
      const renderingId = 'feedback-test';
      feedbackSystem.startOperation(renderingId, 'pdfjs-canvas');

      const result: RenderResult = {
        success: false,
        renderingId,
        method: 'pdfjs-canvas',
        pages: [],
        error: {
          type: 'parsing-error' as ErrorType,
          message: 'PDF parsing failed',
          stage: 'parsing' as RenderingStage,
          method: 'pdfjs-canvas',
          timestamp: new Date(),
          context: {},
          recoverable: false,
        },
        diagnostics: {
          renderingId,
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(),
          totalTime: 1000,
          method: 'pdfjs-canvas',
          stage: 'error',
          errors: [{
            type: 'parsing-error' as ErrorType,
            message: 'PDF parsing failed',
            stage: 'parsing' as RenderingStage,
            method: 'pdfjs-canvas',
            timestamp: new Date(),
            context: {},
            recoverable: false,
          }],
          performanceMetrics: {},
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
        },
      };

      feedbackSystem.completeOperation(renderingId, result);

      // Should attempt to show feedback prompt for failed operation
      expect(document.createElement).toHaveBeenCalled();

      feedbackSystem.shutdown();
    });

    it('should provide user feedback statistics', () => {
      const stats = monitoringSystem.getUserFeedbackStats();
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('averageRating');
      expect(stats).toHaveProperty('categoryBreakdown');
      expect(stats).toHaveProperty('ratingDistribution');
    });
  });

  describe('Event System', () => {
    it('should emit and handle monitoring events', () => {
      const renderingId = 'event-test';
      
      monitoringSystem.startOperation(renderingId, 'native-browser');
      
      const startEvent = eventLog.find(e => e.event === MonitoringEvent.OPERATION_STARTED);
      expect(startEvent).toBeDefined();
      expect(startEvent?.renderingId).toBe(renderingId);
      expect(startEvent?.timestamp).toBeInstanceOf(Date);
    });

    it('should handle event listener removal', () => {
      const testListener = vi.fn();
      
      monitoringSystem.addEventListener(MonitoringEvent.OPERATION_STARTED, testListener);
      monitoringSystem.startOperation('remove-test', 'pdfjs-canvas');
      
      expect(testListener).toHaveBeenCalledTimes(1);
      
      monitoringSystem.removeEventListener(MonitoringEvent.OPERATION_STARTED, testListener);
      monitoringSystem.startOperation('remove-test-2', 'pdfjs-canvas');
      
      expect(testListener).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle event listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      
      monitoringSystem.addEventListener(MonitoringEvent.OPERATION_STARTED, errorListener);
      
      // Should not throw error
      expect(() => {
        monitoringSystem.startOperation('error-test', 'pdfjs-canvas');
      }).not.toThrow();
      
      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('Health Status', () => {
    it('should report healthy status with good metrics', () => {
      // Complete successful operation
      const renderingId = 'health-good';
      monitoringSystem.startOperation(renderingId, 'pdfjs-canvas');
      
      const result: RenderResult = {
        success: true,
        renderingId,
        method: 'pdfjs-canvas',
        pages: [],
        diagnostics: {
          renderingId,
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(),
          totalTime: 1000,
          method: 'pdfjs-canvas',
          stage: 'complete',
          errors: [],
          performanceMetrics: { renderTime: 1000 },
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
        },
      };

      monitoringSystem.completeOperation(renderingId, result);
      
      const health = monitoringSystem.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.metrics.successRate).toBe(100);
      expect(health.activeAlerts).toBe(0);
      expect(health.criticalAlerts).toBe(0);
    });

    it('should report degraded status with poor metrics', async () => {
      // Configure to trigger degraded status
      const degradedConfig = {
        ...config,
        monitoring: {
          ...config.monitoring,
          alertThresholds: {
            errorRate: 10,
            successRate: 95,
            averageRenderTime: 1000,
            memoryUsage: 50,
          },
        },
      };

      const degradedSystem = new IntegratedMonitoringSystem(degradedConfig);

      // Generate poor performance operations
      for (let i = 0; i < 10; i++) {
        const renderingId = `degraded-${i}`;
        degradedSystem.startOperation(renderingId, 'pdfjs-canvas');

        const result: RenderResult = {
          success: i < 8, // 80% success rate
          renderingId,
          method: 'pdfjs-canvas',
          pages: [],
          ...(i >= 8 ? {
            error: {
              type: 'timeout-error' as ErrorType,
              message: 'Timeout',
              stage: 'rendering' as RenderingStage,
              method: 'pdfjs-canvas',
              timestamp: new Date(),
              context: {},
              recoverable: true,
            }
          } : {}),
          diagnostics: {
            renderingId,
            startTime: new Date(Date.now() - 1000),
            endTime: new Date(),
            totalTime: 1000,
            method: 'pdfjs-canvas',
            stage: i < 8 ? 'complete' : 'error',
            errors: i >= 8 ? [{
              type: 'timeout-error' as ErrorType,
              message: 'Timeout',
              stage: 'rendering' as RenderingStage,
              method: 'pdfjs-canvas',
              timestamp: new Date(),
              context: {},
              recoverable: true,
            }] : [],
            performanceMetrics: { renderTime: 1000 },
            browserInfo: {
              userAgent: 'test-agent',
              platform: 'test-platform',
              language: 'en',
            },
          },
        };

        degradedSystem.completeOperation(renderingId, result);
      }

      // Wait for metrics update
      await new Promise(resolve => setTimeout(resolve, 150));

      const health = degradedSystem.getHealthStatus();
      
      expect(health.status).toBe('degraded');
      expect(health.metrics.successRate).toBeLessThan(95);

      degradedSystem.shutdown();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive monitoring report', async () => {
      // Add some test data
      const renderingId = 'report-test';
      monitoringSystem.startOperation(renderingId, 'pdfjs-canvas');

      const result: RenderResult = {
        success: true,
        renderingId,
        method: 'pdfjs-canvas',
        pages: [],
        diagnostics: {
          renderingId,
          startTime: new Date(Date.now() - 2000),
          endTime: new Date(),
          totalTime: 2000,
          method: 'pdfjs-canvas',
          stage: 'complete',
          errors: [],
          performanceMetrics: {
            renderTime: 2000,
            memoryUsage: 45,
          },
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
        },
      };

      monitoringSystem.completeOperation(renderingId, result);

      const report = monitoringSystem.generateReport();

      expect(report).toContain('PDF Rendering Monitoring Report');
      expect(report).toContain('Performance Metrics');
      expect(report).toContain('User Feedback Summary');
      expect(report).toContain('Total Operations: 1');
      expect(report).toContain('Success Rate: 100.0%');
    });
  });

  describe('Data Export', () => {
    it('should export monitoring data in JSON format', async () => {
      // Add test data
      const renderingId = 'export-test';
      monitoringSystem.startOperation(renderingId, 'image-based');

      const result: RenderResult = {
        success: true,
        renderingId,
        method: 'image-based',
        pages: [],
        diagnostics: {
          renderingId,
          startTime: new Date(Date.now() - 1500),
          endTime: new Date(),
          totalTime: 1500,
          method: 'image-based',
          stage: 'complete',
          errors: [],
          performanceMetrics: { renderTime: 1500 },
          browserInfo: {
            userAgent: 'test-agent',
            platform: 'test-platform',
            language: 'en',
          },
        },
      };

      monitoringSystem.completeOperation(renderingId, result);

      const exported = monitoringSystem.exportData('json');
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('monitoring');
      expect(parsed).toHaveProperty('feedback');
      expect(parsed).toHaveProperty('exportTimestamp');
      expect(parsed.monitoring).toHaveProperty('metrics');
      expect(parsed.monitoring.metrics.totalOperations).toBe(1);
    });

    it('should export monitoring data in other formats', () => {
      const csvExport = monitoringSystem.exportData('csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('User Feedback');

      const xmlExport = monitoringSystem.exportData('xml');
      expect(typeof xmlExport).toBe('string');
      expect(xmlExport).toContain('User Feedback');
    });
  });

  describe('System Shutdown', () => {
    it('should cleanup resources on shutdown', () => {
      const renderingId = 'shutdown-test';
      monitoringSystem.startOperation(renderingId, 'pdfjs-canvas');

      expect(monitoringSystem.getHealthStatus().activeOperations).toBe(1);

      monitoringSystem.shutdown();

      // Should clear active operations
      expect(monitoringSystem.getHealthStatus().activeOperations).toBe(0);
    });
  });
});