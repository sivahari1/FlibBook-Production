import { Resend } from 'resend';
import { render } from '@react-email/render';
import { logger } from './logger';

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'support@jstudyroom.dev';
const APP_NAME = 'FlipBook DRM';

// Lazy initialize Resend client
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured - email sending disabled');
    return null;
  }
  
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Email options interface
 */
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Verification email data interface
 */
export interface VerificationEmailData {
  userName: string;
  verificationUrl: string;
}

/**
 * Password reset email data interface
 */
export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
}

/**
 * Send an email using Resend
 * @param options Email options including recipient, subject, and content
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const resend = getResendClient();
    
    // If Resend is not configured, log warning but don't crash
    if (!resend) {
      logger.warn('Email not sent - Resend not configured', {
        to: options.to,
        subject: options.subject
      });
      return false;
    }

    // Log FROM_EMAIL for debugging
    logger.info('Sending email', {
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject
    });

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      // Handle specific Resend errors
      if (error.message?.includes('403') || error.message?.includes('forbidden')) {
        logger.error('Resend domain not verified - emails cannot be sent', { 
          error: error.message,
          from: FROM_EMAIL,
          to: options.to,
          hint: 'Verify your domain in Resend dashboard at https://resend.com/domains'
        });
      } else if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
        logger.error('Invalid Resend API key', { 
          error: error.message,
          hint: 'Check RESEND_API_KEY environment variable'
        });
      } else {
        logger.error('Email sending failed', { 
          error: error.message,
          to: options.to,
          subject: options.subject,
          from: FROM_EMAIL
        });
      }
      return false;
    }

    logger.info('Email sent successfully', { 
      emailId: data?.id,
      to: options.to,
      subject: options.subject,
      from: FROM_EMAIL
    });
    return true;
  } catch (error) {
    logger.error('Email service error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      to: options.to 
    });
    return false;
  }
}

/**
 * Send verification email to user
 * @param email User's email address
 * @param data Verification email data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendVerificationEmail(
  email: string,
  data: VerificationEmailData
): Promise<boolean> {
  // Import email template dynamically to avoid circular dependencies
  const { VerificationEmail } = await import('../emails/VerificationEmail');
  
  try {
    const html = await render(VerificationEmail(data));
    const text = `Welcome to ${APP_NAME}!\n\nHi ${data.userName},\n\nThanks for signing up! Please verify your email address to get started.\n\nVerify your email: ${data.verificationUrl}\n\nThis link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.`;

    return await sendEmail({
      to: email,
      subject: `Verify your ${APP_NAME} account`,
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send verification email', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      email 
    });
    return false;
  }
}

/**
 * Send password reset email to user
 * @param email User's email address
 * @param data Password reset email data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendPasswordResetEmail(
  email: string,
  data: PasswordResetEmailData
): Promise<boolean> {
  // Import email template dynamically to avoid circular dependencies
  const { PasswordResetEmail } = await import('../emails/PasswordResetEmail');
  
  try {
    const html = await render(PasswordResetEmail(data));
    const text = `Password Reset Request\n\nHi ${data.userName},\n\nWe received a request to reset your password for your ${APP_NAME} account.\n\nReset your password: ${data.resetUrl}\n\nThis link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.`;

    return await sendEmail({
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send password reset email', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      email 
    });
    return false;
  }
}

/**
 * Access request notification data interface
 */
export interface AccessRequestNotificationData {
  requestId: string;
  email: string;
  name?: string;
  purpose: string;
  numDocuments?: number;
  numUsers?: number;
  requestedRole?: string;
  extraMessage?: string;
  adminDashboardUrl: string;
}

/**
 * User approval email data interface
 */
export interface UserApprovalEmailData {
  email: string;
  name?: string;
  password: string;
  userRole: string;
  pricePlan?: string;
  loginUrl: string;
}

/**
 * Password reset by admin email data interface
 */
export interface PasswordResetByAdminData {
  email: string;
  name?: string;
  newPassword: string;
  loginUrl: string;
}

