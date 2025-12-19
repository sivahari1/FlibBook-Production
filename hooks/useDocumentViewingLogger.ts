/**
 * React hook for document viewing logging
 * Task 12.1: Implement comprehensive logging
 * Requirements: 5.1, 5.2 - Data integrity and consistency logging
 */

import { useCallback, useEffect, useRef } from 'react';
import { documentViewingLogger, DocumentViewingContext, UserInteractionContext } from '@/lib/services/document-viewing-logger';

interface UseDocumentViewingLoggerProps {
  documentId: string;
  memberId?: string;
  memberEmail?: string;
  documentTitle?: string;
  documentType?: string;
  sessionId?: string;
  enabled?: boolean;
}

interface DocumentViewingLoggerHook {
  // Document lifecycle logging
  logDocumentAccess: () => void;
  logDocumentLoadSuccess: (loadTime: number) => void;
  logDocumentLoadFailure: (error: Error | string) => void;
  logPagesRetrieval: (success: boolean, pagesFound: number) => void;
  
  // Conversion logging
  logConversionStarted: (conversionJobId?: string) => void;
  logConversionProgress: (progress: number, stage: string) => void;
  logConversionSuccess: (processingTime?: number) => void;
  logConversionFailure: (error: Error | string, retryCount?: number) => void;
  logConversionRetry: (retryCount: number) => void;
  
  // User interaction logging
  logUserInteraction: (action: string, additionalContext?: Partial<UserInteractionContext>) => void;
  logPageNavigation: (fromPage: number, toPage: number) => void;
  logZoomChange: (newZoomLevel: number) => void;
  logViewModeChange: (newViewMode: string) => void;
  logDocumentSearch: (searchQuery: string, resultsFound: number) => void;
  
  // Session logging
  logViewingSessionStart: () => void;
  logViewingSessionEnd: (pagesViewed: number) => void;
  
  // Error logging
  logErrorContext: (error: Error | string, operation: string, additionalContext?: any) => void;
  
  // Performance logging
  logPerformanceMetrics: (operation: string, metrics: {
    duration: number;
    memoryUsage?: number;
    networkRequests?: number;
    cacheHits?: number;
    cacheMisses?: number;
  }) => void;
  
  // Security logging
  logUnauthorizedAccess: (reason: string) => void;
  logSuspiciousActivity: (activity: string) => void;
}

