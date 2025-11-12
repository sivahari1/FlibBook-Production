import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';
import {
  generateVerificationToken,
  validateToken,
  invalidateUserTokens,
  cleanupExpiredTokens,
} from '../tokens';

// Test user ID
const TEST_USER_ID = 'test-user-id';

describe('Token Management', () => {
  // Clean up test data before and after each test
  beforeEach(async () => {
    // Create a test user if it doesn't exist
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        email: 'test@example.com',
        passwordHash: 'test-hash',
        name: 'Test User',
      },
    });
  });

  afterEach(async () => {
    // Clean up verification tokens
    await prisma.verificationToken.deleteMany({
      where: { userId: TEST_USER_ID },
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a unique token for email verification', async () => {
      const result = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      expect(result.token).toBeDefined();
      expect(result.token).toHaveLength(64); // 32 bytes = 64 hex characters
      expect(result.hashedToken).toBeDefined();
      expect(result.hashedToken).toHaveLength(64); // SHA-256 = 64 hex characters
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.token).not.toBe(result.hashedToken); // Plain token should differ from hash
    });

    it('should generate a unique token for password reset', async () => {
      const result = await generateVerificationToken(
        TEST_USER_ID,
        'PASSWORD_RESET'
      );

      expect(result.token).toBeDefined();
      expect(result.token).toHaveLength(64);
      expect(result.hashedToken).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate different tokens on multiple calls', async () => {
      const result1 = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );
      const result2 = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      expect(result1.token).not.toBe(result2.token);
      expect(result1.hashedToken).not.toBe(result2.hashedToken);
    });

    it('should set expiration to 24 hours for email verification', async () => {
      const before = Date.now();
      const result = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );
      const after = Date.now();

      const expectedExpiration = 24 * 60 * 60 * 1000; // 24 hours in ms
      const actualExpiration = result.expiresAt.getTime() - before;

      expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(actualExpiration).toBeLessThanOrEqual(expectedExpiration + (after - before) + 1000);
    });

    it('should set expiration to 1 hour for password reset', async () => {
      const before = Date.now();
      const result = await generateVerificationToken(
        TEST_USER_ID,
        'PASSWORD_RESET'
      );
      const after = Date.now();

      const expectedExpiration = 1 * 60 * 60 * 1000; // 1 hour in ms
      const actualExpiration = result.expiresAt.getTime() - before;

      expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(actualExpiration).toBeLessThanOrEqual(expectedExpiration + (after - before) + 1000);
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      const result = await validateToken(token, 'EMAIL_VERIFICATION');

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(TEST_USER_ID);
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid token', async () => {
      const result = await validateToken('invalid-token', 'EMAIL_VERIFICATION');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.userId).toBeUndefined();
    });

    it('should reject a token with wrong type', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      const result = await validateToken(token, 'PASSWORD_RESET');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token type');
      expect(result.userId).toBeUndefined();
    });

    it('should reject an expired token', async () => {
      // Create a token that's already expired
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      // Manually update the token to be expired
      await prisma.verificationToken.updateMany({
        where: { token: hashedToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
      });

      const result = await validateToken(token, 'EMAIL_VERIFICATION');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.userId).toBeUndefined();
    });
  });

  describe('invalidateUserTokens', () => {
    it('should invalidate all tokens for a user', async () => {
      // Create multiple tokens
      await generateVerificationToken(TEST_USER_ID, 'EMAIL_VERIFICATION');
      await generateVerificationToken(TEST_USER_ID, 'PASSWORD_RESET');

      // Verify tokens exist
      const beforeCount = await prisma.verificationToken.count({
        where: { userId: TEST_USER_ID },
      });
      expect(beforeCount).toBe(2);

      // Invalidate all tokens
      await invalidateUserTokens(TEST_USER_ID);

      // Verify tokens are deleted
      const afterCount = await prisma.verificationToken.count({
        where: { userId: TEST_USER_ID },
      });
      expect(afterCount).toBe(0);
    });

    it('should invalidate only specific token type', async () => {
      // Create multiple tokens
      await generateVerificationToken(TEST_USER_ID, 'EMAIL_VERIFICATION');
      await generateVerificationToken(TEST_USER_ID, 'PASSWORD_RESET');

      // Invalidate only email verification tokens
      await invalidateUserTokens(TEST_USER_ID, 'EMAIL_VERIFICATION');

      // Verify only email verification tokens are deleted
      const emailTokens = await prisma.verificationToken.count({
        where: { userId: TEST_USER_ID, type: 'EMAIL_VERIFICATION' },
      });
      const resetTokens = await prisma.verificationToken.count({
        where: { userId: TEST_USER_ID, type: 'PASSWORD_RESET' },
      });

      expect(emailTokens).toBe(0);
      expect(resetTokens).toBe(1);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete tokens expired more than 7 days ago', async () => {
      // Create a token and manually set it to be expired 8 days ago
      const { hashedToken } = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      await prisma.verificationToken.updateMany({
        where: { token: hashedToken },
        data: { expiresAt: eightDaysAgo },
      });

      // Run cleanup
      const deletedCount = await cleanupExpiredTokens();

      expect(deletedCount).toBeGreaterThanOrEqual(1);

      // Verify token is deleted
      const tokenCount = await prisma.verificationToken.count({
        where: { token: hashedToken },
      });
      expect(tokenCount).toBe(0);
    });

    it('should not delete tokens expired less than 7 days ago', async () => {
      // Create a token and manually set it to be expired 6 days ago
      const { hashedToken } = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      await prisma.verificationToken.updateMany({
        where: { token: hashedToken },
        data: { expiresAt: sixDaysAgo },
      });

      // Get count before cleanup
      const beforeCount = await prisma.verificationToken.count({
        where: { token: hashedToken },
      });

      // Run cleanup
      await cleanupExpiredTokens();

      // Verify token still exists
      const afterCount = await prisma.verificationToken.count({
        where: { token: hashedToken },
      });
      expect(afterCount).toBe(beforeCount);
    });

    it('should not delete non-expired tokens', async () => {
      // Create a fresh token
      const { hashedToken } = await generateVerificationToken(
        TEST_USER_ID,
        'EMAIL_VERIFICATION'
      );

      // Run cleanup
      await cleanupExpiredTokens();

      // Verify token still exists
      const tokenCount = await prisma.verificationToken.count({
        where: { token: hashedToken },
      });
      expect(tokenCount).toBe(1);
    });
  });
});
