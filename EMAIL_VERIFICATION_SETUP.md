# Email Verification and Password Reset Setup Guide

This guide walks you through setting up email verification and password reset functionality for FlipBook DRM.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Migration](#database-migration)
3. [Resend Email Service Setup](#resend-email-service-setup)
4. [Environment Configuration](#environment-configuration)
5. [Migrating Existing Users](#migrating-existing-users)
6. [Testing the Implementation](#testing-the-implementation)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Access to your database (Supabase or PostgreSQL)
- ✅ Prisma CLI installed (`npm install -g prisma`)
- ✅ A Resend account (free tier available)

## Database Migration

### Step 1: Review the Schema Changes

The migration adds email verification fields to the User table and creates a new VerificationToken table.

**Changes to User table:**
- `emailVerified` (Boolean, default: false)
- `emailVerifiedAt` (DateTime, nullable)

**New VerificationToken table:**
- `id` (String, primary key)
- `userId` (String, foreign key to User)
- `token` (String, unique, hashed)
- `type` (Enum: EMAIL_VERIFICATION or PASSWORD_RESET)
- `expiresAt` (DateTime)
- `createdAt` (DateTime)

### Step 2: Run the Migration

```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema changes to database
npx prisma db push
```

**Expected Output:**
```
✔ Generated Prisma Client
✔ Database schema updated
```

### Step 3: Verify Migration

Check that the migration was successful:

```bash
# Open Prisma Studio to inspect tables
npx prisma studio
```

Verify:
- User table has `emailVerified` and `emailVerifiedAt` columns
- VerificationToken table exists with all fields
- Indexes are created on `token` and `expiresAt`

## Resend Email Service Setup

### Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key

1. Navigate to **API Keys** in the Resend dashboard
2. Click **Create API Key**
3. Name it (e.g., "FlipBook DRM Production")
4. Copy the API key (starts with `re_`)
5. **Important**: Save it securely - you won't see it again!

### Step 3: Configure Email Domain (Production)

For production, you need to verify your domain:

1. **Add Domain**:
   - Go to **Domains** in Resend dashboard
   - Click **Add Domain**
   - Enter your domain (e.g., `yourdomain.com`)

2. **Configure DNS Records**:
   
   Add these DNS records to your domain provider:

   **SPF Record** (TXT):
   ```
   Name: @
   Type: TXT
   Value: v=spf1 include:_spf.resend.com ~all
   ```

   **DKIM Record** (TXT):
   ```
   Name: resend._domainkey
   Type: TXT
   Value: [Provided by Resend - copy from dashboard]
   ```

   **DMARC Record** (TXT):
   ```
   Name: _dmarc
   Type: TXT
   Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
   ```

3. **Verify Domain**:
   - Wait 5-10 minutes for DNS propagation
   - Click **Verify** in Resend dashboard
   - Status should change to "Verified"

### Step 4: Test Email Sending (Development)

For development/testing, you can use Resend's test domain:

```
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

This doesn't require domain verification and is perfect for testing.

## Environment Configuration

### Development (.env.local)

```env
# Email Service (Resend)
RESEND_API_KEY="re_your_api_key_here"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# Cron Job Security
CRON_SECRET="generate-with-openssl-rand-hex-32"
```

### Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:

```
RESEND_API_KEY=re_your_production_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
CRON_SECRET=your-secure-random-string
```

**Generate Secure Secrets:**
```bash
# Generate CRON_SECRET
openssl rand -hex 32
```

## Migrating Existing Users

If you have existing users in your database, you need to mark them as verified to avoid disrupting their access.

### Option 1: Using the Migration Script (Recommended)

Run the provided migration script:

```bash
npx tsx prisma/mark-existing-users-verified.ts
```

**What it does:**
- Finds all users with `emailVerified = false`
- Sets `emailVerified = true`
- Sets `emailVerifiedAt` to their account creation date
- Logs the number of users updated

**Expected Output:**
```
Starting migration: Marking existing users as verified...
Found 42 unverified users
✓ Marked 42 existing users as verified
Migration completed successfully!
```

### Option 2: Manual SQL Query

If you prefer to run SQL directly:

```sql
UPDATE "User"
SET 
  "emailVerified" = true,
  "emailVerifiedAt" = "createdAt"
WHERE "emailVerified" = false;
```

### Option 3: Selective Migration

If you want to verify specific users only:

```sql
UPDATE "User"
SET 
  "emailVerified" = true,
  "emailVerifiedAt" = NOW()
WHERE "email" IN ('user1@example.com', 'user2@example.com');
```

## Testing the Implementation

> **📚 Comprehensive Testing Documentation**
> 
> For detailed testing procedures, see:
> - [Email Delivery Testing Guide](docs/EMAIL_DELIVERY_TESTING.md) - Complete testing procedures
> - [Spam Score Checklist](docs/SPAM_SCORE_CHECKLIST.md) - Ensure high deliverability
> - [Production Email Testing](docs/PRODUCTION_EMAIL_TEST.md) - Quick production testing guide

### Quick Testing Overview

### Test 1: New User Registration

1. **Register a new account**:
   - Go to `/register`
   - Fill in email and password
   - Submit the form

2. **Expected behavior**:
   - Success message displayed
   - Verification email sent
   - User redirected to verification pending page

3. **Check email**:
   - Open your email inbox
   - Find verification email from FlipBook DRM
   - Click "Verify Email Address" button

4. **Verify success**:
   - Redirected to dashboard
   - User can access all features

### Test 2: Resend Verification Email

1. **Go to verification pending page**: `/verify-email`
2. **Click "Resend Verification Email"**
3. **Expected behavior**:
   - Success message displayed
   - New email sent
   - Rate limit enforced (1 per 60 seconds)

### Test 3: Password Reset Flow

1. **Go to forgot password page**: `/forgot-password`
2. **Enter your email address**
3. **Check email for reset link**
4. **Click reset link**
5. **Enter new password**
6. **Expected behavior**:
   - Password updated successfully
   - Redirected to login page
   - Can login with new password

### Test 4: Token Expiration

1. **Request verification email**
2. **Wait 24+ hours** (or manually expire token in database)
3. **Click verification link**
4. **Expected behavior**:
   - Error message: "Token expired"
   - Option to resend verification email

### Test 5: Rate Limiting

1. **Request verification email**
2. **Immediately request again**
3. **Expected behavior**:
   - Error message with countdown
   - Must wait 60 seconds

## Troubleshooting

### Issue: Emails Not Sending

**Symptoms:**
- No emails received
- No errors in logs

**Solutions:**

1. **Check API Key**:
   ```bash
   # Verify environment variable is set
   echo $RESEND_API_KEY
   ```

2. **Check Resend Dashboard**:
   - Go to **Logs** in Resend dashboard
   - Look for failed delivery attempts
   - Check error messages

3. **Verify From Email**:
   - Ensure `RESEND_FROM_EMAIL` matches verified domain
   - For testing, use `onboarding@resend.dev`

4. **Check Spam Folder**:
   - Emails might be filtered as spam
   - Add sender to safe list

5. **Test with Resend CLI**:
   ```bash
   curl -X POST 'https://api.resend.com/emails' \
     -H 'Authorization: Bearer YOUR_API_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "from": "onboarding@resend.dev",
       "to": "your-email@example.com",
       "subject": "Test Email",
       "html": "<p>Test</p>"
     }'
   ```

### Issue: Token Validation Fails

**Symptoms:**
- "Invalid token" error
- Token exists in database

**Solutions:**

1. **Check Token Hashing**:
   - Tokens are hashed with SHA-256
   - Ensure `lib/tokens.ts` is using correct hashing

2. **Check Token Expiration**:
   ```sql
   SELECT * FROM "VerificationToken" 
   WHERE "expiresAt" > NOW();
   ```

3. **Clear Expired Tokens**:
   ```bash
   # Run cleanup manually
   curl -X GET 'http://localhost:3000/api/cron/cleanup-tokens' \
     -H 'Authorization: Bearer YOUR_CRON_SECRET'
   ```

### Issue: Users Can't Login After Migration

**Symptoms:**
- Existing users redirected to verification page
- Can't access dashboard

**Solutions:**

1. **Verify Migration Ran**:
   ```sql
   SELECT COUNT(*) FROM "User" WHERE "emailVerified" = false;
   ```
   Should return 0 for existing users.

2. **Manually Verify User**:
   ```sql
   UPDATE "User"
   SET "emailVerified" = true, "emailVerifiedAt" = NOW()
   WHERE "email" = 'user@example.com';
   ```

3. **Check Auth Callbacks**:
   - Verify `lib/auth.ts` has correct logic
   - Check session includes `emailVerified` field

### Issue: Rate Limiting Not Working

**Symptoms:**
- Can send multiple emails rapidly
- No rate limit errors

**Solutions:**

1. **Check Rate Limit Configuration**:
   - Verify `lib/rate-limit.ts` is properly configured
   - Check if using in-memory or Redis

2. **For Production (Upstash Redis)**:
   ```env
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

3. **Test Rate Limit**:
   ```bash
   # Send multiple requests quickly
   curl -X POST 'http://localhost:3000/api/auth/resend-verification' \
     -H 'Content-Type: application/json' \
     -d '{"email": "test@example.com"}'
   ```

### Issue: Cron Job Not Running

**Symptoms:**
- Expired tokens not being cleaned up
- Database growing with old tokens

**Solutions:**

1. **Verify Cron Configuration**:
   - Check `vercel.json` has cron definition
   - Ensure `CRON_SECRET` is set in Vercel

2. **Test Cron Endpoint Manually**:
   ```bash
   curl -X GET 'https://your-app.vercel.app/api/cron/cleanup-tokens' \
     -H 'Authorization: Bearer YOUR_CRON_SECRET'
   ```

3. **Check Vercel Logs**:
   - Go to Vercel dashboard
   - Check **Logs** for cron execution
   - Look for errors

4. **Manual Cleanup**:
   ```sql
   DELETE FROM "VerificationToken"
   WHERE "expiresAt" < NOW() - INTERVAL '7 days';
   ```

### Issue: Email Templates Not Rendering

**Symptoms:**
- Plain text emails instead of HTML
- Broken styling

**Solutions:**

1. **Check React Email Installation**:
   ```bash
   npm list @react-email/components
   ```

2. **Test Template Rendering**:
   ```bash
   # Preview templates locally
   npm run email:dev
   ```

3. **Verify Template Imports**:
   - Check `emails/VerificationEmail.tsx`
   - Ensure all components imported correctly

## DNS Configuration Reference

### SPF (Sender Policy Framework)

Prevents email spoofing by specifying authorized mail servers.

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

### DKIM (DomainKeys Identified Mail)

Adds digital signature to emails for authentication.

```
Type: TXT
Name: resend._domainkey
Value: [Provided by Resend - unique per domain]
TTL: 3600
```

### DMARC (Domain-based Message Authentication)

Defines policy for handling failed authentication.

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

**DMARC Policy Options:**
- `p=none` - Monitor only (recommended for testing)
- `p=quarantine` - Send to spam if fails
- `p=reject` - Reject if fails (strictest)

## Security Best Practices

1. **Token Security**:
   - Tokens are cryptographically secure (32 bytes)
   - Stored as SHA-256 hashes in database
   - Never log plain text tokens

2. **Rate Limiting**:
   - Prevents abuse and spam
   - 1 request per 60 seconds per email
   - Consider using Redis for production

3. **Token Expiration**:
   - Email verification: 24 hours
   - Password reset: 1 hour
   - Automatic cleanup after 7 days

4. **Email Security**:
   - Use HTTPS for all links
   - Verify domain with SPF/DKIM/DMARC
   - Don't reveal if email exists (password reset)

5. **Environment Variables**:
   - Never commit `.env` files
   - Use different keys for dev/prod
   - Rotate secrets regularly

## Monitoring and Maintenance

### Email Delivery Monitoring

1. **Resend Dashboard**:
   - Check delivery rates
   - Monitor bounce rates
   - Review spam complaints

2. **Application Logs**:
   - Monitor email sending errors
   - Track verification attempts
   - Log suspicious activity

### Database Maintenance

1. **Token Cleanup**:
   - Automated via cron job (daily at 2 AM UTC)
   - Deletes tokens expired > 7 days
   - Monitor cleanup statistics

2. **User Verification Status**:
   ```sql
   -- Check verification rates
   SELECT 
     COUNT(*) as total_users,
     SUM(CASE WHEN "emailVerified" = true THEN 1 ELSE 0 END) as verified_users,
     ROUND(100.0 * SUM(CASE WHEN "emailVerified" = true THEN 1 ELSE 0 END) / COUNT(*), 2) as verification_rate
   FROM "User";
   ```

3. **Token Statistics**:
   ```sql
   -- Check active tokens
   SELECT 
     type,
     COUNT(*) as count,
     MIN("expiresAt") as oldest_expiry,
     MAX("expiresAt") as newest_expiry
   FROM "VerificationToken"
   WHERE "expiresAt" > NOW()
   GROUP BY type;
   ```

## Next Steps

After completing the setup:

1. ✅ Test all email flows thoroughly
2. ✅ Monitor email delivery rates
3. ✅ Set up error alerting
4. ✅ Document any custom configurations
5. ✅ Train team on troubleshooting
6. ✅ Plan for scaling (consider Redis for rate limiting)

## Support Resources

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **Prisma Documentation**: [prisma.io/docs](https://prisma.io/docs)
- **React Email**: [react.email](https://react.email)
- **Vercel Cron Jobs**: [vercel.com/docs/cron-jobs](https://vercel.com/docs/cron-jobs)

## Rollback Plan

If you need to rollback the changes:

1. **Revert Database Schema**:
   ```sql
   ALTER TABLE "User" DROP COLUMN "emailVerified";
   ALTER TABLE "User" DROP COLUMN "emailVerifiedAt";
   DROP TABLE "VerificationToken";
   ```

2. **Remove Environment Variables**:
   - Delete `RESEND_API_KEY`
   - Delete `RESEND_FROM_EMAIL`
   - Delete `CRON_SECRET`

3. **Revert Code Changes**:
   ```bash
   git revert [commit-hash]
   ```

4. **Redeploy Application**

---

**Last Updated**: November 2025  
**Version**: 1.0.0
