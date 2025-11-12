# Production Email Testing Quick Guide

Quick reference for testing email delivery in production.

## Pre-Deployment Checklist

### 1. Environment Variables

Verify in Vercel/production environment:

```bash
✅ RESEND_API_KEY=re_xxxxxxxxxxxxx
✅ RESEND_FROM_EMAIL=noreply@flipbook-drm.com
✅ NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### 2. DNS Configuration

Verify DNS records are configured:

```bash
# SPF Record
dig TXT your-domain.com | grep spf
# Expected: v=spf1 include:_spf.resend.com ~all

# DKIM Record
dig TXT default._domainkey.your-domain.com
# Expected: DKIM public key

# DMARC Record
dig TXT _dmarc.your-domain.com
# Expected: v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com
```

### 3. Resend Dashboard

Verify in Resend dashboard:
- [ ] Domain is verified
- [ ] API key is active
- [ ] Sending is enabled
- [ ] No rate limits exceeded

## Production Testing Steps

### Step 1: Smoke Test

Test basic email functionality:

```bash
# Register a new test account
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@youremail.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Check your email for verification link
# Click the link and verify it works
```

### Step 2: Password Reset Test

Test password reset flow:

```bash
# Request password reset
curl -X POST https://your-domain.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@youremail.com"
  }'

# Check your email for reset link
# Click the link and reset password
# Verify you can login with new password
```

### Step 3: Multi-Client Test

Send test emails to different providers:

1. **Gmail** - test@gmail.com
   - Check inbox
   - Check spam folder
   - Verify rendering

2. **Outlook** - test@outlook.com
   - Check inbox
   - Check junk folder
   - Verify rendering

3. **Yahoo** - test@yahoo.com
   - Check inbox
   - Check spam folder
   - Verify rendering

4. **Apple Mail** - test@icloud.com
   - Check inbox
   - Check junk folder
   - Verify rendering

### Step 4: Spam Score Test

Test spam score with Mail Tester:

```bash
# Get test email from https://www.mail-tester.com/
# Register with that email
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-xxxxx@mail-tester.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# Check Mail Tester for score (aim for 8+)
```

## Monitoring

### Daily Monitoring

Check Resend dashboard for:
- [ ] Delivery rate (should be > 95%)
- [ ] Bounce rate (should be < 5%)
- [ ] Complaint rate (should be < 0.1%)
- [ ] Failed sends (investigate any failures)

### Weekly Monitoring

Review application logs for:
- [ ] Email sending errors
- [ ] Rate limiting issues
- [ ] Token generation errors
- [ ] Template rendering errors

### User Feedback

Monitor for:
- [ ] "Didn't receive email" support tickets
- [ ] Emails going to spam reports
- [ ] Broken links in emails
- [ ] Template rendering issues

## Common Issues

### Issue: Emails Not Delivered

**Check:**
1. Resend dashboard - delivery status
2. Application logs - sending errors
3. DNS records - properly configured
4. API key - valid and active
5. Rate limits - not exceeded

**Fix:**
```bash
# Check logs
vercel logs --follow

# Verify environment variables
vercel env ls

# Test API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@flipbook-drm.com",
    "to": "test@example.com",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

### Issue: Emails Going to Spam

**Check:**
1. DNS records (SPF, DKIM, DMARC)
2. Spam score (use Mail Tester)
3. Sender reputation
4. Email content

**Fix:**
1. Configure DNS records properly
2. Improve spam score
3. Warm up domain gradually
4. Review email content

### Issue: High Bounce Rate

**Check:**
1. Email validation
2. User input errors
3. Inactive accounts

**Fix:**
1. Improve email validation
2. Use double opt-in
3. Remove bounced addresses

## Emergency Procedures

### If Emails Stop Sending

1. **Check Resend Status**
   - Visit https://status.resend.com/
   - Check for service outages

2. **Verify API Key**
   ```bash
   vercel env ls
   # Ensure RESEND_API_KEY is set
   ```

3. **Check Rate Limits**
   - Review Resend dashboard
   - Check if limits exceeded

4. **Review Recent Changes**
   - Check recent deployments
   - Review code changes
   - Check environment variable changes

5. **Contact Support**
   - Resend support: support@resend.com
   - Include: error logs, email IDs, timestamps

## Success Metrics

### Target Metrics

- **Delivery Rate:** > 95%
- **Bounce Rate:** < 5%
- **Complaint Rate:** < 0.1%
- **Open Rate:** > 40% (transactional)
- **Click Rate:** > 20% (transactional)
- **Spam Score:** > 8/10

### Current Status

Track weekly:
```
Week of [Date]:
- Emails Sent: ___
- Delivered: ___% 
- Bounced: ___%
- Complaints: ___%
- Spam Score: __/10
```

## Testing Schedule

### After Each Deployment

- [ ] Run smoke test
- [ ] Verify email delivery
- [ ] Check application logs
- [ ] Monitor for 1 hour

### Weekly

- [ ] Test all email flows
- [ ] Check spam scores
- [ ] Review metrics
- [ ] Update documentation

### Monthly

- [ ] Full email audit
- [ ] Multi-client testing
- [ ] DNS record verification
- [ ] Sender reputation check

## Quick Commands

```bash
# Test registration email
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","name":"Test"}'

# Test password reset email
curl -X POST https://your-domain.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check DNS records
dig TXT your-domain.com | grep spf
dig TXT default._domainkey.your-domain.com
dig TXT _dmarc.your-domain.com

# View production logs
vercel logs --follow

# Check environment variables
vercel env ls
```

## Support Contacts

- **Resend Support:** support@resend.com
- **Resend Status:** https://status.resend.com/
- **Resend Docs:** https://resend.com/docs
- **Mail Tester:** https://www.mail-tester.com/

---

**Last Updated:** November 2025
**Review:** After each deployment
