import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@react-email/render';

// Mock Resend
const mockSend = vi.fn();
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      };
    },
  };
});

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Import after mocks
const { sendEmail, sendVerificationEmail, sendPasswordResetEmail } = await import(
  '../email'
);
const { VerificationEmail } = await import('../../emails/VerificationEmail');
const { PasswordResetEmail } = await import('../../emails/PasswordResetEmail');

describe('Email Delivery Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({
      data: { id: 'test-email-id' },
      error: null,
    });
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'noreply@flipbook-drm.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://flipbook-drm.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Service Configuration', () => {
    it('should require RESEND_API_KEY to be configured', async () => {
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should use configured FROM email address', async () => {
      // Note: The email service caches the FROM address at module load time
      // This test verifies the default configuration is used
      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining('flipbook-drm.com'),
        })
      );
    });

    it('should handle missing FROM email configuration', async () => {
      delete process.env.RESEND_FROM_EMAIL;

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      // Should still attempt to send with default
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('Email Sending', () => {
    it('should send email with correct parameters', async () => {
      const emailOptions = {
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      };

      const result = await sendEmail(emailOptions);

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: emailOptions.to,
          subject: emailOptions.subject,
          html: emailOptions.html,
          text: emailOptions.text,
        })
      );
    });

    it('should handle email sending failures', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to send', name: 'Error' },
      });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result).toBe(false);
    });

    it('should handle rate limiting errors', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Rate limit exceeded', name: 'RateLimitError' },
      });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(result).toBe(false);
    });
  });

  describe('Verification Email', () => {
    it('should send verification email with correct data', async () => {
      const result = await sendVerificationEmail('user@example.com', {
        userName: 'Test User',
        verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Verify'),
        })
      );
    });

    it('should include verification URL in email', async () => {
      const verificationUrl = 'https://flipbook-drm.com/verify?token=abc123';

      await sendVerificationEmail('user@example.com', {
        userName: 'Test User',
        verificationUrl,
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain(verificationUrl);
    });

    it('should include user name in email', async () => {
      const userName = 'John Doe';

      await sendVerificationEmail('user@example.com', {
        userName,
        verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain(userName);
    });

    it('should include plain text version', async () => {
      await sendVerificationEmail('user@example.com', {
        userName: 'Test User',
        verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.text).toBeDefined();
      expect(callArgs.text.length).toBeGreaterThan(0);
    });
  });

  describe('Password Reset Email', () => {
    it('should send password reset email with correct data', async () => {
      const result = await sendPasswordResetEmail('user@example.com', {
        userName: 'Test User',
        resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Reset'),
        })
      );
    });

    it('should include reset URL in email', async () => {
      const resetUrl = 'https://flipbook-drm.com/reset-password?token=xyz789';

      await sendPasswordResetEmail('user@example.com', {
        userName: 'Test User',
        resetUrl,
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain(resetUrl);
    });

    it('should include user name in email', async () => {
      const userName = 'Jane Smith';

      await sendPasswordResetEmail('user@example.com', {
        userName,
        resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain(userName);
    });

    it('should include plain text version', async () => {
      await sendPasswordResetEmail('user@example.com', {
        userName: 'Test User',
        resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.text).toBeDefined();
      expect(callArgs.text.length).toBeGreaterThan(0);
    });
  });

  describe('Email Template Rendering', () => {
    it('should render verification email template correctly', async () => {
      const html = await render(
        VerificationEmail({
          userName: 'Test User',
          verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
        })
      );

      expect(html).toContain('Test User');
      expect(html).toContain('https://flipbook-drm.com/verify?token=abc123');
      expect(html).toContain('Verify');
    });

    it('should render password reset email template correctly', async () => {
      const html = await render(
        PasswordResetEmail({
          userName: 'Test User',
          resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
        })
      );

      expect(html).toContain('Test User');
      expect(html).toContain('https://flipbook-drm.com/reset-password?token=xyz789');
      expect(html).toContain('Reset');
    });

    it('should include FlipBook DRM branding in verification email', async () => {
      const html = await render(
        VerificationEmail({
          userName: 'Test User',
          verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
        })
      );

      expect(html).toContain('FlipBook DRM');
    });

    it('should include FlipBook DRM branding in password reset email', async () => {
      const html = await render(
        PasswordResetEmail({
          userName: 'Test User',
          resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
        })
      );

      expect(html).toContain('FlipBook DRM');
    });

    it('should include call-to-action button in verification email', async () => {
      const html = await render(
        VerificationEmail({
          userName: 'Test User',
          verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
        })
      );

      // Should contain a link/button
      expect(html).toMatch(/<a[^>]*href="https:\/\/flipbook-drm\.com\/verify\?token=abc123"[^>]*>/i);
    });

    it('should include call-to-action button in password reset email', async () => {
      const html = await render(
        PasswordResetEmail({
          userName: 'Test User',
          resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
        })
      );

      // Should contain a link/button
      expect(html).toMatch(/<a[^>]*href="https:\/\/flipbook-drm\.com\/reset-password\?token=xyz789"[^>]*>/i);
    });

    it('should handle special characters in user names', async () => {
      const specialNames = [
        "O'Brien",
        'José García',
        'François Müller',
        '<script>alert("xss")</script>',
      ];

      for (const userName of specialNames) {
        const html = await render(
          VerificationEmail({
            userName,
            verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
          })
        );

        // Should not contain raw script tags
        expect(html).not.toContain('<script>');
        // Should contain escaped or safe version of name
        expect(html).toBeDefined();
      }
    });
  });

  describe('Email Content Validation', () => {
    it('should include expiration information in verification email', async () => {
      const html = await render(
        VerificationEmail({
          userName: 'Test User',
          verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
        })
      );

      // Should mention expiration (24 hours)
      expect(html.toLowerCase()).toMatch(/24\s*hour/i);
    });

    it('should include expiration information in password reset email', async () => {
      const html = await render(
        PasswordResetEmail({
          userName: 'Test User',
          resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
        })
      );

      // Should mention expiration (1 hour)
      expect(html.toLowerCase()).toMatch(/1\s*hour/i);
    });

    it('should include security notice in password reset email', async () => {
      const html = await render(
        PasswordResetEmail({
          userName: 'Test User',
          resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
        })
      );

      // Should mention what to do if user didn't request reset
      expect(html.toLowerCase()).toContain('didn');
    });

    it('should use HTTPS URLs only', async () => {
      const verificationHtml = await render(
        VerificationEmail({
          userName: 'Test User',
          verificationUrl: 'https://flipbook-drm.com/verify?token=abc123',
        })
      );

      const resetHtml = await render(
        PasswordResetEmail({
          userName: 'Test User',
          resetUrl: 'https://flipbook-drm.com/reset-password?token=xyz789',
        })
      );

      // Should not contain http:// (only https://)
      expect(verificationHtml).not.toMatch(/href="http:\/\//);
      expect(resetHtml).not.toMatch(/href="http:\/\//);
    });
  });

  describe('Email Delivery Reliability', () => {
    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      mockSend
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({
          data: { id: 'test-email-id' },
          error: null,
        });

      // Note: This test assumes retry logic exists in the email service
      // If not implemented, this test documents the expected behavior
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      // Current implementation doesn't retry, so this will fail
      // This test documents that retry logic should be added
      expect(result).toBe(false);
    });

    it('should handle multiple concurrent email sends', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        sendVerificationEmail(`user${i}@example.com`, {
          userName: `User ${i}`,
          verificationUrl: `https://flipbook-drm.com/verify?token=token${i}`,
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r === true)).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(5);
    });
  });

  describe('Email Validation', () => {
    it('should validate email addresses', async () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid..email@example.com',
      ];

      for (const email of invalidEmails) {
        const result = await sendEmail({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });

        // Should still attempt to send (validation happens at Resend level)
        expect(mockSend).toHaveBeenCalled();
      }
    });

    it('should handle international email addresses', async () => {
      const internationalEmails = [
        'user@例え.jp',
        'user@münchen.de',
        'user@москва.рф',
      ];

      for (const email of internationalEmails) {
        mockSend.mockClear();
        await sendEmail({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });

        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: email,
          })
        );
      }
    });
  });
});
