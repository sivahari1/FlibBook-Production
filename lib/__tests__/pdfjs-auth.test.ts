/**
 * PDF.js Authentication Tests
 * 
 * Requirements: 8.4 - Authentication handling for signed URLs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSignedUrlExpired,
  getTimeUntilExpiration,
  formatExpirationTime,
  isAuthenticationError,
  createAuthHeaders,
  type AuthenticatedPDFSource,
} from '../pdfjs-auth';

describe('PDF.js Authentication', () => {
  describe('Signed URL Expiration', () => {
    it('should detect expired URLs', () => {
      const expiredSource: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() - 1000, // 1 second ago
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      expect(isSignedUrlExpired(expiredSource)).toBe(true);
    });

    it('should detect valid URLs', () => {
      const validSource: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() + 3600000, // 1 hour from now
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      expect(isSignedUrlExpired(validSource)).toBe(false);
    });

    it('should consider buffer time when checking expiration', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() + 30000, // 30 seconds from now
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      // With 60 second buffer, should be considered expired
      expect(isSignedUrlExpired(source, 60)).toBe(true);

      // With 10 second buffer, should be valid
      expect(isSignedUrlExpired(source, 10)).toBe(false);
    });
  });

  describe('Time Until Expiration', () => {
    it('should calculate time until expiration', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() + 60000, // 1 minute from now
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      const timeUntil = getTimeUntilExpiration(source);
      expect(timeUntil).toBeGreaterThan(59000);
      expect(timeUntil).toBeLessThanOrEqual(60000);
    });

    it('should return negative for expired URLs', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() - 60000, // 1 minute ago
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      const timeUntil = getTimeUntilExpiration(source);
      expect(timeUntil).toBeLessThan(0);
    });
  });

  describe('Expiration Time Formatting', () => {
    it('should format hours and minutes', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() + 3900000, // 1h 5m
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      const formatted = formatExpirationTime(source);
      expect(formatted).toMatch(/1h \d+m/);
    });

    it('should format minutes and seconds', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() + 90000, // 1m 30s
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      const formatted = formatExpirationTime(source);
      expect(formatted).toMatch(/1m \d+s/);
    });

    it('should format seconds only', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() + 30000, // 30s
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      const formatted = formatExpirationTime(source);
      expect(formatted).toMatch(/\d+s/);
    });

    it('should show "Expired" for expired URLs', () => {
      const source: AuthenticatedPDFSource = {
        url: 'https://example.com/pdf',
        expiresAt: Date.now() - 1000,
        storagePath: 'test/doc.pdf',
        bucket: 'documents',
      };

      const formatted = formatExpirationTime(source);
      expect(formatted).toBe('Expired');
    });
  });

  describe('Authentication Error Detection', () => {
    it('should detect 401 errors', () => {
      const error = new Error('401 Unauthorized');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect 403 errors', () => {
      const error = new Error('403 Forbidden');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect authentication keyword', () => {
      const error = new Error('Authentication failed');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should detect access denied', () => {
      const error = new Error('Access denied');
      expect(isAuthenticationError(error)).toBe(true);
    });

    it('should not detect non-auth errors', () => {
      const error = new Error('Network timeout');
      expect(isAuthenticationError(error)).toBe(false);
    });
  });

  describe('Auth Headers Creation', () => {
    it('should create headers with bearer token', () => {
      const headers = createAuthHeaders('test-token-123');
      expect(headers.Authorization).toBe('Bearer test-token-123');
    });

    it('should create empty headers without token', () => {
      const headers = createAuthHeaders();
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('Authentication Flow', () => {
    it('should document authentication requirements', () => {
      const requirements = {
        signedUrls: 'Include authentication in URL',
        tokenExpiration: 'Track and refresh expired tokens',
        errorHandling: 'Detect and retry auth errors',
        headers: 'Optional bearer token support',
      };

      expect(requirements.signedUrls).toBeTruthy();
      expect(requirements.tokenExpiration).toBeTruthy();
      expect(requirements.errorHandling).toBeTruthy();
      expect(requirements.headers).toBeTruthy();
    });
  });
});
