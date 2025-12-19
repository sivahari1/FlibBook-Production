/**
 * Comprehensive logging system for JStudyRoom document viewing operations
 * Task 12.1: Implement comprehensive logging
 * Requirements: 5.1, 5.2 - Data integrity and consistency logging
 */

import { logger, LogContext } from '../logger';

export interface DocumentViewingContext extends LogContext {
  documentId?: string;
  memberId?: string;
  memberEmail?: string;
  documentTitle?: string;
  documentType?: string;
  fileSize?: number;
  totalPages?: number;
  currentPage?: number;
  viewerType?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ConversionContext extends DocumentViewingContext {
  conversionJobId?: string;
  conversionMethod?: string;
  inputFormat?: string;
  outputFormat?: string;
  processingTime?: number;
  queuePosition?: number;
  retryCount?: number;
  errorCode?: string;
  errorDetails?: string;
}

export interface UserInteractionContext extends DocumentViewingContext {
  action: string;
  timestamp: string;
  pageNumber?: number;
  zoomLevel?: number;
  viewMode?: string;
  searchQuery?: string;
  annotationId?: string;
  duration?: number;
}

/**
 * Specialized logger for document viewing operations
 */
class DocumentViewingLogger {
  
  // ========== DOCUMENT LOADING LOGS ==========
  
