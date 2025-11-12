# Design Document: Email Verification and Password Reset

## Overview

This design document outlines the technical implementation for email verification during user registration and password reset functionality. The solution uses time-limited cryptographic tokens, integrates with an email service provider (Resend), and provides a secure, user-friendly experience.

## Architecture

### High-Level Flow

```
Registration Flow:
User → Register Form → API → Create User (unverified) → Generate Token → Send Email → User Clicks Link → Verify Token → Mark Verified → Redirect to Dashboard

Password Reset Flow:
User → Forgot Password → API → Generate Reset Token → Send Email → User Clicks Link → Reset Form → API → Validate Token → Update Password → Invalidate Token → Redirect to Login
```

### System Components

1. **Authentication Layer** (`lib/auth.ts`)
   - Extended to check email verification status
   - Handles password reset token validation

2. **Email Service** (`lib/email.ts`)
   - Integrates with Resend API
   - Sends verification and password reset emails
   - Uses React Email for templates

3. **Token Management** (`lib/tokens.ts`)
   - Generates cryptographically secure tokens
   - Validates and expires tokens
   - Hashes tokens before storage

4. **API Routes**
   - `/api/auth/verify-email` - Verify email with token
   - `/api/auth/resend-verification` - Resend verification email
   - `/api/auth/forgot-password` - Request password reset
   - `/api/auth/reset-password` - Complete password reset

5. **UI Components**
   - Verification pending page
   - Email verification success page
   - Forgot password form
   - Reset password form

## Components and Interfaces

### Database Schema Updates

```prisma
model User {
  id                String              @id @default(cuid())
  email             String              @unique
  password          String
  name              String?
  emailVerified     Boolean             @default(false)
  emailVerifiedAt   DateTime?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  verificationTokens VerificationToken[]
  // ... existing relations
}

model VerificationToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique // Hashed token
  type      TokenType
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([expiresAt])
}

enum TokenType {
  EMAIL_VERIFICATION
  PASSWORD_RESET
}
```

### Token Management Interface

```typescript
// lib/tokens.ts

interface TokenData {
  token: string;      // Plain text token (sent to user)
  hashedToken: string; // Hashed token (stored in DB)
  expiresAt: Date;
}

interface TokenValidation {
  valid: boolean;
  userId?: string;
  error?: string;
}

export async function generateVerificationToken(
  userId: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
): Promise<TokenData>

export async function validateToken(
  token: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
): Promise<TokenValidation>

export async function invalidateUserTokens(
  userId: string,
  type?: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'
): Promise<void>

export async function cleanupExpiredTokens(): Promise<void>
```

### Email Service Interface

```typescript
// lib/email.ts

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface VerificationEmailData {
  userName: string;
  verificationUrl: string;
}

interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean>

export async function sendVerificationEmail(
  email: string,
  data: VerificationEmailData
): Promise<boolean>

export async function sendPasswordResetEmail(
  email: string,
  data: PasswordResetEmailData
): Promise<boolean>
```

### API Route Interfaces

```typescript
// POST /api/auth/verify-email
Request: {
  token: string;
}
Response: {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

// POST /api/auth/resend-verification
Request: {
  email: string;
}
Response: {
  success: boolean;
  message: string;
}

// POST /api/auth/forgot-password
Request: {
  email: string;
}
Response: {
  success: boolean;
  message: string;
}

// POST /api/auth/reset-password
Request: {
  token: string;
  password: string;
}
Response: {
  success: boolean;
  message: string;
}
```

## Data Models

### Token Generation

```typescript
// Generate a cryptographically secure token
const token = crypto.randomBytes(32).toString('hex'); // 64 character hex string

// Hash the token for storage
const hashedToken = crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

// Store in database
await prisma.verificationToken.create({
  data: {
    userId,
    token: hashedToken,
    type: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
});

// Return plain token to send to user
return token;
```

### Token Validation

```typescript
// Hash the received token
const hashedToken = crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

// Find token in database
const tokenRecord = await prisma.verificationToken.findUnique({
  where: { token: hashedToken },
  include: { user: true },
});

// Validate
if (!tokenRecord) {
  return { valid: false, error: 'Invalid token' };
}

if (tokenRecord.expiresAt < new Date()) {
  return { valid: false, error: 'Token expired' };
}

return { valid: true, userId: tokenRecord.userId };
```

## Error Handling

### Error Types

1. **Token Errors**
   - Invalid token format
   - Token not found
   - Token expired
   - Token already used

2. **Email Errors**
   - Email service unavailable
   - Invalid email address
   - Email sending failed

3. **Rate Limiting Errors**
   - Too many requests
   - Cooldown period active

4. **Validation Errors**
   - Weak password
   - Invalid email format
   - Missing required fields

### Error Response Format

```typescript
{
  success: false,
  error: {
    code: 'TOKEN_EXPIRED',
    message: 'Your verification link has expired',
    action: 'resend' // Suggested action
  }
}
```

### Error Handling Strategy

1. **Client-Side Validation**
   - Validate email format before submission
   - Check password strength in real-time
   - Display inline validation errors

2. **Server-Side Validation**
   - Validate all inputs
   - Sanitize data
   - Return specific error codes

3. **Graceful Degradation**
   - If email service fails, queue for retry
   - Log errors for monitoring
   - Display user-friendly messages

4. **Security Considerations**
   - Don't reveal if email exists (password reset)
   - Rate limit all endpoints
   - Log suspicious activity

## Testing Strategy

### Unit Tests