/**
 * Send access request notification to admin
 * @param data Access request notification data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendAccessRequestNotification(
  data: AccessRequestNotificationData
): Promise<boolean> {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Access Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Access Request</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      A new user has requested access to the FlipBook DRM platform.
    </p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 18px; color: #667eea;">Request Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Email:</td>
          <td style="padding: 8px 0;">${data.email}</td>
        </tr>
        ${data.name ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Name:</td>
          <td style="padding: 8px 0;">${data.name}</td>
        </tr>
        ` : ''}
        ${data.requestedRole ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Requested Role:</td>
          <td style="padding: 8px 0;">${data.requestedRole}</td>
        </tr>
        ` : ''}
        ${data.numDocuments ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Est. Documents:</td>
          <td style="padding: 8px 0;">${data.numDocuments}</td>
        </tr>
        ` : ''}
        ${data.numUsers ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Est. Users:</td>
          <td style="padding: 8px 0;">${data.numUsers}</td>
        </tr>
        ` : ''}
      </table>
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-weight: 600; color: #555;">Purpose:</p>
        <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${data.purpose}</p>
      </div>
      
      ${data.extraMessage ? `
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; font-weight: 600; color: #555;">Additional Notes:</p>
        <p style="margin: 5px 0 0 0; white-space: pre-wrap;">${data.extraMessage}</p>
      </div>
      ` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.adminDashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Review Request
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      You can review this request and approve or reject it from the admin dashboard.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      This is an automated notification from FlipBook DRM - jstudyroom platform
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
New Access Request - FlipBook DRM

A new user has requested access to the platform.

Request Details:
- Email: ${data.email}
${data.name ? `- Name: ${data.name}` : ''}
${data.requestedRole ? `- Requested Role: ${data.requestedRole}` : ''}
${data.numDocuments ? `- Est. Documents: ${data.numDocuments}` : ''}
${data.numUsers ? `- Est. Users: ${data.numUsers}` : ''}

Purpose:
${data.purpose}

${data.extraMessage ? `Additional Notes:\n${data.extraMessage}\n` : ''}

Review this request: ${data.adminDashboardUrl}

---
This is an automated notification from FlipBook DRM - jstudyroom platform
    `.trim();

    // Send to both support and admin email
    const supportEmail = await sendEmail({
      to: 'support@jstudyroom.dev',
      subject: `New jstudyroom access request – ${data.email}`,
      html,
      text,
    });

    const adminEmail = await sendEmail({
      to: 'sivaramj83@gmail.com',
      subject: `New jstudyroom access request – ${data.email}`,
      html,
      text,
    });

    return supportEmail || adminEmail; // Success if at least one email sent
  } catch (error) {
    logger.error('Failed to send access request notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: data.requestId
    });
    return false;
  }
}

/**
 * Send user approval email
 * @param data User approval email data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendUserApprovalEmail(
  data: UserApprovalEmailData
): Promise<boolean> {
  try {
    const roleDescription = data.userRole === 'PLATFORM_USER' 
      ? 'Platform User - You can upload, manage, and share protected documents'
      : 'Reader User - You can view documents shared with you';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Approved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Access Approved!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi ${data.name || 'there'},
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your access request for <strong>FlipBook DRM - jstudyroom platform</strong> has been approved.
    </p>
    
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
      <h2 style="margin-top: 0; font-size: 18px; color: #1976d2;">Your Login Credentials</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Email:</td>
          <td style="padding: 8px 0; font-family: monospace;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Password:</td>
          <td style="padding: 8px 0; font-family: monospace; background: #fff; padding: 8px; border-radius: 4px;">${data.password}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Role:</td>
          <td style="padding: 8px 0;">${roleDescription}</td>
        </tr>
        ${data.pricePlan ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Plan:</td>
          <td style="padding: 8px 0;">${data.pricePlan}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Login Now
      </a>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Important:</strong> Please change your password after your first login for security.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions or need assistance, please contact us at support@jstudyroom.dev
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      Welcome to FlipBook DRM - jstudyroom platform
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Your jstudyroom FlipBook DRM access is approved!

Hi ${data.name || 'there'},

Great news! Your access request has been approved.

Your Login Credentials:
- Email: ${data.email}
- Password: ${data.password}
- Role: ${roleDescription}
${data.pricePlan ? `- Plan: ${data.pricePlan}` : ''}

Login URL: ${data.loginUrl}

⚠️ Important: Please change your password after your first login for security.

If you have any questions, contact us at support@jstudyroom.dev

---
Welcome to FlipBook DRM - jstudyroom platform
    `.trim();

    return await sendEmail({
      to: data.email,
      subject: 'Your jstudyroom FlipBook DRM access is approved',
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send user approval email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: data.email
    });
    return false;
  }
}

/**
 * Send password reset by admin email
 * @param data Password reset by admin data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendPasswordResetByAdmin(
  data: PasswordResetByAdminData
): Promise<boolean> {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi ${data.name || 'there'},
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Your password for <strong>FlipBook DRM - jstudyroom platform</strong> has been reset by an administrator.
    </p>
    
    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
      <h2 style="margin-top: 0; font-size: 18px; color: #1976d2;">Your New Password</h2>
      
      <div style="background: #fff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 18px; text-align: center; margin: 10px 0;">
        ${data.newPassword}
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Login Now
      </a>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Security Reminder:</strong> Please change this password after logging in. Never share your password with anyone.
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you didn't request this password reset, please contact support immediately at support@jstudyroom.dev
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      FlipBook DRM - jstudyroom platform
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Your jstudyroom password has been reset

Hi ${data.name || 'there'},

Your password for FlipBook DRM - jstudyroom platform has been reset by an administrator.

Your New Password: ${data.newPassword}

Login URL: ${data.loginUrl}

⚠️ Security Reminder: Please change this password after logging in. Never share your password with anyone.

If you didn't request this password reset, please contact support immediately at support@jstudyroom.dev

---
FlipBook DRM - jstudyroom platform
    `.trim();

    return await sendEmail({
      to: data.email,
      subject: 'Your jstudyroom password has been reset',
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send password reset by admin email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: data.email
    });
    return false;
  }
}

/**
 * Purchase confirmation email data interface
 */