  /**
   * Log document access attempt
   */
  logDocumentAccess(context: DocumentViewingContext): void {
    logger.info('Document access initiated', {
      ...context,
      type: 'document_access',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log successful document load
   */
  logDocumentLoadSuccess(context: DocumentViewingContext & { loadTime: number }): void {
    logger.info('Document loaded successfully', {
      ...context,
      type: 'document_load_success',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log document load failure
   */
  logDocumentLoadFailure(
    error: Error | string,
    context: DocumentViewingContext
  ): void {
    logger.error('Document load failed', error, {
      ...context,
      type: 'document_load_failure',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log document pages retrieval
   */
  logPagesRetrieval(
    success: boolean,
    pagesFound: number,
    context: DocumentViewingContext
  ): void {
    const message = success 
      ? `Document pages retrieved: ${pagesFound} pages found`
      : 'Document pages retrieval failed';
    
    const logMethod = success ? logger.info.bind(logger) : logger.warn.bind(logger);
    
    logMethod(message, {
      ...context,
      type: 'pages_retrieval',
      pagesFound,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  // ========== CONVERSION PROCESS LOGS ==========

  /**
   * Log conversion job creation
   */
  logConversionJobCreated(context: ConversionContext): void {
    logger.info('Document conversion job created', {
      ...context,
      type: 'conversion_job_created',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion job started
   */
  logConversionStarted(context: ConversionContext): void {
    logger.info('Document conversion started', {
      ...context,
      type: 'conversion_started',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion progress update
   */
  logConversionProgress(
    progress: number,
    stage: string,
    context: ConversionContext
  ): void {
    logger.debug('Conversion progress update', {
      ...context,
      type: 'conversion_progress',
      progress,
      stage,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log successful conversion completion
   */
  logConversionSuccess(context: ConversionContext): void {
    logger.info('Document conversion completed successfully', {
      ...context,
      type: 'conversion_success',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion failure
   */
  logConversionFailure(
    error: Error | string,
    context: ConversionContext
  ): void {
    logger.error('Document conversion failed', error, {
      ...context,
      type: 'conversion_failure',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion retry attempt
   */
  logConversionRetry(context: ConversionContext): void {
    logger.warn('Document conversion retry initiated', {
      ...context,
      type: 'conversion_retry',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log conversion queue status
   */
  logConversionQueueStatus(
    queueLength: number,
    activeJobs: number,
    context?: Partial<ConversionContext>
  ): void {
    logger.debug('Conversion queue status', {
      ...context,
      type: 'conversion_queue_status',
      queueLength,
      activeJobs,
      timestamp: new Date().toISOString(),
    });
  }

  // ========== USER INTERACTION LOGS ==========

  /**
   * Log user interaction with document viewer
   */
  logUserInteraction(context: UserInteractionContext): void {
    logger.info(`User interaction: ${context.action}`, {
      ...context,
      type: 'user_interaction',
    });
  }

  /**
   * Log page navigation
   */
  logPageNavigation(
    fromPage: number,
    toPage: number,
    context: DocumentViewingContext
  ): void {
    this.logUserInteraction({
      ...context,
      action: 'page_navigation',
      timestamp: new Date().toISOString(),
      pageNumber: toPage,
      duration: undefined,
    });
  }

  /**
   * Log zoom level change
   */
  logZoomChange(
    newZoomLevel: number,
    context: DocumentViewingContext
  ): void {
    this.logUserInteraction({
      ...context,
      action: 'zoom_change',
      timestamp: new Date().toISOString(),
      zoomLevel: newZoomLevel,
    });
  }

  /**
   * Log view mode change
   */
  logViewModeChange(
    newViewMode: string,
    context: DocumentViewingContext
  ): void {
    this.logUserInteraction({
      ...context,
      action: 'view_mode_change',
      timestamp: new Date().toISOString(),
      viewMode: newViewMode,
    });
  }

  /**
   * Log document search
   */
  logDocumentSearch(
    searchQuery: string,
    resultsFound: number,
    context: DocumentViewingContext
  ): void {
    this.logUserInteraction({
      ...context,
      action: 'document_search',
      timestamp: new Date().toISOString(),
      searchQuery,
      duration: undefined,
    });
  }

  /**
   * Log viewing session start
   */
  logViewingSessionStart(context: DocumentViewingContext): void {
    logger.info('Document viewing session started', {
      ...context,
      type: 'viewing_session_start',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log viewing session end
   */
  logViewingSessionEnd(
    sessionDuration: number,
    pagesViewed: number,
    context: DocumentViewingContext
  ): void {
    logger.info('Document viewing session ended', {
      ...context,
      type: 'viewing_session_end',
      sessionDuration,
      pagesViewed,
      timestamp: new Date().toISOString(),
    });
  }

  // ========== ERROR CONTEXT CAPTURE ==========

  /**
   * Log detailed error context for troubleshooting
   */
  logErrorContext(
    error: Error | string,
    operation: string,
    context: DocumentViewingContext & {
      stackTrace?: string;
      browserInfo?: {
        userAgent: string;
        viewport: { width: number; height: number };
        cookiesEnabled: boolean;
        onlineStatus: boolean;
      };
      systemInfo?: {
        timestamp: string;
        timezone: string;
        language: string;
        platform: string;
      };
      documentState?: {
        loadingState: string;
        currentPage: number;
        totalPages: number;
        zoomLevel: number;
        viewMode: string;
        hasPages: boolean;
        conversionStatus?: string;
      };
      networkInfo?: {
        connectionType: string;
        downlink?: number;
        rtt?: number;
        effectiveType?: string;
      };
    }
  ): void {
    logger.error(`Error in ${operation}`, error, {
      ...context,
      type: 'error_context',
      operation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(
    operation: string,
    metrics: {
      duration: number;
      memoryUsage?: number;
      networkRequests?: number;
      cacheHits?: number;
      cacheMisses?: number;
    },
    context: DocumentViewingContext
  ): void {
    logger.info(`Performance metrics for ${operation}`, {
      ...context,
      type: 'performance_metrics',
      operation,
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log cache operations
   */
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'invalidate' | 'clear',
    cacheKey: string,
    context?: DocumentViewingContext
  ): void {
    logger.debug(`Cache ${operation}: ${cacheKey}`, {
      ...context,
      type: 'cache_operation',
      operation,
      cacheKey,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log storage operations
   */
  logStorageOperation(
    operation: 'read' | 'write' | 'delete' | 'url_generation',
    success: boolean,
    context: DocumentViewingContext & {
      storageKey?: string;
      fileSize?: number;
      duration?: number;
    }
  ): void {
    const message = `Storage ${operation}: ${success ? 'success' : 'failed'}`;
    const logMethod = success ? logger.info.bind(logger) : logger.error.bind(logger);
    
    logMethod(message, {
      ...context,
      type: 'storage_operation',
      operation,
      success,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security events related to document access
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context: DocumentViewingContext
  ): void {
    logger.logSecurityEvent(event, severity, {
      ...context,
      type: 'document_security',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log unauthorized access attempts
   */
  logUnauthorizedAccess(
    reason: string,
    context: DocumentViewingContext
  ): void {
    this.logSecurityEvent(
      `Unauthorized document access attempt: ${reason}`,
      'high',
      context
    );
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    activity: string,
    context: DocumentViewingContext
  ): void {
    this.logSecurityEvent(
      `Suspicious document viewing activity: ${activity}`,
      'medium',
      context
    );
  }

  // ========== BATCH OPERATIONS ==========

  /**
   * Log multiple events in a batch for performance
   */
  logBatch(events: Array<{
    type: string;
    message: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    context: DocumentViewingContext;
  }>): void {
    events.forEach(event => {
      const logMethod = logger[event.level].bind(logger);
      logMethod(event.message, {
        ...event.context,
        type: event.type,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Create a context builder for chaining operations
   */
  createContext(baseContext: Partial<DocumentViewingContext> = {}): DocumentViewingContextBuilder {
    return new DocumentViewingContextBuilder(this, baseContext);
  }
}

/**
 * Context builder for fluent logging API
 */
class DocumentViewingContextBuilder {
  private context: Partial<DocumentViewingContext> = {};

  constructor(
    private logger: DocumentViewingLogger,
    baseContext: Partial<DocumentViewingContext>
  ) {
    this.context = { ...baseContext };
  }

  document(id: string, title?: string, type?: string): this {
    this.context.documentId = id;
    if (title) this.context.documentTitle = title;
    if (type) this.context.documentType = type;
    return this;
  }

  member(id: string, email?: string): this {
    this.context.memberId = id;
    if (email) this.context.memberEmail = email;
    return this;
  }

  session(id: string): this {
    this.context.sessionId = id;
    return this;
  }

  page(current: number, total?: number): this {
    this.context.currentPage = current;
    if (total) this.context.totalPages = total;
    return this;
  }

  viewer(type: string): this {
    this.context.viewerType = type;
    return this;
  }

  request(id: string, userAgent?: string, ip?: string): this {
    this.context.requestId = id;
    if (userAgent) this.context.userAgent = userAgent;
    if (ip) this.context.ipAddress = ip;
    return this;
  }

  logAccess(): void {
    this.logger.logDocumentAccess(this.context as DocumentViewingContext);
  }

  logLoadSuccess(loadTime: number): void {
    this.logger.logDocumentLoadSuccess({
      ...this.context,
      loadTime,
    } as DocumentViewingContext & { loadTime: number });
  }

  logLoadFailure(error: Error | string): void {
    this.logger.logDocumentLoadFailure(error, this.context as DocumentViewingContext);
  }

  logInteraction(action: string, additionalContext?: Partial<UserInteractionContext>): void {
    this.logger.logUserInteraction({
      ...this.context,
      action,
      timestamp: new Date().toISOString(),
      ...additionalContext,
    } as UserInteractionContext);
  }
}

// Export singleton instance
export const documentViewingLogger = new DocumentViewingLogger();

// Export types for use in other modules
export type { DocumentViewingLogger };