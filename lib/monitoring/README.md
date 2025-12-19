# Comprehensive Logging and Monitoring System

This module provides comprehensive logging and monitoring capabilities for document rendering operations, including detailed metrics collection, diagnostic information capture, and user analytics.

## Features

- **Rendering Metrics Collection**: Track document loading, rendering performance, and success/failure rates
- **Diagnostic Information Capture**: Capture comprehensive diagnostic information on failures including browser state, console errors, network logs, and performance data
- **User Analytics**: Track user sessions, interactions, and viewing patterns
- **Performance Monitoring**: Monitor memory usage, load times, and rendering performance
- **Error Reporting**: Detailed error classification and reporting with recovery suggestions

## Requirements Fulfilled

- **4.1**: Detailed rendering metrics logging during document operations
- **4.2**: Error context capture with browser and document state information
- **4.3**: Performance monitoring and diagnostics collection
- **4.4**: User analytics for rendering success/failure rates
- **4.5**: Comprehensive diagnostic information capture on failures

## Usage

### Basic Setup

```typescript
import { initializeMonitoring, getMonitoringSystem } from './lib/monitoring';

// Initialize with default configuration
initializeMonitoring();

// Or with custom configuration
initializeMonitoring({
  enableMetrics: true,
  enableDiagnostics: true,
  enableUserAnalytics: true,
  enablePerformanceMonitoring: true,
  enableErrorCapture: true,
  metricsRetentionDays: 30,
});
```

### Recording Rendering Events

```typescript
const monitoring = getMonitoringSystem();

// Start document rendering
monitoring.recordRenderStart(
  'document-123',
  'https://example.com/document.pdf',
  1024000, // file size
  'session-456',
  'user-789'
);

// Record successful rendering
monitoring.recordRenderSuccess(
  'document-123',
  2500, // duration in ms
  10,   // total pages
  50 * 1024 * 1024, // memory usage
  'session-456'
);

// Record rendering error
const error = createRenderingError(
  RenderingErrorType.PDF_PARSING_FAILED,
  'Failed to parse PDF document'
);

await monitoring.recordRenderError(
  'document-123',
  error,
  3000, // duration
  'session-456'
);
```

### User Session Tracking

```typescript
// User interactions are automatically tracked when sessions are active
monitoring.recordInteraction('session-456', 'zoom', { zoomLevel: 1.5 });
monitoring.recordInteraction('session-456', 'page_change', { pageNumber: 3 });
monitoring.recordInteraction('session-456', 'scroll', { scrollY: 500 });

// End session
const analytics = monitoring.endSession('session-456');
console.log('Session analytics:', analytics);
```

### Performance Monitoring

```typescript
// Get performance summary
const summary = monitoring.getPerformanceSummary();
console.log('Success rate:', summary?.successRate);
console.log('Average load time:', summary?.averageLoadTime);
console.log('Common errors:', summary?.commonErrors);

// Get user analytics
const userAnalytics = monitoring.getUserAnalyticsSummary();
console.log('User analytics:', userAnalytics);

// Export metrics for analysis
const jsonData = monitoring.exportMetrics('json');
const csvData = monitoring.exportMetrics('csv');
```

### Error Diagnostics

```typescript
import { captureFailureDiagnostics } from './lib/monitoring';

// Capture comprehensive diagnostics on error
const diagnosticReport = await captureFailureDiagnostics(
  'document-123',
  error,
  { additionalContext: 'Custom context data' }
);

console.log('Diagnostic report:', diagnosticReport.reportId);
console.log('Browser state:', diagnosticReport.browserState);
console.log('Console errors:', diagnosticReport.consoleErrors);
console.log('Network logs:', diagnosticReport.networkLogs);
```

## Configuration Options

### MonitoringConfig

```typescript
interface MonitoringConfig {
  enableMetrics: boolean;              // Enable metrics collection
  enableDiagnostics: boolean;          // Enable diagnostic capture
  enableUserAnalytics: boolean;        // Enable user session tracking
  enablePerformanceMonitoring: boolean; // Enable performance monitoring
  enableErrorCapture: boolean;         // Enable error capture
  metricsRetentionDays: number;        // Days to retain metrics
  diagnosticCaptureConfig?: {
    captureScreenshots: boolean;       // Capture screenshots on errors
    captureNetworkLogs: boolean;       // Capture network request logs
    captureConsoleErrors: boolean;     // Capture console errors
    maxLogEntries: number;             // Maximum log entries to keep
  };
}
```

### DiagnosticCaptureConfig

