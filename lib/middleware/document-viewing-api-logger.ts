/**
 * API middleware for document viewing logging
 * Task 12.1: Implement comprehensive logging
 * Requirements: 5.1, 5.2 - Data integrity and consistency logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentViewingLogger, DocumentViewingContext, ConversionContext } from '@/lib/services/document-viewing-logger';
import { logger } from '@/lib/logger';

interface APILogContext extends DocumentViewingContext {
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  cacheHit?: boolean;
  errorCode?: string;
}

/**
 * Middleware for logging document viewing API operations
 */
export class DocumentViewingAPILogger {
  
  /**
   * Log API request start
   */
  static logAPIRequest(
    request: NextRequest,
    endpoint: string,
    context: Partial<DocumentViewingContext> = {}
  ): APILogContext {
    const requestContext: APILogContext = {
      ...context,
      endpoint,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: this.getClientIP(request),
      requestId: this.generateRequestId(),
      timestamp: new Date().toISOString(),
    };

    logger.info(`API Request: ${request.method} ${endpoint}`, {
      ...requestContext,
      type: 'api_request_start',
    });

    return requestContext;
  }

  /**
   * Log API response
   */
  static logAPIResponse(
    context: APILogContext,
    response: NextResponse,
    startTime: number,
    additionalContext?: Partial<APILogContext>
  ): void {
    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    
    const responseContext: APILogContext = {
      ...context,
      statusCode,
      responseTime,
      ...additionalContext,
    };

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `API Response: ${context.method} ${context.endpoint} ${statusCode} (${responseTime}ms)`;

    logger[level](message, {
      ...responseContext,
      type: 'api_response',
    });

    // Log performance metrics if response time is high
    if (responseTime > 5000) {
      documentViewingLogger.logPerformanceMetrics(
        `API ${context.endpoint}`,
        {
          duration: responseTime,
          networkRequests: 1,
        },
        responseContext
      );
    }
  }

  /**
   * Log API error
   */
  static logAPIError(
    context: APILogContext,
    error: Error | string,
    startTime: number,
    additionalContext?: any
  ): void {
    const responseTime = Date.now() - startTime;
    
    const errorContext = {
      ...context,
      responseTime,
      statusCode: 500,
      ...additionalContext,
    };

    documentViewingLogger.logErrorContext(
      error,
      `API ${context.endpoint}`,
      {
        ...errorContext,
        apiError: true,
        stackTrace: error instanceof Error ? error.stack : undefined,
      }
    );
  }

  /**
   * Log document pages retrieval
   */
  static logPagesRetrieval(
    documentId: string,
    success: boolean,
    pagesFound: number,
    context: APILogContext,
    additionalInfo?: {
      cacheHit?: boolean;
      conversionTriggered?: boolean;
      conversionStatus?: string;
    }
  ): void {
    documentViewingLogger.logPagesRetrieval(success, pagesFound, {
      ...context,
      documentId,
      totalPages: pagesFound,
    });

    // Log cache performance
    if (additionalInfo?.cacheHit !== undefined) {
      documentViewingLogger.logCacheOperation(
        additionalInfo.cacheHit ? 'hit' : 'miss',
        `pages_${documentId}`,
        context
      );
    }

    // Log conversion trigger if applicable
    if (additionalInfo?.conversionTriggered) {
      logger.info('Automatic conversion triggered for document', {
        ...context,
        documentId,
        conversionStatus: additionalInfo.conversionStatus,
        type: 'auto_conversion_trigger',
      });
    }
  }

  /**
   * Log document access authorization
   */
  static logDocumentAccessCheck(
    documentId: string,
    userId: string,
    authorized: boolean,
    context: APILogContext,
    reason?: string
  ): void {
    if (authorized) {
      documentViewingLogger.logDocumentAccess({
        ...context,
        documentId,
        memberId: userId,
      });
    } else {
      documentViewingLogger.logUnauthorizedAccess(
        reason || 'Access denied',
        {
          ...context,
          documentId,
          memberId: userId,
        }
      );
    }
  }

