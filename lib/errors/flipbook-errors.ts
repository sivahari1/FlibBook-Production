/**
 * Flipbook Error Classes
 * 
 * Comprehensive error handling for flipbook and annotations system
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

/**
 * Base error class for all flipbook-related errors
 */
export class FlipbookError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}

/**
 * PDF Conversion Errors
 * Requirement: 18.1
 */
export class PDFConversionError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PDF_CONVERSION_ERROR', 500, true, context);
  }

  static invalidPDF(filename: string) {
    return new PDFConversionError(
      'The uploaded file is not a valid PDF document.',
      { filename, reason: 'invalid_format' }
    );
  }

  static corruptedPDF(filename: string) {
    return new PDFConversionError(
      'The PDF file appears to be corrupted and cannot be processed.',
      { filename, reason: 'corrupted' }
    );
  }

  static conversionTimeout(filename: string, timeout: number) {
    return new PDFConversionError(
      `PDF conversion timed out after ${timeout}ms.`,
      { filename, timeout, reason: 'timeout' }
    );
  }

  static pageLimitExceeded(filename: string, pageCount: number, maxPages: number) {
    return new PDFConversionError(
      `PDF has ${pageCount} pages, which exceeds the maximum of ${maxPages} pages.`,
      { filename, pageCount, maxPages, reason: 'page_limit_exceeded' }
    );
  }

  static conversionFailed(filename: string, error: Error) {
    return new PDFConversionError(
      'Failed to convert PDF to flipbook format.',
      { filename, originalError: error.message, reason: 'conversion_failed' }
    );
  }
}

/**
 * Media Upload Errors
 * Requirement: 18.2
 */
export class MediaUploadError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'MEDIA_UPLOAD_ERROR', 400, true, context);
  }

  static invalidMediaType(filename: string, mimeType: string, allowedTypes: string[]) {
    return new MediaUploadError(
      `File type ${mimeType} is not supported. Allowed types: ${allowedTypes.join(', ')}.`,
      { filename, mimeType, allowedTypes, reason: 'invalid_type' }
    );
  }

  static fileTooLarge(filename: string, size: number, maxSize: number) {
    return new MediaUploadError(
      `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${(maxSize / 1024 / 1024).toFixed(2)}MB.`,
      { filename, size, maxSize, reason: 'file_too_large' }
    );
  }

  static uploadFailed(filename: string, error: Error) {
    return new MediaUploadError(
      'Failed to upload media file.',
      { filename, originalError: error.message, reason: 'upload_failed' }
    );
  }

  static storageQuotaExceeded(userId: string, currentUsage: number, quota: number) {
    return new MediaUploadError(
      'Storage quota exceeded. Please delete some files or upgrade your plan.',
      { userId, currentUsage, quota, reason: 'quota_exceeded' }
    );
  }

  static invalidMediaContent(filename: string, reason: string) {
    return new MediaUploadError(
      `Media file content is invalid: ${reason}.`,
      { filename, reason: 'invalid_content', details: reason }
    );
  }
}

/**
 * Network Connectivity Errors
 * Requirement: 18.3
 */
export class NetworkError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 503, true, context);
  }

  static connectionLost() {
    return new NetworkError(
      'Network connection lost. Please check your internet connection.',
      { reason: 'connection_lost' }
    );
  }

  static requestTimeout(url: string, timeout: number) {
    return new NetworkError(
      `Request timed out after ${timeout}ms.`,
      { url, timeout, reason: 'timeout' }
    );
  }

  static serverUnreachable(url: string) {
    return new NetworkError(
      'Unable to reach the server. Please try again later.',
      { url, reason: 'server_unreachable' }
    );
  }

  static rateLimitExceeded(retryAfter?: number) {
    return new NetworkError(
      'Too many requests. Please try again later.',
      { retryAfter, reason: 'rate_limit_exceeded' }
    );
  }

  static badGateway(url: string) {
    return new NetworkError(
      'Server error occurred. Please try again later.',
      { url, reason: 'bad_gateway' }
    );
  }
}

/**
 * Permission Errors
 * Requirement: 18.4
 */
export class PermissionError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PERMISSION_ERROR', 403, true, context);
  }

  static accessDenied(resource: string, action: string) {
    return new PermissionError(
      `You don't have permission to ${action} this ${resource}.`,
      { resource, action, reason: 'access_denied' }
    );
  }

  static annotationPermissionDenied(documentId: string, action: string) {
    return new PermissionError(
      `You don't have permission to ${action} annotations on this document.`,
      { documentId, action, reason: 'annotation_permission_denied' }
    );
  }

  static documentNotFound(documentId: string) {
    return new PermissionError(
      'Document not found or you don\'t have access to it.',
      { documentId, reason: 'document_not_found' }
    );
  }

  static sessionExpired() {
    return new PermissionError(
      'Your session has expired. Please log in again.',
      { reason: 'session_expired' }
    );
  }

  static insufficientPrivileges(requiredRole: string, userRole: string) {
    return new PermissionError(
      `This action requires ${requiredRole} privileges.`,
      { requiredRole, userRole, reason: 'insufficient_privileges' }
    );
  }
}