export interface PurchaseConfirmationEmailData {
  email: string;
  name?: string;
  documentTitle: string;
  category: string;
  price: number; // Price in paise
  myJstudyroomUrl: string;
  viewDocumentUrl: string;
}

/**
 * Send purchase confirmation email
 * @param data Purchase confirmation email data
 * @returns Promise<boolean> indicating success or failure
 */
export async function sendPurchaseConfirmationEmail(
  data: PurchaseConfirmationEmailData
): Promise<boolean> {
  try {
    const priceInRupees = (data.price / 100).toFixed(2);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Purchase Confirmed!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi ${data.name || 'there'},
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for your purchase! Your document has been successfully added to <strong>My jstudyroom</strong>.
    </p>
    
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="margin-top: 0; font-size: 18px; color: #059669;">📚 Document Details</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Title:</td>
          <td style="padding: 8px 0;">${data.documentTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Category:</td>
          <td style="padding: 8px 0;">${data.category}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #555;">Amount Paid:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #10b981;">₹${priceInRupees}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.viewDocumentUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 5px;">
        View Document
      </a>
      <br>
      <a href="${data.myJstudyroomUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 5px; border: 1px solid #d1d5db;">
        Go to My jstudyroom
      </a>
    </div>
    
    <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #1976d2;">
        <strong>📖 How to Access Your Document:</strong>
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #555;">
        <li>Visit <strong>My jstudyroom</strong> from your Member dashboard</li>
        <li>Click "View" to read the document in our secure viewer</li>
        <li>Your document is protected with DRM technology</li>
        <li>You can return documents to make room for new ones (max 10 documents)</li>
      </ul>
    </div>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>💡 Tip:</strong> You can have up to 5 paid documents and 5 free documents in My jstudyroom at any time (10 total).
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions or need assistance, please contact us at support@jstudyroom.dev
    </p>
    
    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      Thank you for using jstudyroom - FlipBook DRM platform
    </p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Purchase Confirmed!

Hi ${data.name || 'there'},

Thank you for your purchase! Your document has been successfully added to My jstudyroom.

📚 Document Details:
- Title: ${data.documentTitle}
- Category: ${data.category}
- Amount Paid: ₹${priceInRupees}

View Document: ${data.viewDocumentUrl}
Go to My jstudyroom: ${data.myJstudyroomUrl}

📖 How to Access Your Document:
- Visit My jstudyroom from your Member dashboard
- Click "View" to read the document in our secure viewer
- Your document is protected with DRM technology
- You can return documents to make room for new ones (max 10 documents)

💡 Tip: You can have up to 5 paid documents and 5 free documents in My jstudyroom at any time (10 total).

If you have any questions or need assistance, please contact us at support@jstudyroom.dev

---
Thank you for using jstudyroom - FlipBook DRM platform
    `.trim();

    return await sendEmail({
      to: data.email,
      subject: `Purchase confirmed: ${data.documentTitle}`,
      html,
      text,
    });
  } catch (error) {
    logger.error('Failed to send purchase confirmation email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: data.email
    });
    return false;
  }
}