```typescript
interface DiagnosticCaptureConfig {
  captureScreenshots: boolean;         // Capture screenshots on failures
  captureNetworkLogs: boolean;         // Intercept and log network requests
  captureConsoleErrors: boolean;       // Intercept console errors/warnings
  capturePerformanceMetrics: boolean;  // Capture performance entries
  captureBrowserState: boolean;        // Capture browser state snapshot
  captureDocumentState: boolean;       // Capture document state snapshot
  maxLogEntries: number;               // Maximum entries to keep in memory
  maxScreenshotSize: number;           // Maximum screenshot size in bytes
}
```

## Data Structures

### RenderingMetrics

```typescript
interface RenderingMetrics {
  documentId: string;
  eventType: RenderingEventType;
  timestamp: Date;
  duration?: number;
  memoryUsage?: number;
  pageNumber?: number;
  totalPages?: number;
  errorType?: RenderingErrorType;
  userAgent?: string;
  viewportSize?: { width: number; height: number };
  success: boolean;
  additionalData?: Record<string, any>;
}
```

### DiagnosticReport

```typescript
interface DiagnosticReport {
  reportId: string;
  timestamp: Date;
  documentId: string;
  error: RenderingError;
  diagnostics: RenderingDiagnostics;
  consoleErrors: ConsoleErrorEntry[];
  networkLogs: NetworkLogEntry[];
  browserState: BrowserStateSnapshot;
  documentState: DocumentStateSnapshot;
  screenshot?: string; // base64 encoded
  performanceEntries: PerformanceEntry[];
  additionalContext?: Record<string, any>;
}
```

### UserAnalytics

```typescript
interface UserAnalytics {
  userId?: string;
  sessionId: string;
  documentId: string;
  viewStartTime: Date;
  viewEndTime?: Date;
  totalViewTime?: number;
  pagesViewed: number[];
  interactionEvents: Array<{
    type: 'zoom' | 'scroll' | 'page_change' | 'error';
    timestamp: Date;
    data?: any;
  }>;
  renderingMetrics: RenderingMetrics[];
}
```

## Integration with Existing Systems

### Logger Integration

The monitoring system integrates with the existing logger (`lib/logger.ts`) to provide structured logging:

```typescript
import { logger } from '../logger';

// All monitoring events are logged with appropriate levels
logger.info('Document render started', { documentId, sessionId });
logger.error('Document render failed', error, { diagnosticReportId });
logger.warn('High memory usage detected', { memoryUsage, threshold });
```

### Error System Integration

Integrates with the rendering error system (`lib/errors/rendering-errors.ts`):

```typescript
import { createRenderingError, RenderingErrorType } from '../errors/rendering-errors';

// Errors are classified and enhanced with diagnostic information
const error = createRenderingError(
  RenderingErrorType.PDF_PARSING_FAILED,
  'Failed to parse PDF'
);

// Diagnostic information is automatically attached
const report = await captureFailureDiagnostics(documentId, error);
```

## Production Considerations

### Performance Impact

- Metrics collection has minimal performance overhead
- Diagnostic capture is only triggered on errors
- Memory usage is controlled through configurable limits
- Old metrics are automatically cleaned up

### Privacy and Security

- Sensitive data is automatically sanitized from logs
- Screenshots can be disabled for privacy
- Network logs exclude sensitive headers by default
- User data is anonymized where possible

### Monitoring Service Integration

The system is designed to integrate with external monitoring services:

```typescript
// Example integration with monitoring service
if (process.env.NODE_ENV === 'production' && process.env.MONITORING_ENDPOINT) {
  // Send diagnostic reports to external service
  await fetch(process.env.MONITORING_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`,
    },
    body: JSON.stringify(diagnosticReport),
  });
}
```

## Testing

The monitoring system includes comprehensive unit tests:

- **Logging Completeness Tests**: Verify all required metrics are logged
- **Diagnostic Capture Tests**: Verify diagnostic information is captured correctly
- **Error Handling Tests**: Verify graceful error handling
- **Configuration Tests**: Verify configuration options work correctly

Run tests with:

```bash
npm test lib/monitoring/__tests__/
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Adjust `maxLogEntries` and `metricsRetentionDays`
2. **Performance Impact**: Disable unnecessary features like screenshots
3. **Missing Diagnostics**: Check browser compatibility and permissions
4. **Network Interception Issues**: Verify fetch API availability

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import { logger } from './lib/logger';

// Enable debug logging in development
if (process.env.NODE_ENV === 'development') {
  logger.debug('Monitoring system initialized', { config });
}
```

## Future Enhancements

- Real-time monitoring dashboard
- Advanced analytics and reporting
- Machine learning-based error prediction
- Integration with more monitoring services
- Enhanced privacy controls
- Performance optimization recommendations