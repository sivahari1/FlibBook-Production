/**
 * Error logging and monitoring utilities
 * Requirements: 9.5, 10.5 - Error logging and monitoring setup
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

/**
 * Structured logger for application events
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Log an informational message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      } : String(error),
    };
    
    this.log('error', message, errorContext);
    
    // In production, you would send this to a monitoring service
    // Examples: Sentry, LogRocket, DataDog, etc.
    if (this.isProduction && process.env.SENTRY_DSN) {
      // Sentry.captureException(error, { contexts: { custom: context } });
    }
  }

  /**
   * Log a debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // In development, use console with colors
    if (this.isDevelopment) {
      const colors = {
        info: '\x1b[36m',    // Cyan
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m',   // Red
        debug: '\x1b[90m',   // Gray
      };
      const reset = '\x1b[0m';
      const color = colors[level];
      
      console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, context || '');
    } else {
      // In production, use structured JSON logging
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.log(level, `${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      duration,
      ...context,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    this.log(level, `Security Event: ${event}`, {
      severity,
      type: 'security',
      timestamp: new Date().toISOString(),
      ...context,
    });
    
    // In production, send critical security events to monitoring
    if (this.isProduction && (severity === 'critical' || severity === 'high')) {
      // Alert security team or monitoring service
      // Examples: Sentry, PagerDuty, Slack webhook, etc.
    }
  }

  /**
   * Log authentication attempt
   */
  logAuthAttempt(
    action: 'login' | 'register' | 'verify_email' | 'resend_verification' | 'forgot_password' | 'reset_password',
    success: boolean,
    context?: LogContext
  ): void {
    const message = `Auth ${action}: ${success ? 'success' : 'failed'}`;
    const level = success ? 'info' : 'warn';
    
    this.log(level, message, {
      action,
      success,
      type: 'authentication',
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  /**
   * Log rate limit violation
   */
  logRateLimitViolation(
    endpoint: string,
    identifier: string,
    context?: LogContext
  ): void {
    this.logSecurityEvent(
      `Rate limit exceeded: ${endpoint}`,
      'medium',
      {
        endpoint,
        identifier,
        ...context,
      }
    );
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    activity: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext
  ): void {
    this.logSecurityEvent(
      `Suspicious activity: ${activity}`,
      severity,
      {
        activity,
        ...context,
      }
    );
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Middleware helper to log API requests
 */
export function createRequestLogger() {
  return (
    method: string,
    path: string,
    handler: () => Promise<Response>
  ) => {
    return async (): Promise<Response> => {
      const startTime = Date.now();
      
      try {
        const response = await handler();
        const duration = Date.now() - startTime;
        
        logger.logRequest(method, path, response.status, duration);
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Request failed: ${method} ${path}`, error, {
          method,
          path,
          duration,
        });
        throw error;
      }
    };
  };
}

/**
 * Helper to sanitize sensitive data from logs
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
  ];
  
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}