1. **Token Management**
   - Test token generation
   - Test token hashing
   - Test token validation
   - Test token expiration
   - Test token cleanup

2. **Email Service**
   - Test email formatting
   - Test template rendering
   - Mock email sending
   - Test error handling

3. **API Routes**
   - Test successful flows
   - Test error cases
   - Test rate limiting
   - Test validation

### Integration Tests

1. **Registration Flow**
   - Register → Receive email → Verify → Login
   - Register → Resend email → Verify
   - Register → Token expires → Resend

2. **Password Reset Flow**
   - Request reset → Receive email → Reset password → Login
   - Request reset → Token expires → Request again
   - Request reset → Invalid token → Error

3. **Security Tests**
   - Test rate limiting
   - Test token reuse prevention
   - Test expired token handling
   - Test invalid token handling

### Manual Testing Checklist

- [ ] Register new account and verify email
- [ ] Try to access dashboard before verification
- [ ] Resend verification email
- [ ] Click expired verification link
- [ ] Request password reset
- [ ] Complete password reset
- [ ] Try to reuse reset token
- [ ] Test rate limiting on all endpoints
- [ ] Check email delivery
- [ ] Verify email templates render correctly

## Email Service Integration

### Resend Setup

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(options: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'FlipBook DRM <noreply@flipbook-drm.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      logger.error('Email sending failed', { error });
      return false;
    }

    logger.info('Email sent successfully', { emailId: data.id });
    return true;
  } catch (error) {
    logger.error('Email service error', { error });
    return false;
  }
}
```

### Email Templates

Using React Email for type-safe, component-based templates:

```typescript
// emails/VerificationEmail.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface VerificationEmailProps {
  userName: string;
  verificationUrl: string;
}

export function VerificationEmail({
  userName,
  verificationUrl,
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your FlipBook DRM account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Welcome to FlipBook DRM!</Text>
          <Text style={paragraph}>
            Hi {userName},
          </Text>
          <Text style={paragraph}>
            Thanks for signing up! Please verify your email address to get started.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verificationUrl}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={paragraph}>
            Or copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{verificationUrl}</Text>
          <Text style={footer}>
            This link will expire in 24 hours. If you didn't create an account,
            you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

## Security Considerations

### Token Security

1. **Cryptographically Secure Generation**
   - Use `crypto.randomBytes()` for token generation
   - Minimum 32 bytes (64 hex characters)

2. **Token Hashing**
   - Hash tokens before storing in database
   - Use SHA-256 for hashing
   - Never store plain text tokens

3. **Token Expiration**
   - Email verification: 24 hours
   - Password reset: 1 hour
   - Automatic cleanup of expired tokens

4. **Single Use Tokens**
   - Invalidate token after successful use
   - Prevent token reuse attacks

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const emailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '60 s'), // 1 request per 60 seconds
  analytics: true,
});

export const passwordResetRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'), // 3 requests per hour
  analytics: true,
});
```

### Email Security

1. **SPF, DKIM, DMARC**
   - Configure proper email authentication
   - Prevent email spoofing

2. **Link Security**
   - Use HTTPS for all links
   - Include token in URL parameter
   - Validate origin on token use

3. **Content Security**
   - Sanitize user data in emails
   - Prevent XSS in email content

## Performance Considerations

### Database Optimization

1. **Indexes**
   - Index on `token` field for fast lookups
   - Index on `expiresAt` for cleanup queries
   - Index on `userId` for user token queries

2. **Cleanup Strategy**
   - Run cron job to delete expired tokens
   - Schedule: Daily at 2 AM
   - Delete tokens older than 7 days

### Email Delivery

1. **Async Processing**
   - Send emails asynchronously
   - Don't block API responses
   - Use background jobs for retries

2. **Error Handling**
   - Retry failed emails (max 3 attempts)
   - Exponential backoff
   - Log failures for monitoring

## Environment Variables

```env
# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@flipbook-drm.com

# Application URLs
NEXT_PUBLIC_APP_URL=https://flipbook-drm.com
NEXTAUTH_URL=https://flipbook-drm.com

# Rate Limiting (Optional - Upstash Redis)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx
```

## Migration Strategy

### Database Migration

```sql
-- Add email verification fields to User table
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP;

-- Create VerificationToken table
CREATE TABLE "VerificationToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");
CREATE INDEX "VerificationToken_expiresAt_idx" ON "VerificationToken"("expiresAt");
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");
```

### Existing Users

1. **Mark Existing Users as Verified**
   - Run migration to set `emailVerified = true` for all existing users
   - Set `emailVerifiedAt` to their `createdAt` date

2. **Communication**
   - Notify existing users about new security features
   - Explain email verification for new accounts

## Deployment Checklist

- [ ] Set up Resend account and get API key
- [ ] Configure email domain and DNS records (SPF, DKIM, DMARC)
- [ ] Add environment variables to Vercel
- [ ] Run database migration
- [ ] Mark existing users as verified
- [ ] Test email delivery in production
- [ ] Monitor email delivery rates
- [ ] Set up error alerting
- [ ] Document user-facing changes

## Future Enhancements

1. **Two-Factor Authentication (2FA)**
   - Add optional 2FA for enhanced security
   - Support TOTP and SMS

2. **Email Change Verification**
   - Require verification when users change email
   - Send notification to old email

3. **Account Recovery**
   - Security questions
   - Backup email addresses

4. **Email Preferences**
   - Allow users to manage email notifications
   - Unsubscribe options

5. **Magic Link Login**
   - Passwordless authentication option
   - One-time login links via email
