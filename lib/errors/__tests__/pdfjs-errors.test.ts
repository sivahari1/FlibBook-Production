/**
 * Tests for PDF.js Error Types and Handling
 * 
 * Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect } from 'vitest';
import {
  PDFJSErrorCode,
  PDFJSErrorCategory,
  getErrorCategory,
  getUserMessage,
  getErrorSuggestion,
  isRecoverable,
  isRetryable,
  createPDFJSError,
  parsePDFJSError,
  getRetryDelay,
  getMaxRetryAttempts,
} from '../pdfjs-errors';

describe('PDF.js Error Types', () => {
  describe('getErrorCategory', () => {
    it('should categorize network errors correctly', () => {
      expect(getErrorCategory(PDFJSErrorCode.TIMEOUT)).toBe(PDFJSErrorCategory.NETWORK);
      expect(getErrorCategory(PDFJSErrorCode.NETWORK_ERROR)).toBe(PDFJSErrorCategory.NETWORK);
      expect(getErrorCategory(PDFJSErrorCode.MISSING_PDF)).toBe(PDFJSErrorCategory.NETWORK);
    });
    
    it('should categorize permission errors correctly', () => {
      expect(getErrorCategory(PDFJSErrorCode.PERMISSION_DENIED)).toBe(PDFJSErrorCategory.PERMISSION);
      expect(getErrorCategory(PDFJSErrorCode.CORS_ERROR)).toBe(PDFJSErrorCategory.PERMISSION);
      expect(getErrorCategory(PDFJSErrorCode.PASSWORD_REQUIRED)).toBe(PDFJSErrorCategory.PERMISSION);
    });
    
    it('should categorize file errors correctly', () => {
      expect(getErrorCategory(PDFJSErrorCode.INVALID_PDF)).toBe(PDFJSErrorCategory.FILE);
      expect(getErrorCategory(PDFJSErrorCode.CORRUPTED_FILE)).toBe(PDFJSErrorCategory.FILE);
      expect(getErrorCategory(PDFJSErrorCode.UNSUPPORTED_FORMAT)).toBe(PDFJSErrorCategory.FILE);
    });
    
    it('should categorize rendering errors correctly', () => {
      expect(getErrorCategory(PDFJSErrorCode.RENDER_ERROR)).toBe(PDFJSErrorCategory.RENDERING);
      expect(getErrorCategory(PDFJSErrorCode.CANVAS_CONTEXT_ERROR)).toBe(PDFJSErrorCategory.RENDERING);
    });
    
    it('should categorize library errors correctly', () => {
      expect(getErrorCategory(PDFJSErrorCode.LIBRARY_UNAVAILABLE)).toBe(PDFJSErrorCategory.LIBRARY);
      expect(getErrorCategory(PDFJSErrorCode.WORKER_INIT_ERROR)).toBe(PDFJSErrorCategory.LIBRARY);
    });
  });
  
  describe('getUserMessage', () => {
    it('should return user-friendly messages for network errors', () => {
      const message = getUserMessage(PDFJSErrorCode.TIMEOUT);
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });
    
    it('should return user-friendly messages for permission errors', () => {
      const message = getUserMessage(PDFJSErrorCode.PERMISSION_DENIED);
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });
    
    it('should return user-friendly messages for file errors', () => {
      const message = getUserMessage(PDFJSErrorCode.CORRUPTED_FILE);
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });
  });
  
  describe('getErrorSuggestion', () => {
    it('should provide helpful suggestions for network errors', () => {
      const suggestion = getErrorSuggestion(PDFJSErrorCode.NETWORK_ERROR);
      expect(suggestion).toContain('connection');
    });
    
    it('should provide helpful suggestions for permission errors', () => {
      const suggestion = getErrorSuggestion(PDFJSErrorCode.PERMISSION_DENIED);
      expect(suggestion).toContain('permission');
    });
    
    it('should provide helpful suggestions for file errors', () => {
      const suggestion = getErrorSuggestion(PDFJSErrorCode.CORRUPTED_FILE);
      expect(suggestion).toContain('corrupted');
    });
  });
  
  describe('isRecoverable', () => {
    it('should mark network errors as recoverable', () => {
      expect(isRecoverable(PDFJSErrorCode.TIMEOUT)).toBe(true);
      expect(isRecoverable(PDFJSErrorCode.NETWORK_ERROR)).toBe(true);
    });
    
    it('should mark file errors as non-recoverable', () => {
      expect(isRecoverable(PDFJSErrorCode.INVALID_PDF)).toBe(false);
      expect(isRecoverable(PDFJSErrorCode.CORRUPTED_FILE)).toBe(false);
    });
    
    it('should mark permission errors as non-recoverable', () => {
      expect(isRecoverable(PDFJSErrorCode.PERMISSION_DENIED)).toBe(false);
      expect(isRecoverable(PDFJSErrorCode.PASSWORD_REQUIRED)).toBe(false);
    });
  });
  
  describe('isRetryable', () => {
    it('should mark network errors as retryable', () => {
      expect(isRetryable(PDFJSErrorCode.TIMEOUT)).toBe(true);
      expect(isRetryable(PDFJSErrorCode.NETWORK_ERROR)).toBe(true);
    });
    
    it('should mark file errors as non-retryable', () => {
      expect(isRetryable(PDFJSErrorCode.INVALID_PDF)).toBe(false);
      expect(isRetryable(PDFJSErrorCode.CORRUPTED_FILE)).toBe(false);
    });
    
    it('should mark rendering errors as retryable', () => {
      expect(isRetryable(PDFJSErrorCode.RENDER_ERROR)).toBe(true);
      expect(isRetryable(PDFJSErrorCode.CANVAS_CONTEXT_ERROR)).toBe(true);
    });
  });
  
  describe('createPDFJSError', () => {
    it('should create error with all required fields', () => {
      const error = createPDFJSError(PDFJSErrorCode.TIMEOUT);
      
      expect(error.code).toBe(PDFJSErrorCode.TIMEOUT);
      expect(error.category).toBe(PDFJSErrorCategory.NETWORK);
      expect(error.message).toBeTruthy();
      expect(error.userMessage).toBeTruthy();
      expect(error.suggestion).toBeTruthy();
      expect(typeof error.recoverable).toBe('boolean');
      expect(typeof error.retryable).toBe('boolean');
    });
    
    it('should include custom message if provided', () => {
      const customMessage = 'Custom error message';
      const error = createPDFJSError(PDFJSErrorCode.TIMEOUT, customMessage);
      
      expect(error.message).toBe(customMessage);
    });
    
    it('should include original error if provided', () => {
      const originalError = new Error('Original error');
      const error = createPDFJSError(PDFJSErrorCode.TIMEOUT, undefined, originalError);
      
      expect(error.originalError).toBe(originalError);
    });
  });
  
  describe('parsePDFJSError', () => {
    it('should parse InvalidPDFException', () => {
      const error = new Error('Invalid PDF');
      error.name = 'InvalidPDFException';
      
      const parsed = parsePDFJSError(error);
      expect(parsed.code).toBe(PDFJSErrorCode.INVALID_PDF);
    });
    
    it('should parse MissingPDFException', () => {
      const error = new Error('Missing PDF');
      error.name = 'MissingPDFException';
      
      const parsed = parsePDFJSError(error);
      expect(parsed.code).toBe(PDFJSErrorCode.MISSING_PDF);
    });
    
    it('should parse PasswordException', () => {
      const error = new Error('Password required');
      error.name = 'PasswordException';
      
      const parsed = parsePDFJSError(error);
      expect(parsed.code).toBe(PDFJSErrorCode.PASSWORD_REQUIRED);
    });
    
    it('should parse timeout from message', () => {
      const error = new Error('Request timeout');
      
      const parsed = parsePDFJSError(error);
      expect(parsed.code).toBe(PDFJSErrorCode.TIMEOUT);
    });
    
    it('should parse network error from message', () => {
      const error = new Error('Network fetch failed');
      
      const parsed = parsePDFJSError(error);
      expect(parsed.code).toBe(PDFJSErrorCode.NETWORK_ERROR);
    });
    
    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      
      const parsed = parsePDFJSError(error);
      expect(parsed.code).toBe(PDFJSErrorCode.UNKNOWN_ERROR);
    });
  });
  
  describe('getRetryDelay', () => {
    it('should return increasing delays for multiple attempts', () => {
      const delay1 = getRetryDelay(PDFJSErrorCode.TIMEOUT, 1);
      const delay2 = getRetryDelay(PDFJSErrorCode.TIMEOUT, 2);
      const delay3 = getRetryDelay(PDFJSErrorCode.TIMEOUT, 3);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });
    
    it('should cap delay at maximum', () => {
      const delay = getRetryDelay(PDFJSErrorCode.TIMEOUT, 10);
      expect(delay).toBeLessThanOrEqual(10000 * 1.3); // Max delay + jitter
    });
  });
  
  describe('getMaxRetryAttempts', () => {
    it('should return more retries for network errors', () => {
      const attempts = getMaxRetryAttempts(PDFJSErrorCode.NETWORK_ERROR);
      expect(attempts).toBeGreaterThanOrEqual(3);
    });
    
    it('should return fewer retries for rendering errors', () => {
      const attempts = getMaxRetryAttempts(PDFJSErrorCode.RENDER_ERROR);
      expect(attempts).toBeGreaterThanOrEqual(1);
      expect(attempts).toBeLessThanOrEqual(3);
    });
    
    it('should return zero retries for non-retryable errors', () => {
      const attempts = getMaxRetryAttempts(PDFJSErrorCode.INVALID_PDF);
      expect(attempts).toBe(0);
    });
  });
});
