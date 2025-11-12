import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '../db';
import {
  generateVerificationToken,
  validateToken,
  invalidateUserTokens,
} from '../tokens';
import { hash } from 'bcryptjs';

// Test user data
const TEST_USER = {
  id: 'integration-test-user',
  email: 'integration@example.com',
  name: 'Integration Test User',
};

describe('Integration Tests - Email Verification and Password Reset', () => {
  beforeEach(async () => {
    // Create test user
    await prisma.user.upsert({
      where: { id: TEST_USER.id },
      update: {},
      create: {
        id: TEST_USER.id,
        email: TEST_USER.email,
        passwordHash: await hash('OldPassword123!', 10),
        name: TEST_USER.name,
        emailVerified: false,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.verificationToken.deleteMany({
      where: { userId: TEST_USER.id },
    });
    await prisma.user.delete({
      where: { id: TEST_USER.id },
    }).catch(() => {});
  });

  describe('Complete Registration and Verification Flow', () => {
    it('should complete full registration and email verification flow', async () => {
      // Step 1: User registers (user created as unverified)
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER.id },
      });
      expect(user?.emailVerified).toBe(false);
      expect(user?.emailVerifiedAt).toBeNull();

      // Step 2: Generate verification token
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );
      expect(token).toBeDefined();
      expect(token).toHaveLength(64);

      // Step 3: Verify token exists in database
      const tokenRecord = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(tokenRecord).toBeDefined();
      expect(tokenRecord?.type).toBe('EMAIL_VERIFICATION');
      expect(tokenRecord?.userId).toBe(TEST_USER.id);

      // Step 4: User clicks verification link - validate token
      const validation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(TEST_USER.id);

      // Step 5: Mark user as verified
      await prisma.user.update({
        where: { id: TEST_USER.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Step 6: Invalidate the token
      await invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION');

      // Step 7: Verify user is now verified
      const verifiedUser = await prisma.user.findUnique({
        where: { id: TEST_USER.id },
      });
      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.emailVerifiedAt).toBeDefined();

      // Step 8: Verify token is invalidated
      const tokenAfterInvalidation = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(tokenAfterInvalidation).toBeNull();
    });

    it('should handle expired verification token', async () => {
      // Generate token
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      // Manually expire the token
      await prisma.verificationToken.update({
        where: { token: hashedToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      // Try to validate expired token
      const validation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Token expired');

      // User should still be unverified
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER.id },
      });
      expect(user?.emailVerified).toBe(false);
    });
  });

  describe('Resend Verification Email Flow', () => {
    it('should invalidate old token and generate new one', async () => {
      // Generate first token
      const { token: token1, hashedToken: hashedToken1 } =
        await generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION');

      // Verify first token exists
      const firstToken = await prisma.verificationToken.findUnique({
        where: { token: hashedToken1 },
      });
      expect(firstToken).toBeDefined();

      // User requests resend - invalidate old tokens
      await invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION');

      // Verify first token is deleted
      const deletedToken = await prisma.verificationToken.findUnique({
        where: { token: hashedToken1 },
      });
      expect(deletedToken).toBeNull();

      // Generate new token
      const { token: token2, hashedToken: hashedToken2 } =
        await generateVerificationToken(TEST_USER.id, 'EMAIL_VERIFICATION');

      // Verify new token is different
      expect(token2).not.toBe(token1);
      expect(hashedToken2).not.toBe(hashedToken1);

      // Verify new token exists
      const newToken = await prisma.verificationToken.findUnique({
        where: { token: hashedToken2 },
      });
      expect(newToken).toBeDefined();

      // Old token should not validate
      const oldValidation = await validateToken(token1, 'EMAIL_VERIFICATION');
      expect(oldValidation.valid).toBe(false);

      // New token should validate
      const newValidation = await validateToken(token2, 'EMAIL_VERIFICATION');
      expect(newValidation.valid).toBe(true);
    });

    it('should allow multiple resend requests', async () => {
      // Generate and invalidate tokens multiple times
      for (let i = 0; i < 3; i++) {
        const { token } = await generateVerificationToken(
          TEST_USER.id,
          'EMAIL_VERIFICATION'
        );
        expect(token).toBeDefined();

        if (i < 2) {
          await invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION');
        }
      }

      // Should have exactly one token at the end
      const tokenCount = await prisma.verificationToken.count({
        where: {
          userId: TEST_USER.id,
          type: 'EMAIL_VERIFICATION',
        },
      });
      expect(tokenCount).toBe(1);
    });
  });

  describe('Password Reset Flow', () => {
    it('should complete full password reset flow', async () => {
      // Step 1: User requests password reset
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );
      expect(token).toBeDefined();

      // Step 2: Verify token exists
      const tokenRecord = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(tokenRecord).toBeDefined();
      expect(tokenRecord?.type).toBe('PASSWORD_RESET');

      // Step 3: User clicks reset link - validate token
      const validation = await validateToken(token, 'PASSWORD_RESET');
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe(TEST_USER.id);

      // Step 4: Update password
      const newPasswordHash = await hash('NewPassword456!', 10);
      await prisma.user.update({
        where: { id: TEST_USER.id },
        data: { passwordHash: newPasswordHash },
      });

      // Step 5: Invalidate reset token
      await invalidateUserTokens(TEST_USER.id, 'PASSWORD_RESET');

      // Step 6: Verify token is invalidated
      const tokenAfterReset = await prisma.verificationToken.findUnique({
        where: { token: hashedToken },
      });
      expect(tokenAfterReset).toBeNull();

      // Step 7: Verify password was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: TEST_USER.id },
      });
      expect(updatedUser?.passwordHash).toBe(newPasswordHash);
    });

    it('should handle expired reset token', async () => {
      // Generate token
      const { token, hashedToken } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );

      // Manually expire the token
      await prisma.verificationToken.update({
        where: { token: hashedToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      // Try to validate expired token
      const validation = await validateToken(token, 'PASSWORD_RESET');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Token expired');
    });

    it('should prevent token reuse after password reset', async () => {
      // Generate token
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );

      // First use - should succeed
      const firstValidation = await validateToken(token, 'PASSWORD_RESET');
      expect(firstValidation.valid).toBe(true);

      // Complete password reset
      await prisma.user.update({
        where: { id: TEST_USER.id },
        data: { passwordHash: await hash('NewPassword789!', 10) },
      });
      await invalidateUserTokens(TEST_USER.id, 'PASSWORD_RESET');

      // Second use - should fail
      const secondValidation = await validateToken(token, 'PASSWORD_RESET');
      expect(secondValidation.valid).toBe(false);
      expect(secondValidation.error).toBe('Invalid token');
    });
  });

  describe('Token Type Isolation', () => {
    it('should not allow email verification token for password reset', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );

      const validation = await validateToken(token, 'PASSWORD_RESET');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid token type');
    });

    it('should not allow password reset token for email verification', async () => {
      const { token } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );

      const validation = await validateToken(token, 'EMAIL_VERIFICATION');
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Invalid token type');
    });

    it('should allow both token types to coexist', async () => {
      const { token: emailToken } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );
      const { token: resetToken } = await generateVerificationToken(
        TEST_USER.id,
        'PASSWORD_RESET'
      );

      // Both should validate with correct type
      const emailValidation = await validateToken(
        emailToken,
        'EMAIL_VERIFICATION'
      );
      const resetValidation = await validateToken(resetToken, 'PASSWORD_RESET');

      expect(emailValidation.valid).toBe(true);
      expect(resetValidation.valid).toBe(true);

      // Verify both tokens exist
      const tokenCount = await prisma.verificationToken.count({
        where: { userId: TEST_USER.id },
      });
      expect(tokenCount).toBe(2);
    });
  });

  describe('Multiple Users Isolation', () => {
    const TEST_USER_2 = {
      id: 'integration-test-user-2',
      email: 'integration2@example.com',
      name: 'Integration Test User 2',
    };

    beforeEach(async () => {
      await prisma.user.upsert({
        where: { id: TEST_USER_2.id },
        update: {},
        create: {
          id: TEST_USER_2.id,
          email: TEST_USER_2.email,
          passwordHash: await hash('Password123!', 10),
          name: TEST_USER_2.name,
          emailVerified: false,
        },
      });
    });

    afterEach(async () => {
      await prisma.verificationToken.deleteMany({
        where: { userId: TEST_USER_2.id },
      });
      await prisma.user.delete({
        where: { id: TEST_USER_2.id },
      }).catch(() => {});
    });

    it('should isolate tokens between different users', async () => {
      // Generate tokens for both users
      const { token: token1 } = await generateVerificationToken(
        TEST_USER.id,
        'EMAIL_VERIFICATION'
      );
      const { token: token2 } = await generateVerificationToken(
        TEST_USER_2.id,
        'EMAIL_VERIFICATION'
      );

      // Validate tokens return correct user IDs
      const validation1 = await validateToken(token1, 'EMAIL_VERIFICATION');
      const validation2 = await validateToken(token2, 'EMAIL_VERIFICATION');

      expect(validation1.valid).toBe(true);
      expect(validation1.userId).toBe(TEST_USER.id);
      expect(validation2.valid).toBe(true);
      expect(validation2.userId).toBe(TEST_USER_2.id);

      // Invalidating one user's tokens shouldn't affect the other
      await invalidateUserTokens(TEST_USER.id, 'EMAIL_VERIFICATION');

      const validation1After = await validateToken(token1, 'EMAIL_VERIFICATION');
      const validation2After = await validateToken(token2, 'EMAIL_VERIFICATION');

      expect(validation1After.valid).toBe(false);
      expect(validation2After.valid).toBe(true);
    });
  });
});
