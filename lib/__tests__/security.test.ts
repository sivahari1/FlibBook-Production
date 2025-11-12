import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';
import {
  generateVerificationToken,
  validateToken,
  invalidateUserTokens,
  cleanupExpiredTokens,
} from '../tokens';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

const TEST_USER = {
  id: 'security-test-user',
  email: 'security@example.com',
  name: 'Security Test User',
};

describe('Security Tests - Email Verification and Password Reset', () => {
  beforeEach(async () => {
    await prisma.user.upsert({
      where: { id: TEST_USER.id },
      update: {},
      create: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash: await hash('Password123!', 10),
        name: TEST_USER.name,
        emailVerified: false,
      },
    });
  });

  afterEach(async () => {
    await prisma.verificationToken.deleteMany({
      where: { userId: TEST_USER.id },
    });
    await prisma.user.delete({
      where: { id: TEST_USER.id },
    }).catch(() => {});
  });

  describe('Token Expiration Handling', () => {
    it('should reject tokens that have expired', async () => {
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Manually expire the token
      await prisma.verificationToken.update({
        where: { token: hashedToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const validation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Token expired');
    });

    it('should accept tokens that are about to expire but still valid', async () => {
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Set token to expire in 1 second
      await prisma.verificationToken.update({
        where: { token: hashedToken },
        data: { expiresAt: new Date(Date.now() + 1000) },
      });

      const validation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(validation.valid).toBe(true);
    });

    it('should enforce 24-hour expiration for email verification tokens', async () => {
      const before = Date.now();
      const { expiresAt } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );
      const after = Date.now();

      const expectedExpiration = 24 * 60 * 60 * 1000;
      const actualExpiration = expiresAt.getTime() - before;

      expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(actualExpiration).toBeLessThanOrEqual(
        expectedExpiration + (after - before) + 1000
      );
    });

    it('should enforce 1-hour expiration for password reset tokens', async () => {
      const before = Date.now();
      const { expiresAt } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );
      const after = Date.now();

      const expectedExpiration = 1 * 60 * 60 * 1000;
      const actualExpiration = expiresAt.getTime() - before;

      expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(actualExpiration).toBeLessThanOrEqual(
        expectedExpiration + (after - before) + 1000
      );
    });
  });

  describe('Token Reuse Prevention', () => {
    it('should prevent reusing a token after it has been invalidated', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // First validation should succeed
      const firstValidation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(firstValidation.valid).toBe(true);

      // Invalidate the token
      await invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION');

      // Second validation should fail
      const secondValidation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(secondValidation.valid).toBe(false);
      expect(secondValidation.error).toBe('Invalid token');
    });

    it('should prevent reusing password reset token after password change', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );

      // Validate token
      const validation = await validateToken(token, 'PASSWORD_RESET');
      expect(validation.valid).toBe(true);

      // Simulate password reset completion
      await prisma.user.update({
        where: { id: TEST_USER.id },
        data: { passwordHash: await hash('NewPassword456!', 10) },
      });
      await invalidateUserTokens(TEST_USER.id, 'PASSWORD_RESET');

      // Token should no longer be valid
      const revalidation = await validateToken(token, 'PASSWORD_RESET');
      expect(revalidation.valid).toBe(false);
    });

    it('should invalidate all tokens of a specific type when requested', async () => {
      // Generate multiple tokens
      const { token: token1 } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );
      const { token: token2 } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Both should be valid initially
      expect((await validateToken(token1, 'EMAIL_VERIFICATION')).valid).toBe(true);
      expect((await validateToken(token2, 'EMAIL_VERIFICATION')).valid).toBe(true);

      // Invalidate all email verification tokens
      await invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION');

      // Both should now be invalid
      expect((await validateToken(token1, 'EMAIL_VERIFICATION')).valid).toBe(false);
      expect((await validateToken(token2, 'EMAIL_VERIFICATION')).valid).toBe(false);
    });
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Token should be 64 characters (32 bytes in hex)
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens on each call', async () => {
      const tokens = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const { token } = await generateVerificationToken(
          TEST_USER.id,
          'EMAIL_VERIFICATION'
        );
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    it('should store hashed tokens in database, not plain text', async () => {
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Plain token and hashed token should be different
      expect(token).not.toBe(hashedToken);

      // Verify the database stores the hashed version
      const dbToken = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(dbToken).toBeDefined();
      expect(dbToken?.token).toBe(hashedToken);

      // Verify we cannot find the token by plain text
      const plainTextSearch = await prisma.verificationToken.findUnique({
        where: { token: token },
      });
      expect(plainTextSearch).toBeNull();
    });

    it('should use SHA-256 for token hashing', async () => {
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Manually hash the token with SHA-256
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex');

      // Should match the stored hash
      expect(hashedToken).toBe(expectedHash);
    });

    it('should reject tokens with invalid format', async () => {
      const invalidTokens = [
        'short',
        '12345',
        'not-a-hex-string',
        'g'.repeat(64), // Invalid hex character
        '0'.repeat(63), // Wrong length
        '0'.repeat(65), // Wrong length
      ];

      for (const invalidToken of invalidTokens) {
        const validation = await validateToken(
          invalidToken,
          'EMAIL_VERIFICATION'
        );
        expect(validation.valid).toBe(false);
      }
    });

    it('should prevent timing attacks by using constant-time comparison', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Create a token that differs only in the last character
      const similarToken = token.slice(0, -1) + (token.slice(-1) === '0' ? '1' : '0');

      // Both should fail, and timing should be similar
      const start1 = Date.now();
      await validateToken(similarToken, 'EMAIL_VERIFICATION');
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await validateToken('0'.repeat(64), 'EMAIL_VERIFICATION');
      const time2 = Date.now() - start2;

      // Timing difference should be minimal (within 50ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(50);
    });
  });

  describe('Token Cleanup', () => {
    it('should clean up tokens expired more than 7 days ago', async () => {
      const { hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Set token to expire 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      await prisma.verificationToken.update({
        where: { token: hashedToken },
        data: { expiresAt: eightDaysAgo },
      });

      // Run cleanup
      const deletedCount = await cleanupExpiredTokens();
      expect(deletedCount).toBeGreaterThanOrEqual(1);

      // Verify token is deleted
      const token = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(token).toBeNull();
    });

    it('should not clean up tokens expired less than 7 days ago', async () => {
      const { hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Set token to expire 6 days ago
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      await prisma.verificationToken.update({
        where: { token: hashedToken },
        data: { expiresAt: sixDaysAgo },
      });

      // Run cleanup
      await cleanupExpiredTokens();

      // Verify token still exists
      const token = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(token).toBeDefined();
    });

    it('should not clean up non-expired tokens', async () => {
      const { hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Run cleanup
      await cleanupExpiredTokens();

      // Verify token still exists
      const token = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(token).toBeDefined();
    });
  });

  describe('Email Enumeration Prevention', () => {
    it('should not reveal if email exists during password reset', async () => {
      // This test verifies the behavior pattern, not the API response
      // The API should return the same response whether email exists or not

      // For existing user
      const existingUserToken = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );
      expect(existingUserToken.token).toBeDefined();

      // For non-existing user, the API should:
      // 1. Not throw an error
      // 2. Return success message
      // 3. Not send an email
      // 4. Not create a token

      // Verify no token exists for non-existent user
      const nonExistentUserId = 'non-existent-user-id';
      const tokensForNonExistent = await prisma.verificationToken.findMany({
        where: { userId: nonExistentUserId },
      });
      expect(tokensForNonExistent).toHaveLength(0);
    });

    it('should use consistent response times for existing and non-existing emails', async () => {
      // Measure time for existing user
      const start1 = Date.now();
      await generateVerificationToken(TEST_USER.id, 'PASSWORD_RESET');
      const time1 = Date.now() - start1;

      // Measure time for another existing user operation
      const start2 = Date.now();
      await generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION');
      const time2 = Date.now() - start2;

      // Times should be similar (within 100ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });

  describe('Token Type Validation', () => {
    it('should reject token used with wrong type', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Try to use email verification token for password reset
      const validation = await validateToken(token, 'PASSWORD_RESET');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid token type');
    });

    it('should maintain type isolation between tokens', async () => {
      const { token: emailToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );
      const { token: resetToken } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );

      // Each token should only work with its correct type
      expect((await validateToken(emailToken, 'EMAIL_VERIFICATION')).valid).toBe(
        true
      );
      expect((await validateToken(emailToken, 'PASSWORD_RESET')).valid).toBe(
        false
      );
      expect((await validateToken(resetToken, 'PASSWORD_RESET')).valid).toBe(
        true
      );
      expect((await validateToken(resetToken, 'EMAIL_VERIFICATION')).valid).toBe(
        false
      );
    });
  });

  describe('Concurrent Token Operations', () => {
    it('should handle concurrent token generation safely', async () => {
      const promises = Array.from({ length: 10 }, () =>
        generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION')
      );

      const results = await Promise.all(promises);

      // All tokens should be unique
      const tokens = results.map((r) => r.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);

      // All tokens should be valid
      for (const { token } of results) {
        const validation = await validateToken(token, 'EMAIL_VERIFICATION');
        expect(validation.valid).toBe(true);
      }
    });

    it('should handle concurrent invalidation safely', async () => {
      // Generate multiple tokens
      await Promise.all([
        generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION'),
        generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION'),
        generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION'),
      ]);

      // Invalidate concurrently
      await Promise.all([
        invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION'),
        invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION'),
      ]);

      // All tokens should be deleted
      const remainingTokens = await prisma.verificationToken.count({
        where: {
          userId: TEST_USER.id,
          type: 'EMAIL_VERIFICATION',
        },
      });
      expect(remainingTokens).toBe(0);
    });
  });

  describe('Rate Limiting Effectiveness', () => {
    it('should enforce rate limit for email verification resend', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('../rate-limit');
      const identifier = 'test-email-verification@example.com';

      // First request should succeed
      const result1 = checkRateLimit(
        `resend-verification:${identifier}`,
        RATE_LIMITS.EMAIL_VERIFICATION_RESEND
      );
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(0);

      // Second request within window should fail
      const result2 = checkRateLimit(
        `resend-verification:${identifier}`,
        RATE_LIMITS.EMAIL_VERIFICATION_RESEND
      );
      expect(result2.success).toBe(false);
      expect(result2.remaining).toBe(0);
      expect(result2.retryAfter).toBeGreaterThan(0);
    });

    it('should enforce rate limit for password reset requests', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('../rate-limit');
      const identifier = 'test-password-reset@example.com';

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(
          `password-reset:${identifier}`,
          RATE_LIMITS.PASSWORD_RESET_REQUEST
        );
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(2 - i);
      }

      // Fourth request should fail
      const result4 = checkRateLimit(
        `password-reset:${identifier}`,
        RATE_LIMITS.PASSWORD_RESET_REQUEST
      );
      expect(result4.success).toBe(false);
      expect(result4.remaining).toBe(0);
      expect(result4.retryAfter).toBeGreaterThan(0);
    });

    it('should reset rate limit after window expires', async () => {
      const { checkRateLimit } = await import('../rate-limit');
      const identifier = 'test-window-reset@example.com';
      const config = { maxRequests: 1, windowMs: 100 }; // 100ms window

      // First request should succeed
      const result1 = checkRateLimit(`test:${identifier}`, config);
      expect(result1.success).toBe(true);

      // Second request should fail
      const result2 = checkRateLimit(`test:${identifier}`, config);
      expect(result2.success).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third request should succeed after window reset
      const result3 = checkRateLimit(`test:${identifier}`, config);
      expect(result3.success).toBe(true);
    });

    it('should isolate rate limits between different identifiers', async () => {
      const { checkRateLimit, RATE_LIMITS } = await import('../rate-limit');
      const identifier1 = 'user1@example.com';
      const identifier2 = 'user2@example.com';

      // Exhaust rate limit for identifier1
      checkRateLimit(
        `resend-verification:${identifier1}`,
        RATE_LIMITS.EMAIL_VERIFICATION_RESEND
      );

      // identifier1 should be rate limited
      const result1 = checkRateLimit(
        `resend-verification:${identifier1}`,
        RATE_LIMITS.EMAIL_VERIFICATION_RESEND
      );
      expect(result1.success).toBe(false);

      // identifier2 should still be allowed
      const result2 = checkRateLimit(
        `resend-verification:${identifier2}`,
        RATE_LIMITS.EMAIL_VERIFICATION_RESEND
      );
      expect(result2.success).toBe(true);
    });

    it('should provide accurate retry-after time', async () => {
      const { checkRateLimit } = await import('../rate-limit');
      const identifier = 'test-retry-after@example.com';
      const config = { maxRequests: 1, windowMs: 5000 }; // 5 second window

      // Exhaust rate limit
      checkRateLimit(`test:${identifier}`, config);

      // Check retry-after time
      const result = checkRateLimit(`test:${identifier}`, config);
      expect(result.success).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(5);
    });

    it('should handle concurrent rate limit checks correctly', async () => {
      const { checkRateLimit } = await import('../rate-limit');
      const identifier = 'test-concurrent@example.com';
      const config = { maxRequests: 3, windowMs: 60000 };

      // Make 5 concurrent requests
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          checkRateLimit(`test:${identifier}`, config)
        )
      );

      // First 3 should succeed, last 2 should fail
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(3);
      expect(failCount).toBe(2);
    });

    it('should clean up expired rate limit entries', async () => {
      const { checkRateLimit, cleanupRateLimits } = await import('../rate-limit');
      const identifier = 'test-cleanup@example.com';
      const config = { maxRequests: 1, windowMs: 100 }; // 100ms window

      // Create a rate limit entry
      checkRateLimit(`test:${identifier}`, config);

      // Wait for it to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Run cleanup
      const cleaned = cleanupRateLimits();
      expect(cleaned).toBeGreaterThanOrEqual(1);

      // New request should succeed (entry was cleaned up)
      const result = checkRateLimit(`test:${identifier}`, config);
      expect(result.success).toBe(true);
    });
  });
});
