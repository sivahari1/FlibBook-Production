# Email Spam Score Testing Checklist

This checklist helps ensure your emails achieve high deliverability and avoid spam filters.

## Quick Test

### Mail Tester (Free)

1. Visit https://www.mail-tester.com/
2. Copy the provided test email address
3. Send a test email:
   ```bash
   export TEST_EMAIL=test-xxxxx@mail-tester.com
   npm run test:email-delivery
   ```
4. Check your score (aim for 8/10 or higher)

## Comprehensive Spam Score Factors

### ✅ Authentication (Critical)

- [ ] **SPF Record Configured**
  ```bash
  dig TXT your-domain.com | grep spf
  # Should show: v=spf1 include:_spf.resend.com ~all
  ```

- [ ] **DKIM Record Configured**
  ```bash
  dig TXT default._domainkey.your-domain.com
  # Should return DKIM public key from Resend
  ```

- [ ] **DMARC Record Configured**
  ```bash
  dig TXT _dmarc.your-domain.com
  # Should show: v=DMARC1; p=none; rua=mailto:dmarc@your-domain.com
  ```

- [ ] **From Address Matches Domain**
  - Using: noreply@flipbook-drm.com
  - Domain: flipbook-drm.com
  - ✅ Match!

### ✅ Email Content

- [ ] **Valid HTML Structure**
  - Proper DOCTYPE
  - Closed tags
  - Valid attributes
  - No broken HTML

- [ ] **Plain Text Alternative**
  - Both emails include text version
  - Text version is readable
  - Contains all important information

- [ ] **No Spam Trigger Words**
  - Avoid: FREE, URGENT, ACT NOW, CLICK HERE
  - Avoid: $$$ or excessive punctuation!!!
  - Avoid: ALL CAPS SUBJECT LINES
  - Our emails: ✅ Professional language only

- [ ] **Proper Subject Lines**
  - Verification: "Verify your FlipBook DRM account"
  - Reset: "Reset your FlipBook DRM password"
  - Clear, descriptive, not misleading

- [ ] **Balanced Text-to-Image Ratio**
  - Our emails: ✅ Text-only (no images)
  - Recommended: 60% text, 40% images max

- [ ] **Reasonable Link Count**
  - Verification email: 2 links (button + URL)
  - Reset email: 2 links (button + URL)
  - ✅ Within safe limits (< 5 links)

### ✅ Technical Headers

- [ ] **From Header**
  ```
  From: FlipBook DRM <noreply@flipbook-drm.com>
  ```

- [ ] **Reply-To Header** (Optional)
  - Consider adding: support@flipbook-drm.com

- [ ] **List-Unsubscribe Header** (For marketing only)
  - Not required for transactional emails
  - Our emails: Transactional ✅

- [ ] **Message-ID Header**
  - Automatically added by Resend ✅

### ✅ Content Quality

- [ ] **Personalization**
  - ✅ Uses recipient's name
  - ✅ Relevant content
  - ✅ Not generic spam

- [ ] **Professional Formatting**
  - ✅ Proper spacing
  - ✅ Readable fonts (14px+)
  - ✅ Good color contrast
  - ✅ Mobile responsive

- [ ] **Clear Purpose**
  - ✅ Verification: Verify email
  - ✅ Reset: Reset password
  - ✅ No mixed messages

- [ ] **Security Information**
  - ✅ Expiration times mentioned
  - ✅ Security notices included
  - ✅ What to do if not requested

### ✅ Sender Reputation

- [ ] **Domain Age**
  - Older domains = better reputation
  - New domains: Start with low volume

- [ ] **Sending Volume**
  - Start slow (< 100/day)
  - Gradually increase
  - Monitor bounce rates

- [ ] **Bounce Rate**
  - Target: < 5%
  - Remove invalid addresses
  - Monitor Resend dashboard

- [ ] **Complaint Rate**
  - Target: < 0.1%
  - Honor unsubscribe requests
  - Send only requested emails

- [ ] **Engagement Rate**
  - High open rates = good
  - High click rates = good
  - Our emails: Transactional (high engagement)

## Testing Tools

### Free Tools

1. **Mail Tester**
   - URL: https://www.mail-tester.com/
   - Score: 0-10
   - Target: 8+

2. **MXToolbox**
   - URL: https://mxtoolbox.com/emailhealth/
   - Checks: DNS, blacklists, headers

3. **Google Postmaster Tools**
   - URL: https://postmaster.google.com/
   - Monitor: Gmail delivery, reputation

### Paid Tools

1. **Litmus**
   - URL: https://litmus.com/
   - Features: Spam testing, client previews
   - Cost: $99+/month

2. **Email on Acid**
   - URL: https://www.emailonacid.com/
   - Features: Spam testing, rendering
   - Cost: $99+/month

