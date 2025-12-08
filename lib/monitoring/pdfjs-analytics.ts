/**
 * PDF.js Analytics and Monitoring Module
 * 
 * Tracks PDF.js viewer usage, performance, and errors
 * for monitoring during gradual rollout
 * 
 * Requirements: All (Task 16.1)
 */

export interface PDFJSAnalyticsEvent {
  eventType: 'load' | 'error' | 'performance' | 'user_feedback';
  userId: string;
  documentId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PDFJSLoadEvent extends PDFJSAnalyticsEvent {
  eventType: 'load';
  metadata: {
    loadTimeMs: number;
    numPages: number;
    fileSize?: number;
    usedFallback: boolean;
  };
}

export interface PDFJSErrorEvent extends PDFJSAnalyticsEvent {
  eventType: 'error';
  metadata: {
    errorType: string;
    errorMessage: string;
    errorStack?: string;
    usedFallback: boolean;
  };
}

export interface PDFJSPerformanceEvent extends PDFJSAnalyticsEvent {
  eventType: 'performance';
  metadata: {
    metric: 'render_time' | 'memory_usage' | 'scroll_performance';
    value: number;
    unit: string;
  };
}

export interface PDFJSUserFeedbackEvent extends PDFJSAnalyticsEvent {
  eventType: 'user_feedback';
  metadata: {
    rating: number; // 1-5
    comment?: string;
    issueType?: string;
  };
}

/**
 * Track PDF.js analytics event
 * 
 * In production, this would send to your analytics service
 * For now, we log to console and could extend to database
 */
export async function trackPDFJSEvent(
  event: PDFJSLoadEvent | PDFJSErrorEvent | PDFJSPerformanceEvent | PDFJSUserFeedbackEvent
): Promise<void> {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PDF.js Analytics]', event);
  }
  
  // In production, send to analytics service
  // Example: await fetch('/api/analytics/pdfjs', { method: 'POST', body: JSON.stringify(event) });
  
  // For now, we'll just log critical errors
  if (event.eventType === 'error') {
    console.error('[PDF.js Error]', {
      userId: event.userId,
      documentId: event.documentId,
      error: event.metadata,
    });
  }
}

/**
 * Track PDF.js load success
 */
export async function trackPDFJSLoad(
  userId: string,
  documentId: string,
  loadTimeMs: number,
  numPages: number,
  fileSize?: number,
  usedFallback: boolean = false
): Promise<void> {
  await trackPDFJSEvent({
    eventType: 'load',
    userId,
    documentId,
    timestamp: new Date(),
    metadata: {
      loadTimeMs,
      numPages,
      fileSize,
      usedFallback,
    },
  });
}

/**
 * Track PDF.js error
 */
export async function trackPDFJSError(
  userId: string,
  documentId: string,
  errorType: string,
  errorMessage: string,
  errorStack?: string,
  usedFallback: boolean = false
): Promise<void> {
  await trackPDFJSEvent({
    eventType: 'error',
    userId,
    documentId,
    timestamp: new Date(),
    metadata: {
      errorType,
      errorMessage,
      errorStack,
      usedFallback,
    },
  });
}

/**
 * Track PDF.js performance metric
 */
export async function trackPDFJSPerformance(
  userId: string,
  documentId: string,
  metric: 'render_time' | 'memory_usage' | 'scroll_performance',
  value: number,
  unit: string
): Promise<void> {
  await trackPDFJSEvent({
    eventType: 'performance',
    userId,
    documentId,
    timestamp: new Date(),
    metadata: {
      metric,
      value,
      unit,
    },
  });
}

/**
 * Track user feedback
 */
export async function trackPDFJSFeedback(
  userId: string,
  documentId: string,
  rating: number,
  comment?: string,
  issueType?: string
): Promise<void> {
  await trackPDFJSEvent({
    eventType: 'user_feedback',
    userId,
    documentId,
    timestamp: new Date(),
    metadata: {
      rating,
      comment,
      issueType,
    },
  });
}

/**
 * Get PDF.js error rate for monitoring
 * This would query your analytics database in production
 */
export async function getPDFJSErrorRate(
  timeWindowHours: number = 24
): Promise<number> {
  // In production, query your analytics database
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Get PDF.js usage statistics
 */
export async function getPDFJSUsageStats(
  timeWindowHours: number = 24
): Promise<{
  totalLoads: number;
  totalErrors: number;
  errorRate: number;
  avgLoadTime: number;
  fallbackRate: number;
}> {
  // In production, query your analytics database
  // For now, return placeholder data
  return {
    totalLoads: 0,
    totalErrors: 0,
    errorRate: 0,
    avgLoadTime: 0,
    fallbackRate: 0,
  };
}
