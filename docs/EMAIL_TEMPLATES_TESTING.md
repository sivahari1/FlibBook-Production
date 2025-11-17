# Email Templates Testing Guide

This document provides a comprehensive guide for testing all email flows in the jstudyroom platform.

## Prerequisites

- Ensure `RESEND_API_KEY` is configured in `.env`
- Ensure `RESEND_FROM_EMAIL` is set to `support@jstudyroom.dev`
- Verify domain is verified in Resend dashboard

## Email Templates Overview

The platform uses the following email templates:

1. **Member Verification Email** - Sent when a Member registers
2. **Purchase Confirmation Email** - Sent when a Member purchases a paid document
3. **Share Notification Email** - Sent when a document is shared
4. **Password Reset Email** - Sent when a user requests password reset
5. **Platform User Approval Email** - Sent when admin approves access request
6. **Password Reset by Admin Email** - Sent when admin resets a user's password

## Test Scenarios

### 1. Member Verification Email

**Trigger:** Member self-registration

**Steps:**
1. Navigate to `/register`
2. Fill in registration form with valid data
3. Submit the form
4. Check email inbox for verification email

**Expected Results:**
- Email received from `support@jstudyroom.dev`
- Subject: "Verify your FlipBook DRM account"
- Contains verification link
- Link expires in 24 hours
- Plain text fallback included

**Verification:**
```bash
# Check logs for email sending
grep "Email sent successfully" logs/app.log
```

### 2. Purchase Confirmation Email

**Trigger:** Successful payment for a paid document

**Steps:**
1. Login as a Member
2. Navigate to Book Shop
3. Select a paid document
4. Complete payment via Razorpay
5. Check email inbox for confirmation

**Expected Results:**
- Email received from `support@jstudyroom.dev`
- Subject: "Purchase confirmed: [Document Title]"
- Contains document details (title, category, price)
- Contains link to My jstudyroom
- Contains link to view document
- Includes access instructions
- Plain text fallback included

**Test Data:**
```typescript
{
  email: "test@example.com",
  name: "Test Member",
  documentTitle: "Advanced Mathematics",
  category: "Education",
  price: 29900, // ₹299.00
  myJstudyroomUrl: "https://jstudyroom.dev/member/my-jstudyroom",
  viewDocumentUrl: "https://jstudyroom.dev/member/view/item123"
}
```

### 3. Share Notification Email

**Trigger:** Platform User shares document with specific email

**Steps:**
1. Login as Platform User
2. Navigate to document details
3. Click "Share" and select "Email Share"
4. Enter recipient email and optional note
5. Submit share form
6. Check recipient's email inbox

**Expected Results:**
- Email received from `support@jstudyroom.dev`
- Subject: "[Sender Name] shared '[Document Title]' with you"
- Contains document title
- Contains sender's name
- Contains personal note (if provided)
- Contains "View Document" button
- Includes login instructions for Members
- Includes registration link for new users
- Includes login link for existing users
- Shows expiration date (if set)
- Shows download permission status
- Plain text fallback included

**Enhanced Features (Requirement 13.4):**
- Clear instructions on how to access the document
- Step-by-step access guide
- Registration CTA for non-members
- Login link for existing members

### 4. Password Reset Email

**Trigger:** User requests password reset

**Steps:**
1. Navigate to `/forgot-password`
2. Enter email address
3. Submit form
4. Check email inbox

**Expected Results:**
- Email received from `support@jstudyroom.dev`
- Subject: "Reset your FlipBook DRM password"
- Contains reset link
- Link expires in 1 hour
- Plain text fallback included

### 5. Platform User Approval Email

**Trigger:** Admin approves access request

**Steps:**
1. Login as Admin
2. Navigate to Access Requests
3. Approve a pending request
4. Check applicant's email inbox

**Expected Results:**
- Email received from `support@jstudyroom.dev`
- Subject: "Your jstudyroom FlipBook DRM access is approved"
- Contains login credentials
- Contains role description
- Contains login link
- Includes security reminder to change password
- Plain text fallback included

### 6. Password Reset by Admin Email

**Trigger:** Admin resets user password

**Steps:**
1. Login as Admin
2. Navigate to Members or Users management
3. Select a user and reset password
4. Check user's email inbox

**Expected Results:**
- Email received from `support@jstudyroom.dev`
- Subject: "Your jstudyroom password has been reset"
- Contains new password
- Contains login link
- Includes security reminder
- Plain text fallback included

## Automated Testing

Run the email test suite:

```bash
# Test all email functions
npm test lib/__tests__/email.test.ts

# Test share email functions
npm test lib/__tests__/email-share.test.ts
```

## Verification Checklist

For each email template, verify:

- [ ] Email is sent from `support@jstudyroom.dev`
- [ ] Subject line is clear and descriptive
- [ ] HTML version renders correctly on desktop
- [ ] HTML version renders correctly on mobile
- [ ] Plain text fallback is readable
- [ ] All links are functional
- [ ] All dynamic content is populated correctly
- [ ] Email passes spam filters
- [ ] Branding is consistent (jstudyroom)
- [ ] Contact information is correct (support@jstudyroom.dev)

## Common Issues and Solutions

### Email Not Received

1. Check Resend dashboard for delivery status
2. Verify domain is verified in Resend
3. Check spam/junk folder
4. Verify `RESEND_FROM_EMAIL` is set correctly
5. Check application logs for errors

### Email Formatting Issues

1. Test HTML rendering in multiple email clients
2. Verify inline CSS is used (not external stylesheets)
3. Check for proper HTML escaping
4. Test with long content (document titles, notes)

### Link Issues

1. Verify `NEXT_PUBLIC_APP_URL` is set correctly
2. Check that links use absolute URLs
3. Test links in different environments (dev, staging, prod)

## Production Verification

Before deploying to production:

1. Send test emails to multiple email providers (Gmail, Outlook, Yahoo)
2. Verify all links work in production environment
3. Check email delivery time (should be < 5 seconds)
4. Monitor Resend dashboard for any delivery issues
5. Verify spam score is acceptable

## Monitoring

Monitor email delivery in production:

```bash
# Check email sending logs
grep "Email sent successfully" logs/production.log | tail -20

# Check email failures
grep "Email sending failed" logs/production.log | tail -20

# Check Resend API errors
grep "Resend" logs/production.log | grep "error" | tail -20
```

## Support

For email delivery issues, contact:
- Resend Support: https://resend.com/support
- Internal Support: support@jstudyroom.dev

## Requirements Coverage

This testing guide covers the following requirements:

- **Requirement 13.1:** Member verification email via Resend from support@jstudyroom.dev
- **Requirement 13.2:** Purchase confirmation email via Resend
- **Requirement 13.3:** Platform User approval email via Resend
- **Requirement 13.4:** Share notification email via Resend with login instructions
- **Requirement 13.5:** Password reset email via Resend
- **Requirement 13.6:** All emails include plain text fallbacks and are mobile-responsive
- **Requirement 13.7:** All emails use FROM address support@jstudyroom.dev
