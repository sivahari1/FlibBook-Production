# FlipBook DRM Documentation

This directory contains comprehensive documentation for the FlipBook DRM application.

## Email Testing Documentation

Complete guides for testing email delivery:

### 📚 Main Guides

1. **[EMAIL_TESTING_SUMMARY.md](EMAIL_TESTING_SUMMARY.md)**
   - Overview of all email testing
   - Test coverage summary
   - Requirements verification
   - Success metrics

2. **[EMAIL_DELIVERY_TESTING.md](EMAIL_DELIVERY_TESTING.md)**
   - Complete testing procedures
   - Development and production testing
   - Email template verification
   - Troubleshooting guide

3. **[SPAM_SCORE_CHECKLIST.md](SPAM_SCORE_CHECKLIST.md)**
   - Comprehensive spam score factors
   - Testing tools and procedures
   - Best practices for deliverability
   - Monitoring guidelines

4. **[PRODUCTION_EMAIL_TEST.md](PRODUCTION_EMAIL_TEST.md)**
   - Quick production testing guide
   - Pre-deployment checklist
   - Monitoring procedures
   - Emergency procedures

## Quick Start

### Run Automated Tests

```bash
npm test
```

### Run Manual Email Testing

```bash
export TEST_EMAIL=your-email@example.com
npm run test:email-delivery
```

### Test Spam Score

1. Visit https://www.mail-tester.com/
2. Get test email address
3. Run: `export TEST_EMAIL=test-xxxxx@mail-tester.com && npm run test:email-delivery`
4. Check score (aim for 8+/10)

## Documentation Structure

```
docs/
├── README.md                      # This file
├── EMAIL_TESTING_SUMMARY.md       # Testing overview
├── EMAIL_DELIVERY_TESTING.md      # Complete testing guide
├── SPAM_SCORE_CHECKLIST.md        # Spam score optimization
└── PRODUCTION_EMAIL_TEST.md       # Production testing guide
```

## Related Documentation

- [EMAIL_VERIFICATION_SETUP.md](../EMAIL_VERIFICATION_SETUP.md) - Setup guide
- [TOKEN_CLEANUP_CRON.md](../TOKEN_CLEANUP_CRON.md) - Cron job documentation
- [USER_GUIDE.md](../USER_GUIDE.md) - User-facing documentation

## Support

For issues or questions:
1. Check the troubleshooting sections in the guides
2. Review application logs
3. Check Resend dashboard
4. Contact Resend support: support@resend.com

---

**Last Updated:** November 2025
