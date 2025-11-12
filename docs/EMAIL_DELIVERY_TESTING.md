# Email Delivery Testing Guide

This guide provides comprehensive instructions for testing email delivery in development and production environments for the FlipBook DRM application.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development Testing](#development-testing)
- [Production Testing](#production-testing)
- [Email Template Verification](#email-template-verification)
- [Spam Score Testing](#spam-score-testing)
- [Troubleshooting](#troubleshooting)

## Overview

The FlipBook DRM application sends two types of transactional emails:

1. **Verification Emails** - Sent when users register to verify their email address
2. **Password Reset Emails** - Sent when users request to reset their password

Both email types use:
- **Resend** as the email service provider
- **React Email** for template rendering
- Branded HTML templates with plain text fallbacks

## Prerequisites

### Required Environment Variables

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@flipbook-drm.com

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# For testing
TEST_EMAIL=your-test-email@example.com
```

### Email Domain Setup

Before testing in production, ensure your email domain is properly configured:

1. **SPF Record** - Prevents email spoofing
   ```
   v=spf1 include:_spf.resend.com ~all
   ```

2. **DKIM Record** - Verifies email authenticity
   - Provided by Resend in your domain settings

3. **DMARC Record** - Email authentication policy
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com
   ```

## Development Testing

### 1. Automated Test Suite

Run the comprehensive test suite:

```bash
npm run test
```

This runs all email delivery tests including:
- Email service configuration
- Email sending functionality
- Template rendering
- Error handling
- Rate limiting
- Concurrent sending

### 2. Manual Testing Script

Run the manual testing script to send real test emails:

```bash
# Set your test email
export TEST_EMAIL=your-email@example.com

# Run the test script
npm run test:email-delivery
```

Or use the TypeScript file directly:

```bash
npx tsx scripts/test-email-delivery.ts
```

The script will:
- Validate environment configuration
- Send verification and password reset emails
- Test special characters and edge cases
- Test concurrent email sending
- Provide a detailed summary

### 3. Local Development Testing

Test emails during local development:

```bash
# Start the development server
npm run dev

# In another terminal, test registration flow
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Test password reset flow
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

### 4. Preview Email Templates

Preview email templates without sending:

```bash
# Install React Email CLI
npm install -g react-email

# Start the preview server
cd emails
react-email dev
```

Open http://localhost:3000 to preview all email templates.

## Production Testing

### 1. Pre-Deployment Checklist

Before deploying to production:

- [ ] Verify RESEND_API_KEY is set in production environment
- [ ] Verify RESEND_FROM_EMAIL uses your production domain
- [ ] Verify DNS records (SPF, DKIM, DMARC) are configured
- [ ] Test email delivery from staging environment
- [ ] Verify email templates render correctly in major email clients
- [ ] Check spam scores using tools below

### 2. Production Smoke Test

After deployment, test the production environment:

```bash
# Set production URL
export NEXT_PUBLIC_APP_URL=https://your-production-domain.com
export TEST_EMAIL=your-email@example.com

# Run test script against production
npm run test:email-delivery
```

### 3. Monitor Email Delivery

Monitor email delivery in production:

1. **Resend Dashboard**
   - View sent emails
   - Check delivery status
   - Monitor bounce rates
   - Review spam complaints

2. **Application Logs**
   - Check for email sending errors
   - Monitor rate limiting
   - Review failed delivery attempts

3. **User Feedback**
   - Monitor support tickets
   - Check for "didn't receive email" reports
   - Review spam folder issues

## Email Template Verification

### 1. Visual Testing

Test email rendering in different email clients:

**Recommended Tools:**
- [Litmus](https://litmus.com/) - Comprehensive email testing
- [Email on Acid](https://www.emailonacid.com/) - Email client testing
- [Mail Tester](https://www.mail-tester.com/) - Free spam score testing

**Manual Testing:**
Send test emails to:
- Gmail (desktop and mobile)
- Outlook (desktop and web)
- Apple Mail (macOS and iOS)
- Yahoo Mail
- ProtonMail

### 2. Template Checklist

Verify each email template includes:

**Verification Email:**
- [ ] FlipBook DRM branding
- [ ] User's name
- [ ] Clear call-to-action button
- [ ] Verification URL (clickable)
- [ ] Expiration notice (24 hours)
- [ ] Plain text fallback
- [ ] Security notice
- [ ] Footer with copyright

**Password Reset Email:**
- [ ] FlipBook DRM branding
- [ ] User's name
- [ ] Clear call-to-action button
- [ ] Reset URL (clickable)
- [ ] Expiration notice (1 hour)
- [ ] Plain text fallback
- [ ] Security warning
- [ ] Footer with copyright

### 3. Accessibility Testing

Ensure emails are accessible:
- [ ] Proper heading hierarchy
- [ ] Alt text for images (if any)
- [ ] Sufficient color contrast
- [ ] Readable font sizes (minimum 14px)
- [ ] Links are clearly identifiable
- [ ] Works with screen readers

## Spam Score Testing

### 1. Mail Tester

Test your email's spam score:

1. Visit https://www.mail-tester.com/
2. Copy the provided email address
3. Send a test email to that address
4. Check your spam score (aim for 8/10 or higher)

```bash
# Send test email to Mail Tester
export TEST_EMAIL=test-xxxxx@mail-tester.com
npm run test:email-delivery
```

### 2. Spam Score Factors

Common factors affecting spam scores:

**Positive Factors:**
- ✅ Valid SPF, DKIM, DMARC records
- ✅ Proper HTML structure
- ✅ Plain text alternative
- ✅ Unsubscribe link (for marketing emails)
- ✅ Physical address (for marketing emails)
- ✅ Proper from/reply-to headers

**Negative Factors:**
- ❌ Missing DNS records
- ❌ Broken HTML
- ❌ Excessive images
- ❌ Spam trigger words
- ❌ All caps subject lines
- ❌ Too many links
- ❌ Misleading subject lines

### 3. Improving Deliverability

To improve email deliverability:

1. **Warm Up Your Domain**
   - Start with low volume
   - Gradually increase sending
   - Monitor bounce rates

2. **Maintain Good Sender Reputation**
   - Keep bounce rate < 5%
   - Keep complaint rate < 0.1%
   - Remove invalid addresses
   - Honor unsubscribe requests

3. **Follow Best Practices**
   - Use consistent from address
   - Authenticate your domain
   - Avoid spam trigger words
   - Test before sending
   - Monitor delivery metrics

## Troubleshooting

### Emails Not Being Received

**Check:**
1. Spam/junk folder
2. Email address is correct
3. Resend API key is valid
4. DNS records are configured
5. Application logs for errors
6. Resend dashboard for delivery status

**Common Issues:**
- Invalid API key → Check environment variables
- Domain not verified → Verify domain in Resend
- Rate limiting → Check rate limit logs
- Bounce → Email address doesn't exist
- Spam → Check spam score and DNS records

### Template Rendering Issues

**Check:**
1. React Email components are imported correctly
2. Props are passed correctly
3. Styles are inline (required for email)
4. No external CSS files
5. Images use absolute URLs
6. HTML is valid

**Debug:**
```bash
# Preview templates locally
cd emails
react-email dev

# Check for rendering errors in logs
npm run dev
# Check browser console and server logs
```

### Rate Limiting Issues

If emails are being rate limited:

1. Check rate limit configuration in `lib/rate-limit.ts`
2. Review rate limit logs
3. Adjust limits if needed
4. Implement retry logic for failed sends

### DNS Configuration Issues

Verify DNS records:

```bash
# Check SPF record
dig TXT your-domain.com | grep spf

# Check DKIM record
dig TXT default._domainkey.your-domain.com

# Check DMARC record
dig TXT _dmarc.your-domain.com
```

## Testing Checklist

Use this checklist for comprehensive email testing:

### Development
- [ ] Run automated test suite
- [ ] Run manual testing script
- [ ] Preview templates in React Email
- [ ] Test registration flow locally
- [ ] Test password reset flow locally
- [ ] Verify error handling
- [ ] Test rate limiting

### Staging/Pre-Production
- [ ] Configure DNS records
- [ ] Test email delivery
- [ ] Verify templates render correctly
- [ ] Check spam scores
- [ ] Test in multiple email clients
- [ ] Verify links work correctly
- [ ] Test with real user accounts

### Production
- [ ] Verify environment variables
- [ ] Run production smoke test
- [ ] Monitor delivery rates
- [ ] Check bounce rates
- [ ] Review spam complaints
- [ ] Monitor application logs
- [ ] Test user flows end-to-end

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Email Design Best Practices](https://www.campaignmonitor.com/resources/guides/email-design/)
- [Email Deliverability Guide](https://www.mailgun.com/blog/email-deliverability-guide/)
- [SPF, DKIM, DMARC Explained](https://www.cloudflare.com/learning/email-security/dmarc-dkim-spf/)

## Support

If you encounter issues with email delivery:

1. Check this guide's troubleshooting section
2. Review application logs
3. Check Resend dashboard
4. Contact Resend support
5. Review GitHub issues

---

**Last Updated:** November 2025
**Version:** 1.0.0
