/**
 * Email utilities for document sharing
 */

import { sendEmail } from './email';
import { logger } from './logger';

export interface ShareEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName: string;
  documentTitle: string;
  shareUrl: string;
  expiresAt?: Date;
  note?: string;
  canDownload: boolean;
}

/**
 * Send document share notification email
 * @param data Share email data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendShareEmail(data: ShareEmailData): Promise<boolean> {
  try {
    const {
      recipientEmail,
      recipientName,
      senderName,
      documentTitle,
      shareUrl,
      expiresAt,
      note,
      canDownload
    } = data;

    const recipientDisplay = recipientName || recipientEmail;
    const expiryText = expiresAt 
      ? `This share link will expire on ${expiresAt.toLocaleDateString()}.`
      : 'This share link does not expire.';
    
    const downloadText = canDownload
      ? 'You can view and download this document.'
      : 'You can view this document (download is disabled).';

    const noteSection = note
      ? `\n\nMessage from ${senderName}:\n"${note}"\n`
      : '';

    // HTML email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Shared With You</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">📄 Document Shared</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${recipientDisplay},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${senderName}</strong> has shared a document with you:
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #667eea;">
        ${documentTitle}
      </p>
    </div>
    
    ${note ? `
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>Message from ${senderName}:</strong><br>
        "${note}"
      </p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${shareUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        View Document
      </a>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #1976d2;">
        <strong>📋 Share Details:</strong>
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
        <li>${downloadText}</li>
        <li>${expiryText}</li>
      </ul>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions, please contact ${senderName} directly.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      This email was sent by FlipBook DRM. If you didn't expect this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
    `.trim();

    // Plain text email
    const text = `
Document Shared With You

Hi ${recipientDisplay},

${senderName} has shared a document with you:

Document: ${documentTitle}
${noteSection}
View the document: ${shareUrl}

Share Details:
- ${downloadText}
- ${expiryText}

If you have any questions, please contact ${senderName} directly.

---
This email was sent by FlipBook DRM. If you didn't expect this email, you can safely ignore it.
    `.trim();

    const success = await sendEmail({
      to: recipientEmail,
      subject: `${senderName} shared "${documentTitle}" with you`,
      html,
      text,
    });

    if (!success) {
      logger.warn('Failed to send share notification email', {
        recipientEmail,
        documentTitle,
        senderName
      });
    }

    return success;
  } catch (error) {
    logger.error('Error sending share email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      recipientEmail: data.recipientEmail
    });
    return false;
  }
}