export function useDocumentViewingLogger({
  documentId,
  memberId,
  memberEmail,
  documentTitle,
  documentType,
  sessionId,
  enabled = true,
}: UseDocumentViewingLoggerProps): DocumentViewingLoggerHook {
  const sessionStartTime = useRef<number>(Date.now());
  const pageViewCount = useRef<number>(0);
  const currentPage = useRef<number>(1);
  const interactionCount = useRef<number>(0);

  // Generate session ID if not provided
  const actualSessionId = sessionId || `session_${documentId}_${Date.now()}`;

  // Base context for all logging operations
  const getBaseContext = useCallback((): DocumentViewingContext => {
    return {
      documentId,
      memberId,
      memberEmail,
      documentTitle,
      documentType,
      sessionId: actualSessionId,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      currentPage: currentPage.current,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }, [documentId, memberId, memberEmail, documentTitle, documentType, actualSessionId]);

  // Enhanced context with browser and system information
  const getEnhancedContext = useCallback(() => {
    if (typeof window === 'undefined') return getBaseContext();

    return {
      ...getBaseContext(),
      browserInfo: {
        userAgent: window.navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        cookiesEnabled: window.navigator.cookieEnabled,
        onlineStatus: window.navigator.onLine,
      },
      systemInfo: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: window.navigator.language,
        platform: window.navigator.platform,
      },
      networkInfo: 'connection' in window.navigator ? {
        connectionType: (window.navigator as any).connection?.type || 'unknown',
        downlink: (window.navigator as any).connection?.downlink,
        rtt: (window.navigator as any).connection?.rtt,
        effectiveType: (window.navigator as any).connection?.effectiveType,
      } : undefined,
    };
  }, [getBaseContext]);

  // Document lifecycle logging
  const logDocumentAccess = useCallback(() => {
    if (!enabled) return;
    documentViewingLogger.logDocumentAccess(getBaseContext());
  }, [enabled, getBaseContext]);

  const logDocumentLoadSuccess = useCallback((loadTime: number) => {
    if (!enabled) return;
    documentViewingLogger.logDocumentLoadSuccess({
      ...getBaseContext(),
      loadTime,
    });
  }, [enabled, getBaseContext]);

  const logDocumentLoadFailure = useCallback((error: Error | string) => {
    if (!enabled) return;
    documentViewingLogger.logDocumentLoadFailure(error, getEnhancedContext());
  }, [enabled, getEnhancedContext]);

  const logPagesRetrieval = useCallback((success: boolean, pagesFound: number) => {
    if (!enabled) return;
    documentViewingLogger.logPagesRetrieval(success, pagesFound, {
      ...getBaseContext(),
      totalPages: pagesFound,
    });
  }, [enabled, getBaseContext]);

  // Conversion logging
  const logConversionStarted = useCallback((conversionJobId?: string) => {
    if (!enabled) return;
    documentViewingLogger.logConversionStarted({
      ...getBaseContext(),
      conversionJobId,
      inputFormat: documentType,
      outputFormat: 'image',
    });
  }, [enabled, getBaseContext, documentType]);

  const logConversionProgress = useCallback((progress: number, stage: string) => {
    if (!enabled) return;
    documentViewingLogger.logConversionProgress(progress, stage, {
      ...getBaseContext(),
    });
  }, [enabled, getBaseContext]);

  const logConversionSuccess = useCallback((processingTime?: number) => {
    if (!enabled) return;
    documentViewingLogger.logConversionSuccess({
      ...getBaseContext(),
      processingTime,
    });
  }, [enabled, getBaseContext]);

  const logConversionFailure = useCallback((error: Error | string, retryCount?: number) => {
    if (!enabled) return;
    documentViewingLogger.logConversionFailure(error, {
      ...getEnhancedContext(),
      retryCount,
    });
  }, [enabled, getEnhancedContext]);

  const logConversionRetry = useCallback((retryCount: number) => {
    if (!enabled) return;
    documentViewingLogger.logConversionRetry({
      ...getBaseContext(),
      retryCount,
    });
  }, [enabled, getBaseContext]);

  // User interaction logging
  const logUserInteraction = useCallback((action: string, additionalContext?: Partial<UserInteractionContext>) => {
    if (!enabled) return;
    interactionCount.current += 1;
    documentViewingLogger.logUserInteraction({
      ...getBaseContext(),
      action,
      timestamp: new Date().toISOString(),
      ...additionalContext,
    });
  }, [enabled, getBaseContext]);

  const logPageNavigation = useCallback((fromPage: number, toPage: number) => {
    if (!enabled) return;
    currentPage.current = toPage;
    pageViewCount.current += 1;
    documentViewingLogger.logPageNavigation(fromPage, toPage, getBaseContext());
  }, [enabled, getBaseContext]);

  const logZoomChange = useCallback((newZoomLevel: number) => {
    if (!enabled) return;
    documentViewingLogger.logZoomChange(newZoomLevel, getBaseContext());
  }, [enabled, getBaseContext]);

  const logViewModeChange = useCallback((newViewMode: string) => {
    if (!enabled) return;
    documentViewingLogger.logViewModeChange(newViewMode, getBaseContext());
  }, [enabled, getBaseContext]);

  const logDocumentSearch = useCallback((searchQuery: string, resultsFound: number) => {
    if (!enabled) return;
    documentViewingLogger.logDocumentSearch(searchQuery, resultsFound, getBaseContext());
  }, [enabled, getBaseContext]);

  // Session logging
  const logViewingSessionStart = useCallback(() => {
    if (!enabled) return;
    sessionStartTime.current = Date.now();
    documentViewingLogger.logViewingSessionStart(getBaseContext());
  }, [enabled, getBaseContext]);

  const logViewingSessionEnd = useCallback((pagesViewed?: number) => {
    if (!enabled) return;
    const sessionDuration = Date.now() - sessionStartTime.current;
    const actualPagesViewed = pagesViewed || pageViewCount.current;
    
    documentViewingLogger.logViewingSessionEnd(
      sessionDuration,
      actualPagesViewed,
      {
        ...getBaseContext(),
        duration: sessionDuration,
      }
    );
  }, [enabled, getBaseContext]);

  // Error logging
  const logErrorContext = useCallback((error: Error | string, operation: string, additionalContext?: any) => {
    if (!enabled) return;
    
    const errorContext = {
      ...getEnhancedContext(),
      stackTrace: error instanceof Error ? error.stack : undefined,
      documentState: {
        loadingState: 'error',
        currentPage: currentPage.current,
        totalPages: 0,
        zoomLevel: 1,
        viewMode: 'continuous',
        hasPages: false,
        ...additionalContext?.documentState,
      },
      ...additionalContext,
    };

    documentViewingLogger.logErrorContext(error, operation, errorContext);
  }, [enabled, getEnhancedContext]);

  // Performance logging
  const logPerformanceMetrics = useCallback((operation: string, metrics: {
    duration: number;
    memoryUsage?: number;
    networkRequests?: number;
    cacheHits?: number;
    cacheMisses?: number;
  }) => {
    if (!enabled) return;
    documentViewingLogger.logPerformanceMetrics(operation, metrics, getBaseContext());
  }, [enabled, getBaseContext]);

  // Security logging
  const logUnauthorizedAccess = useCallback((reason: string) => {
    if (!enabled) return;
    documentViewingLogger.logUnauthorizedAccess(reason, getEnhancedContext());
  }, [enabled, getEnhancedContext]);

  const logSuspiciousActivity = useCallback((activity: string) => {
    if (!enabled) return;
    documentViewingLogger.logSuspiciousActivity(activity, getEnhancedContext());
  }, [enabled, getEnhancedContext]);

  // Auto-log session start on mount
  useEffect(() => {
    if (enabled) {
      logViewingSessionStart();
    }
  }, [enabled, logViewingSessionStart]);

  // Auto-log session end on unmount
  useEffect(() => {
    return () => {
      if (enabled) {
        logViewingSessionEnd();
      }
    };
  }, [enabled, logViewingSessionEnd]);

  // Log page visibility changes
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logUserInteraction('page_hidden');
      } else {
        logUserInteraction('page_visible');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, logUserInteraction]);

  // Log network status changes
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleOnline = () => logUserInteraction('network_online');
    const handleOffline = () => logUserInteraction('network_offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, logUserInteraction]);

  return {
    logDocumentAccess,
    logDocumentLoadSuccess,
    logDocumentLoadFailure,
    logPagesRetrieval,
    logConversionStarted,
    logConversionProgress,
    logConversionSuccess,
    logConversionFailure,
    logConversionRetry,
    logUserInteraction,
    logPageNavigation,
    logZoomChange,
    logViewModeChange,
    logDocumentSearch,
    logViewingSessionStart,
    logViewingSessionEnd,
    logErrorContext,
    logPerformanceMetrics,
    logUnauthorizedAccess,
    logSuspiciousActivity,
  };
}