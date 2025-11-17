/**
 * Audit logging for admin actions and security events
 * Requirements: 13.6, 13.7 - Log all admin actions and authentication attempts
 */

import { prisma } from './db';
import { logger } from './logger';

export type AuditAction =
  // Admin actions
  | 'admin_login'
  | 'admin_access_request_viewed'
  | 'admin_access_request_approved'
  | 'admin_access_request_rejected'
  | 'admin_access_request_closed'
  | 'admin_user_created'
  | 'admin_user_updated'
  | 'admin_user_deactivated'
  | 'admin_user_activated'
  | 'admin_password_reset'
  // Authentication events
  | 'user_login_success'
  | 'user_login_failed'
  | 'user_logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verification_sent'
  | 'email_verified'
  // Unauthorized access attempts
  | 'unauthorized_admin_access'
  | 'unauthorized_api_access'
  | 'unauthorized_document_access';

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  userEmail?: string;
  targetUserId?: string;
  targetUserEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log an audit event
 * Stores in database and logs to console/monitoring service
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to console/monitoring service immediately
    const logLevel = entry.success ? 'info' : 'warn';
    const message = `Audit: ${entry.action} - ${entry.success ? 'success' : 'failed'}`;
    
    logger[logLevel](message, {
      action: entry.action,
      userId: entry.userId,
      userEmail: entry.userEmail,
      targetUserId: entry.targetUserId,
      targetUserEmail: entry.targetUserEmail,
      ipAddress: entry.ipAddress,
      success: entry.success,
      errorMessage: entry.errorMessage,
      metadata: entry.metadata,
      type: 'audit',
      timestamp: new Date().toISOString(),
    });

    // Store in database for long-term audit trail
    // Note: This requires an AuditLog model in Prisma schema
    // For now, we'll just log to console/monitoring
    // In production, you would store this in a dedicated audit log table or service
    
  } catch (error) {
    // Never let audit logging failures break the application
    logger.error('Failed to log audit event', error, {
      action: entry.action,
      userId: entry.userId,
    });
  }
}

/**
 * Log admin action
 */
export async function logAdminAction(
  action: AuditAction,
  adminUserId: string,
  adminEmail: string,
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    action,
    userId: adminUserId,
    userEmail: adminEmail,
    ipAddress,
    userAgent,
    metadata,
    success: true,
  });
}

/**
 * Log user creation by admin
 */
export async function logUserCreation(
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  targetUserEmail: string,
  role: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: 'admin_user_created',
    userId: adminUserId,
    userEmail: adminEmail,
    targetUserId,
    targetUserEmail,
    ipAddress,
    metadata: { role },
    success: true,
  });
}

/**
 * Log user update by admin
 */
export async function logUserUpdate(
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  targetUserEmail: string,
  changes: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: 'admin_user_updated',
    userId: adminUserId,
    userEmail: adminEmail,
    targetUserId,
    targetUserEmail,
    ipAddress,
    metadata: { changes },
    success: true,
  });
}

/**
 * Log password reset by admin
 */
export async function logPasswordReset(
  adminUserId: string,
  adminEmail: string,
  targetUserId: string,
  targetUserEmail: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action: 'admin_password_reset',
    userId: adminUserId,
    userEmail: adminEmail,
    targetUserId,
    targetUserEmail,
    ipAddress,
    metadata: { resetBy: 'admin' },
    success: true,
  });
}

/**
 * Log authentication attempt
 */
export async function logAuthenticationAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  errorMessage?: string
): Promise<void> {
  await logAuditEvent({
    action: success ? 'user_login_success' : 'user_login_failed',
    userEmail: email,
    ipAddress,
    userAgent,
    success,
    errorMessage,
  });
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  action: AuditAction,
  userId?: string,
  userEmail?: string,
  path?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    action,
    userId,
    userEmail,
    ipAddress,
    userAgent,
    metadata: { path },
    success: false,
    errorMessage: 'Unauthorized access attempt',
  });
  
  // Also log as security event
  logger.logSecurityEvent(
    `Unauthorized access: ${action}`,
    'medium',
    {
      userId,
      userEmail,
      path,
      ipAddress,
      userAgent,
    }
  );
}

/**
 * Log access request status change
 */
export async function logAccessRequestAction(
  action: 'admin_access_request_approved' | 'admin_access_request_rejected' | 'admin_access_request_closed',
  adminUserId: string,
  adminEmail: string,
  accessRequestId: string,
  requestEmail: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    action,
    userId: adminUserId,
    userEmail: adminEmail,
    ipAddress,
    metadata: {
      accessRequestId,
      requestEmail,
    },
    success: true,
  });
}

/**
 * Helper to extract IP address from request
 */
export function getClientIp(request: Request): string | undefined {
  // Check various headers for IP address
  const headers = request.headers;
  
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    undefined
  );
}

/**
 * Helper to extract user agent from request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}
