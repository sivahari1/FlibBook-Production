import { Resend } from 'resend';
import { render } from '@react-email/render';
import { logger } from './logger';

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@flipbook-drm.com';
const APP_NAME = 'FlipBook DRM';

// Lazy initialize Resend client
let resendClient: Resend | null = null;
function getResendClient(): Resend {
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
    // Validate required environment variables
    if (!process.env.RESEND_API_KEY) {
      logger.error('RESEND_API_KEY is not configured');
      return false;
    }

    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      logger.error('Email sending failed', { 
        error: error.message,
        to: options.to,
        subject: options.subject 
      });
      return false;
    }

    logger.info('Email sent successfully', { 
      emailId: data?.id,
      to: options.to,
      subject: options.subject 
    });
    return true;
  } catch (error) {
    logger.error('Email service error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
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