  /**
   * Log conversion job operations
   */
  static logConversionJobOperation(
    operation: 'create' | 'start' | 'progress' | 'complete' | 'fail',
    documentId: string,
    context: APILogContext,
    conversionContext?: Partial<ConversionContext>
  ): void {
    const fullContext: ConversionContext = {
      ...context,
      documentId,
      ...conversionContext,
    };

    switch (operation) {
      case 'create':
        documentViewingLogger.logConversionJobCreated(fullContext);
        break;
      case 'start':
        documentViewingLogger.logConversionStarted(fullContext);
        break;
      case 'progress':
        if (conversionContext?.progress !== undefined && conversionContext?.stage) {
          documentViewingLogger.logConversionProgress(
            conversionContext.progress,
            conversionContext.stage,
            fullContext
          );
        }
        break;
      case 'complete':
        documentViewingLogger.logConversionSuccess(fullContext);
        break;
      case 'fail':
        if (conversionContext?.errorDetails) {
          documentViewingLogger.logConversionFailure(
            conversionContext.errorDetails,
            fullContext
          );
        }
        break;
    }
  }

  /**
   * Log storage operations
   */
  static logStorageOperation(
    operation: 'read' | 'write' | 'delete' | 'url_generation',
    success: boolean,
    context: APILogContext,
    storageContext?: {
      storageKey?: string;
      fileSize?: number;
      duration?: number;
    }
  ): void {
    documentViewingLogger.logStorageOperation(
      operation,
      success,
      {
        ...context,
        ...storageContext,
      }
    );
  }

  /**
   * Log cache operations
   */
  static logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'invalidate' | 'clear',
    cacheKey: string,
    context: APILogContext
  ): void {
    documentViewingLogger.logCacheOperation(operation, cacheKey, context);
  }

  /**
   * Log database operations
   */
  static logDatabaseOperation(
    operation: string,
    success: boolean,
    context: APILogContext,
    dbContext?: {
      query?: string;
      duration?: number;
      rowsAffected?: number;
    }
  ): void {
    const message = `Database ${operation}: ${success ? 'success' : 'failed'}`;
    const logMethod = success ? logger.info.bind(logger) : logger.error.bind(logger);
    
    logMethod(message, {
      ...context,
      type: 'database_operation',
      operation,
      success,
      ...dbContext,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log suspicious API activity
   */
  static logSuspiciousActivity(
    activity: string,
    context: APILogContext,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    documentViewingLogger.logSuspiciousActivity(activity, context);
    
    // Also log as security event
    logger.logSecurityEvent(
      `Suspicious API activity: ${activity}`,
      severity,
      {
        ...context,
        endpoint: context.endpoint,
        method: context.method,
      }
    );
  }

  /**
   * Create a wrapper for API route handlers with automatic logging
   */
  static withLogging<T extends any[]>(
    endpoint: string,
    handler: (request: NextRequest, context: APILogContext, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const startTime = Date.now();
      const logContext = this.logAPIRequest(request, endpoint);

      try {
        const response = await handler(request, logContext, ...args);
        this.logAPIResponse(logContext, response, startTime);
        return response;
      } catch (error) {
        this.logAPIError(logContext, error as Error, startTime);
        throw error;
      }
    };
  }

  /**
   * Helper methods
   */
  private static getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || remoteAddr || undefined;
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Utility function to extract document context from request
 */
export function extractDocumentContext(
  request: NextRequest,
  documentId?: string,
  userId?: string
): Partial<DocumentViewingContext> {
  return {
    documentId,
    memberId: userId,
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: DocumentViewingAPILogger['getClientIP'](request),
    requestId: DocumentViewingAPILogger['generateRequestId'](),
  };
}

/**
 * Middleware for automatic request/response logging
 */
export function createDocumentViewingAPIMiddleware(endpoint: string) {
  return DocumentViewingAPILogger.withLogging(endpoint);
}