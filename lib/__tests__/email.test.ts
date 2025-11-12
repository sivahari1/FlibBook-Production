import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Resend before importing email module
const mockSend = vi.fn().mockResolvedValue({
  data: { id: 'test-email-id' },
  error: null,
});

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      };
    },
  };
});

// Mock React Email render
vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html>Test Email</html>'),
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
const { sendEmail, sendVerificationEmail, sendPasswordResetEmail } = await import('../email');

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({
      data: { id: 'test-email-id' },
      error: null,
    });
    // Set required environment variables
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'test@example.com';
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
        })
      );
    });

    it('should return false when RESEND_API_KEY is not configured', async () => {
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });

      expect(result).toBe(false);
      
      // Restore
      process.env.RESEND_API_KEY = originalKey;
    });

    it('should handle email sending errors', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email sending failed', name: 'Error' },
      });

      const result = await sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const result = await sendVerificationEmail('user@example.com', {
        userName: 'Test User',
        verificationUrl: 'https://example.com/verify?token=abc123',
      });

      expect(result).toBe(true);
    });

    it('should handle template rendering errors', async () => {
      const { render } = await import('@react-email/render');
      vi.mocked(render).mockRejectedValueOnce(new Error('Template error'));

      const result = await sendVerificationEmail('user@example.com', {
        userName: 'Test User',
        verificationUrl: 'https://example.com/verify?token=abc123',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const result = await sendPasswordResetEmail('user@example.com', {
        userName: 'Test User',
        resetUrl: 'https://example.com/reset?token=xyz789',
      });

      expect(result).toBe(true);
    });

    it('should handle template rendering errors', async () => {
      const { render } = await import('@react-email/render');
      vi.mocked(render).mockRejectedValueOnce(new Error('Template error'));

      const result = await sendPasswordResetEmail('user@example.com', {
        userName: 'Test User',
        resetUrl: 'https://example.com/reset?token=xyz789',
      });

      expect(result).toBe(false);
    });
  });
});