/**
 * Annotation Errors
 * Requirement: 18.2
 */
export class AnnotationError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'ANNOTATION_ERROR', 400, true, context);
  }

  static invalidPosition(x: number, y: number, pageWidth: number, pageHeight: number) {
    return new AnnotationError(
      'Annotation position is outside page boundaries.',
      { x, y, pageWidth, pageHeight, reason: 'invalid_position' }
    );
  }

  static invalidContent(reason: string) {
    return new AnnotationError(
      `Annotation content is invalid: ${reason}.`,
      { reason: 'invalid_content', details: reason }
    );
  }

  static annotationNotFound(annotationId: string) {
    return new AnnotationError(
      'Annotation not found.',
      { annotationId, reason: 'not_found' }
    );
  }

  static tooManyAnnotations(documentId: string, pageNumber: number, limit: number) {
    return new AnnotationError(
      `Maximum number of annotations (${limit}) reached for this page.`,
      { documentId, pageNumber, limit, reason: 'limit_exceeded' }
    );
  }
}

/**
 * Page Loading Errors
 * Requirement: 18.1
 */
export class PageLoadError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'PAGE_LOAD_ERROR', 500, true, context);
  }

  static pageNotFound(documentId: string, pageNumber: number) {
    return new PageLoadError(
      `Page ${pageNumber} not found in document.`,
      { documentId, pageNumber, reason: 'page_not_found' }
    );
  }

  static imageLoadFailed(imageUrl: string, error?: Error) {
    return new PageLoadError(
      'Failed to load page image.',
      { imageUrl, originalError: error?.message, reason: 'image_load_failed' }
    );
  }

  static invalidPageNumber(pageNumber: number, totalPages: number) {
    return new PageLoadError(
      `Invalid page number ${pageNumber}. Document has ${totalPages} pages.`,
      { pageNumber, totalPages, reason: 'invalid_page_number' }
    );
  }
}

/**
 * DRM/Security Errors
 * Requirement: 18.4
 */
export class SecurityError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SECURITY_ERROR', 403, true, context);
  }

  static drmViolation(violation: string) {
    return new SecurityError(
      'DRM protection violation detected.',
      { violation, reason: 'drm_violation' }
    );
  }

  static devToolsDetected() {
    return new SecurityError(
      'Developer tools detected. This content is protected.',
      { reason: 'dev_tools_detected' }
    );
  }

  static screenshotAttempt() {
    return new SecurityError(
      'Screenshot attempt blocked. This content is protected.',
      { reason: 'screenshot_attempt' }
    );
  }

  static unauthorizedAccess(resource: string) {
    return new SecurityError(
      'Unauthorized access attempt detected.',
      { resource, reason: 'unauthorized_access' }
    );
  }
}

/**
 * Validation Errors
 * Requirement: 18.2
 */
export class ValidationError extends FlipbookError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
  }

  static missingField(field: string) {
    return new ValidationError(
      `Required field '${field}' is missing.`,
      { field, reason: 'missing_field' }
    );
  }

  static invalidFormat(field: string, expectedFormat: string) {
    return new ValidationError(
      `Field '${field}' has invalid format. Expected: ${expectedFormat}.`,
      { field, expectedFormat, reason: 'invalid_format' }
    );
  }

  static outOfRange(field: string, value: any, min: any, max: any) {
    return new ValidationError(
      `Field '${field}' value ${value} is out of range [${min}, ${max}].`,
      { field, value, min, max, reason: 'out_of_range' }
    );
  }
}

/**
 * Error type guards
 */
export function isFlipbookError(error: any): error is FlipbookError {
  return error instanceof FlipbookError;
}

export function isPDFConversionError(error: any): error is PDFConversionError {
  return error instanceof PDFConversionError;
}

export function isMediaUploadError(error: any): error is MediaUploadError {
  return error instanceof MediaUploadError;
}

export function isNetworkError(error: any): error is NetworkError {
  return error instanceof NetworkError;
}

export function isPermissionError(error: any): error is PermissionError {
  return error instanceof PermissionError;
}

export function isSecurityError(error: any): error is SecurityError {
  return error instanceof SecurityError;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Get error severity based on error type
 */
export function getErrorSeverity(error: Error): ErrorSeverity {
  if (error instanceof SecurityError) return ErrorSeverity.CRITICAL;
  if (error instanceof PermissionError) return ErrorSeverity.HIGH;
  if (error instanceof PDFConversionError) return ErrorSeverity.MEDIUM;
  if (error instanceof NetworkError) return ErrorSeverity.MEDIUM;
  if (error instanceof MediaUploadError) return ErrorSeverity.LOW;
  if (error instanceof ValidationError) return ErrorSeverity.LOW;
  
  return ErrorSeverity.MEDIUM;
}
