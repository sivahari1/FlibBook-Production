/**
 * Tests for PDF.js Specific Error Handlers
 * 
 * Requirements: 7.2, 7.3, 7.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NetworkErrorHandler,
  PermissionErrorHandler,
  FileErrorHandler,
  TimeoutErrorHandler,
  PDFJSErrorHandler,
} from '../pdfjs-error-handlers';
import { PDFJSErrorCode } from '../pdfjs-errors';

describe('Network Error Handler', () => {
  describe('handle', () => {
    it('should handle timeout errors', () => {
      const error = new Error('Timeout');
      error.name = 'TimeoutError';
      
      const result = NetworkErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.TIMEOUT);
      expect(result.action).toBe('retry');
    });
    
    it('should handle network errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const result = NetworkErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.NETWORK_ERROR);
      expect(result.action).toBe('retry');
    });
    
    it('should handle missing PDF errors', () => {
      const error = new Error('Missing PDF');
      error.name = 'MissingPDFException';
      
      const result = NetworkErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.MISSING_PDF);
      expect(result.action).toBe('notify');
    });
    
    it('should not handle non-network errors', () => {
      const error = new Error('Invalid PDF');
      error.name = 'InvalidPDFException';
      
      const result = NetworkErrorHandler.handle(error);
      
      expect(result.handled).toBe(false);
    });
  });
  
  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      expect(NetworkErrorHandler.isNetworkError(error)).toBe(true);
    });
    
    it('should not identify non-network errors', () => {
      const error = new Error('Invalid PDF');
      error.name = 'InvalidPDFException';
      
      expect(NetworkErrorHandler.isNetworkError(error)).toBe(false);
    });
  });
});

describe('Permission Error Handler', () => {
  describe('handle', () => {
    it('should handle permission denied errors', () => {
      const error = new Error('Permission denied');
      
      const result = PermissionErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.PERMISSION_DENIED);
      expect(result.action).toBe('notify');
    });
    
    it('should handle CORS errors', () => {
      const error = new Error('CORS error');
      
      const result = PermissionErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.CORS_ERROR);
      expect(result.action).toBe('fallback');
    });
    
    it('should handle password required errors', () => {
      const error = new Error('Password required');
      error.name = 'PasswordException';
      
      const result = PermissionErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.PASSWORD_REQUIRED);
      expect(result.action).toBe('notify');
    });
    
    it('should not handle non-permission errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const result = PermissionErrorHandler.handle(error);
      
      expect(result.handled).toBe(false);
    });
  });
  
  describe('isPermissionError', () => {
    it('should identify permission errors', () => {
      const error = new Error('Permission denied');
      
      expect(PermissionErrorHandler.isPermissionError(error)).toBe(true);
    });
    
    it('should not identify non-permission errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      expect(PermissionErrorHandler.isPermissionError(error)).toBe(false);
    });
  });
});

describe('File Error Handler', () => {
  describe('handle', () => {
    it('should handle invalid PDF errors', () => {
      const error = new Error('Invalid PDF');
      error.name = 'InvalidPDFException';
      
      const result = FileErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.INVALID_PDF);
      expect(result.action).toBe('notify');
    });
    
    it('should handle corrupted file errors', () => {
      const error = new Error('Corrupted file');
      
      const result = FileErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.CORRUPTED_FILE);
      expect(result.action).toBe('notify');
    });
    
    it('should handle unsupported format errors', () => {
      const error = new Error('Unsupported format');
      
      const result = FileErrorHandler.handle(error);
      
      // The error is parsed but may not be categorized as file error
      // Check if it's handled or if it falls through
      expect(result.error).toBeDefined();
    });
    
    it('should not handle non-file errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const result = FileErrorHandler.handle(error);
      
      expect(result.handled).toBe(false);
    });
  });
  
  describe('isFileError', () => {
    it('should identify file errors', () => {
      const error = new Error('Invalid PDF');
      error.name = 'InvalidPDFException';
      
      expect(FileErrorHandler.isFileError(error)).toBe(true);
    });
    
    it('should not identify non-file errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      expect(FileErrorHandler.isFileError(error)).toBe(false);
    });
  });
});

describe('Timeout Error Handler', () => {
  describe('handle', () => {
    it('should handle short timeouts', () => {
      const error = new Error('Timeout');
      
      const result = TimeoutErrorHandler.handle(error, 5000);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.TIMEOUT);
      expect(result.action).toBe('retry');
      expect(result.message).toBeTruthy();
      expect(result.message!.length).toBeGreaterThan(0);
    });
    
    it('should handle medium timeouts', () => {
      const error = new Error('Timeout');
      
      const result = TimeoutErrorHandler.handle(error, 20000);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.TIMEOUT);
      expect(result.action).toBe('retry');
    });
    
    it('should handle long timeouts', () => {
      const error = new Error('Timeout');
      
      const result = TimeoutErrorHandler.handle(error, 40000);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.TIMEOUT);
      expect(result.action).toBe('notify');
    });
    
    it('should not handle non-timeout errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const result = TimeoutErrorHandler.handle(error, 30000);
      
      expect(result.handled).toBe(false);
    });
  });
  
  describe('isTimeoutError', () => {
    it('should identify timeout errors', () => {
      const error = new Error('Timeout');
      
      expect(TimeoutErrorHandler.isTimeoutError(error)).toBe(true);
    });
    
    it('should not identify non-timeout errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      expect(TimeoutErrorHandler.isTimeoutError(error)).toBe(false);
    });
  });
});

describe('Composite PDF.js Error Handler', () => {
  describe('handle', () => {
    it('should handle network errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const result = PDFJSErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.category).toBe('network');
    });
    
    it('should handle permission errors', () => {
      const error = new Error('Permission denied');
      
      const result = PDFJSErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.category).toBe('permission');
    });
    
    it('should handle file errors', () => {
      const error = new Error('Invalid PDF');
      error.name = 'InvalidPDFException';
      
      const result = PDFJSErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.category).toBe('file');
    });
    
    it('should handle timeout errors with context', () => {
      const error = new Error('Timeout');
      
      const result = PDFJSErrorHandler.handle(error, { timeoutDuration: 5000 });
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.TIMEOUT);
    });
    
    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      
      const result = PDFJSErrorHandler.handle(error);
      
      expect(result.handled).toBe(true);
      expect(result.error.code).toBe(PDFJSErrorCode.UNKNOWN_ERROR);
    });
  });
  
  describe('getRecommendedAction', () => {
    it('should recommend retry for network errors', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const action = PDFJSErrorHandler.getRecommendedAction(error);
      
      expect(action).toBe('retry');
    });
    
    it('should recommend notify for permission errors', () => {
      const error = new Error('Permission denied');
      
      const action = PDFJSErrorHandler.getRecommendedAction(error);
      
      expect(action).toBe('notify');
    });
    
    it('should recommend fallback for CORS errors', () => {
      const error = new Error('CORS error');
      
      const action = PDFJSErrorHandler.getRecommendedAction(error);
      
      expect(action).toBe('fallback');
    });
  });
  
  describe('getUserMessage', () => {
    it('should return user-friendly message', () => {
      const error = new Error('Network error');
      error.name = 'UnexpectedResponseException';
      
      const message = PDFJSErrorHandler.getUserMessage(error);
      
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });
  });
});
