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
const { 
  sendEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPurchaseConfirmationEmail,
  sendUserApprovalEmail,
  sendPasswordResetByAdmin
} = await import('../email');

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

  describe('sendPurchaseConfirmationEmail', () => {
    it('should send purchase confirmation email successfully', async () => {
      const result = await sendPurchaseConfirmationEmail({
        email: 'member@example.com',
        name: 'Test Member',
        documentTitle: 'Advanced Mathematics',
        category: 'Education',
        price: 29900, // ₹299.00 in paise
        myJstudyroomUrl: 'https://example.com/member/my-jstudyroom',
        viewDocumentUrl: 'https://example.com/member/view/doc123',
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'member@example.com',
          subject: 'Purchase confirmed: Advanced Mathematics',
        })
      );
    });

    it('should format price correctly in email', async () => {
      await sendPurchaseConfirmationEmail({
        email: 'member@example.com',
        documentTitle: 'Test Document',
        category: 'Test',
        price: 10050, // ₹100.50 in paise
        myJstudyroomUrl: 'https://example.com/member/my-jstudyroom',
        viewDocumentUrl: 'https://example.com/member/view/doc123',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('₹100.50');
      expect(callArgs.text).toContain('₹100.50');
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Email sending failed', name: 'Error' },
      });

      const result = await sendPurchaseConfirmationEmail({
        email: 'member@example.com',
        documentTitle: 'Test Document',
        category: 'Test',
        price: 29900,
        myJstudyroomUrl: 'https://example.com/member/my-jstudyroom',
        viewDocumentUrl: 'https://example.com/member/view/doc123',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendUserApprovalEmail', () => {
    it('should send user approval email successfully', async () => {
      const result = await sendUserApprovalEmail({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'TempPass123!',
        userRole: 'PLATFORM_USER',
        pricePlan: 'Basic',
        loginUrl: 'https://example.com/login',
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: 'Your jstudyroom FlipBook DRM access is approved',
        })
      );
    });
  });

  describe('sendPasswordResetByAdmin', () => {
    it('should send password reset by admin email successfully', async () => {
      const result = await sendPasswordResetByAdmin({
        email: 'user@example.com',
        name: 'Test User',
        newPassword: 'NewPass123!',
        loginUrl: 'https://example.com/login',
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Your jstudyroom password has been reset',
        })
      );
    });
  });

  describe('Email FROM address', () => {
    it('should use support@jstudyroom.dev as FROM address', async () => {
      process.env.RESEND_FROM_EMAIL = 'support@jstudyroom.dev';

      await sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'FlipBook DRM <support@jstudyroom.dev>',
        })
      );
    });
  });
});