3. **GlockApps**
   - URL: https://glockapps.com/
   - Features: Deliverability testing
   - Cost: $79+/month

## Testing Procedure

### 1. Initial Setup Test

```bash
# Test DNS configuration
npm run test:email-delivery

# Check Mail Tester score
export TEST_EMAIL=test-xxxxx@mail-tester.com
npm run test:email-delivery
```

### 2. Multi-Client Test

Send test emails to:
- [ ] Gmail
- [ ] Outlook
- [ ] Yahoo Mail
- [ ] Apple Mail
- [ ] ProtonMail

Check:
- [ ] Delivered to inbox (not spam)
- [ ] Renders correctly
- [ ] Links work
- [ ] Images load (if any)

### 3. Spam Filter Test

Test with different email providers:
- [ ] Gmail spam filter
- [ ] Outlook spam filter
- [ ] Yahoo spam filter
- [ ] Corporate spam filters

### 4. Content Test

Verify email content:
- [ ] Subject line not truncated
- [ ] Preheader text displays
- [ ] Body text readable
- [ ] Buttons clickable
- [ ] Links work correctly

## Common Issues and Fixes

### Issue: Low Spam Score (< 7/10)

**Possible Causes:**
- Missing DNS records
- Invalid HTML
- Spam trigger words
- Poor sender reputation

**Fixes:**
1. Configure SPF, DKIM, DMARC
2. Validate HTML structure
3. Review content for spam words
4. Warm up domain gradually

### Issue: Emails Going to Spam

**Possible Causes:**
- New domain
- High bounce rate
- Spam complaints
- Poor engagement

**Fixes:**
1. Start with low volume
2. Remove invalid addresses
3. Only send requested emails
4. Improve email content

### Issue: High Bounce Rate

**Possible Causes:**
- Invalid email addresses
- Typos in addresses
- Inactive accounts

**Fixes:**
1. Validate email format
2. Use double opt-in
3. Remove bounced addresses
4. Monitor Resend dashboard

### Issue: Poor Engagement

**Possible Causes:**
- Unclear subject lines
- Poor email design
- Not mobile-friendly
- Slow loading

**Fixes:**
1. Improve subject lines
2. Optimize email design
3. Test mobile rendering
4. Reduce email size

## Monitoring

### Daily Checks

- [ ] Check Resend dashboard
- [ ] Review bounce rates
- [ ] Check complaint rates
- [ ] Monitor delivery rates

### Weekly Checks

- [ ] Review engagement metrics
- [ ] Check blacklist status
- [ ] Analyze delivery trends
- [ ] Review user feedback

### Monthly Checks

- [ ] Run full spam score test
- [ ] Review sender reputation
- [ ] Update DNS records if needed
- [ ] Optimize email content

## Best Practices

### Do's ✅

- ✅ Use authenticated domain
- ✅ Send only requested emails
- ✅ Include plain text version
- ✅ Use clear subject lines
- ✅ Personalize content
- ✅ Include unsubscribe (marketing)
- ✅ Monitor metrics
- ✅ Test before sending
- ✅ Warm up new domains
- ✅ Honor bounces/complaints

### Don'ts ❌

- ❌ Use free email domains
- ❌ Send unsolicited emails
- ❌ Use spam trigger words
- ❌ Use misleading subjects
- ❌ Send from unverified domain
- ❌ Ignore bounce rates
- ❌ Buy email lists
- ❌ Send too frequently
- ❌ Use all caps
- ❌ Include too many links

## Current Status

### FlipBook DRM Email Configuration

**Strengths:**
- ✅ Transactional emails (high trust)
- ✅ Clear, professional content
- ✅ Proper HTML structure
- ✅ Plain text alternatives
- ✅ Security notices included
- ✅ Reasonable link count
- ✅ Mobile responsive
- ✅ Personalized content

**Areas to Monitor:**
- ⚠️ Domain reputation (new domain)
- ⚠️ Sending volume (start low)
- ⚠️ Bounce rates (monitor)
- ⚠️ User engagement (track)

**Action Items:**
1. Configure DNS records (SPF, DKIM, DMARC)
2. Test with Mail Tester (target 8+)
3. Start with low sending volume
4. Monitor Resend dashboard daily
5. Track bounce and complaint rates
6. Gradually increase volume

## Resources

- [Resend Best Practices](https://resend.com/docs/best-practices)
- [Email Deliverability Guide](https://www.mailgun.com/blog/email-deliverability-guide/)
- [SPF, DKIM, DMARC Setup](https://www.cloudflare.com/learning/email-security/dmarc-dkim-spf/)
- [Email Design Best Practices](https://www.campaignmonitor.com/resources/guides/email-design/)
- [Avoiding Spam Filters](https://sendgrid.com/blog/avoiding-spam-filters/)

---

**Last Updated:** November 2025
**Next Review:** Monthly
