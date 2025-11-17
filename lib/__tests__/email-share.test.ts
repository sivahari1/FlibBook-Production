import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sendEmail before importing email-share module
const mockSendEmail = vi.fn().mockResolvedValue(true);

vi.mock('../email', () => ({
  sendEmail: mockSendEmail,
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
const { sendShareEmail } = await import('../email-share');

describe('Share Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(true);
  });

  describe('sendShareEmail', () => {
    it('should send share notification email successfully', async () => {
      const result = await sendShareEmail({
        recipientEmail: 'recipient@example.com',
        recipientName: 'Test Recipient',
        senderName: 'Test Sender',
        documentTitle: 'Important Document',
        shareUrl: 'https://example.com/view/abc123',
        canDownload: true,
      });

      expect(result).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Sender shared "Important Document" with you',
        })
      );
    });

    it('should include login instructions for Members', async () => {
      await sendShareEmail({
        recipientEmail: 'member@example.com',
        senderName: 'Platform User',
        documentTitle: 'Shared Document',
        shareUrl: 'https://example.com/view/xyz789',
        canDownload: false,
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('How to Access');
      expect(callArgs.html).toContain('register as a Member');
      expect(callArgs.html).toContain('Sign in to existing account');
      expect(callArgs.text).toContain('How to Access');
      expect(callArgs.text).toContain('register as a Member');
    });

    it('should include registration and login links', async () => {
      await sendShareEmail({
        recipientEmail: 'newuser@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test123',
        canDownload: true,
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('/register');
      expect(callArgs.html).toContain('/login');
      expect(callArgs.text).toContain('/register');
      expect(callArgs.text).toContain('/login');
    });

    it('should include expiration date when provided', async () => {
      const expiresAt = new Date('2025-12-31');
      
      await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test',
        expiresAt,
        canDownload: false,
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('expire');
      expect(callArgs.text).toContain('expire');
    });

    it('should include personal note when provided', async () => {
      await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test',
        note: 'Please review this document carefully.',
        canDownload: true,
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('Please review this document carefully.');
      expect(callArgs.text).toContain('Please review this document carefully.');
    });

    it('should indicate download permission correctly', async () => {
      // Test with download enabled
      await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test',
        canDownload: true,
      });

      let callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('view and download');
      expect(callArgs.text).toContain('view and download');

      mockSendEmail.mockClear();

      // Test with download disabled
      await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test',
        canDownload: false,
      });

      callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('download is disabled');
      expect(callArgs.text).toContain('download is disabled');
    });

    it('should handle inbox share URLs differently', async () => {
      await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/inbox/share123',
        canDownload: true,
      });

      const callArgs = mockSendEmail.mock.calls[0][0];
      expect(callArgs.html).toContain('logged in to view this document');
    });

    it('should handle email sending errors', async () => {
      mockSendEmail.mockResolvedValueOnce(false);

      const result = await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test',
        canDownload: true,
      });

      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      mockSendEmail.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendShareEmail({
        recipientEmail: 'user@example.com',
        senderName: 'Sender',
        documentTitle: 'Document',
        shareUrl: 'https://example.com/view/test',
        canDownload: true,
      });

      expect(result).toBe(false);
    });
  });
});
