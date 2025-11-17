# jstudyroom Platform - Production Deployment Guide

This guide provides step-by-step instructions for deploying the jstudyroom platform to production.

## Table of Contents

1. [Pre-Deployment Preparation](#pre-deployment-preparation)
2. [Database Migration](#database-migration)
3. [Application Deployment](#application-deployment)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Preparation

### 1. Verify All Environment Variables

Ensure all required environment variables are set in Vercel:

```bash
# Database
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://jstudyroom.com
NEXT_PUBLIC_APP_URL=https://jstudyroom.com

# Email Service
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=support@jstudyroom.dev

# Payment Gateway
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Admin & Security
ADMIN_SEED_PASSWORD=<secure-password>
CRON_SECRET=<generated-secret>
```

### 2. Verify External Services

#### Resend (Email Service)
- [ ] Domain verified: jstudyroom.dev
- [ ] DNS records configured (SPF, DKIM, DMARC)
- [ ] Test email sent successfully
- [ ] FROM address: support@jstudyroom.dev

#### Razorpay (Payment Gateway)
- [ ] Production account activated
- [ ] API keys generated (live mode)
- [ ] Test payment completed in live mode
- [ ] Webhook configured (if using)

#### Supabase (Database & Storage)
- [ ] Production project created
- [ ] Database accessible
- [ ] Storage bucket created
- [ ] Storage policies configured
- [ ] Connection pooling enabled

### 3. Code Preparation

```bash
# Ensure you're on the main branch
git checkout main

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run tests
npm run test

# Build locally to check for errors
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint
```

### 4. Create Backup

```bash
# Backup current production database (if applicable)
# From Supabase dashboard:
# 1. Go to Database > Backups
# 2. Click "Create Backup"
# 3. Wait for completion
# 4. Download backup file

# Document current state
# - Current version/commit
# - Database schema version
# - Number of users
# - Number of documents
```

---

## Database Migration

### Step 1: Review Migrations

```bash
# List all pending migrations
npx prisma migrate status

# Review migration files
ls -la prisma/migrations/

# Check migration SQL
cat prisma/migrations/<latest-migration>/migration.sql
```

### Step 2: Test Migrations in Staging

```bash
# Set staging database URL
export DATABASE_URL="<staging-database-url>"
export DIRECT_URL="<staging-direct-url>"

# Run migrations
npx prisma migrate deploy

# Verify schema
npx prisma db pull

# Test application with staging database
npm run dev

# Run tests against staging
npm run test
```

### Step 3: Deploy Migrations to Production

```bash
# Set production database URL
export DATABASE_URL="<production-database-url>"
export DIRECT_URL="<production-direct-url>"

# Deploy migrations
npx prisma migrate deploy

# Expected output:
# ✓ Migration <name> applied successfully
# ✓ All migrations have been applied

# Verify schema
npx prisma db pull

# Check database
npx prisma studio
```

### Step 4: Run Seed Scripts

```bash
# Seed admin account (if not exists)
npx tsx prisma/seed-admin.ts

# Expected output:
# ✓ Admin user created: sivaramj83@gmail.com
# Or: Admin user already exists

# Seed Book Shop (optional)
npx tsx prisma/seed-bookshop.ts

# Expected output:
# ✓ Created X Book Shop items
```

### Step 5: Verify Database State

```bash
# Open Prisma Studio
npx prisma studio

# Verify:
# - All tables exist
# - Admin user exists
# - Book Shop items exist (if seeded)
# - Indexes are created
# - Foreign keys are set up
```

---

## Application Deployment

### Step 1: Commit and Push

```bash
# Ensure all changes are committed
git status

# If there are uncommitted changes
git add .
git commit -m "Deploy jstudyroom platform v1.0"

# Push to main branch
git push origin main
```

### Step 2: Monitor Vercel Deployment

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com
   - Navigate to your project
   - Go to "Deployments" tab

2. **Watch Deployment Progress**
   - Deployment starts automatically on push
   - Monitor build logs
   - Check for any errors
   - Wait for "Ready" status

3. **Deployment Stages**
   - Building (2-5 minutes)
   - Deploying (1-2 minutes)
   - Ready (deployment complete)

### Step 3: Check Deployment Logs

```bash
# In Vercel dashboard:
# 1. Click on the deployment
# 2. View "Build Logs"
# 3. Check for errors or warnings
# 4. Verify all pages built successfully
```

### Step 4: Verify Deployment URL

```bash
# Visit production URL
https://jstudyroom.com

# Check deployment details in Vercel:
# - Deployment URL
# - Build time
# - Commit hash
# - Environment variables loaded
```

---

## Post-Deployment Verification

### Immediate Verification (Within 5 Minutes)

#### 1. Basic Functionality

```bash
# Test homepage
curl -I https://jstudyroom.com
# Expected: 200 OK

# Test API health
curl https://jstudyroom.com/api/health
# Expected: {"status":"ok"}
```

#### 2. Member Registration Flow

1. [ ] Visit homepage
2. [ ] Click "Become a Member"
3. [ ] Fill registration form:
   - Email: test@example.com
   - Password: TestPassword123!
   - Name: Test User
4. [ ] Submit form
5. [ ] Check for success message
6. [ ] Check email inbox for verification email
7. [ ] Click verification link
8. [ ] Verify redirect to login
9. [ ] Login with credentials
10. [ ] Verify redirect to Member dashboard

#### 3. Book Shop

1. [ ] Navigate to Book Shop
2. [ ] Verify items are displayed
3. [ ] Test category filter
4. [ ] Test search functionality
5. [ ] Click on a free item
6. [ ] Add to My jstudyroom
7. [ ] Verify success message
8. [ ] Check My jstudyroom for item

#### 4. Payment Flow

1. [ ] Navigate to Book Shop
2. [ ] Click on a paid item
3. [ ] Verify payment modal opens
4. [ ] Complete test payment (use Razorpay test card)
5. [ ] Verify payment success
6. [ ] Check My jstudyroom for item
7. [ ] Check email for purchase confirmation
8. [ ] Verify in admin Payments section

#### 5. Admin Dashboard

1. [ ] Login as admin (sivaramj83@gmail.com)
2. [ ] Verify redirect to /admin
3. [ ] Check Access Requests section
4. [ ] Check Users section
5. [ ] Check Book Shop section
6. [ ] Check Members section
7. [ ] Check Payments section
8. [ ] Verify all data loads correctly

#### 6. Platform User Features

1. [ ] Login as Platform User (if exists)
2. [ ] Upload a test document
3. [ ] Share document via link
4. [ ] Share document via email
5. [ ] Check analytics
6. [ ] Verify inbox shows shared documents

### Comprehensive Verification (Within 1 Hour)

#### 1. Email Delivery

Test all email types:

- [ ] Member verification email
- [ ] Password reset email
- [ ] Purchase confirmation email
- [ ] Share notification email (if implemented)
- [ ] Access request notification
- [ ] User approval email

Check:
- [ ] Emails arrive within 1 minute
- [ ] Emails not in spam
- [ ] Links work correctly
- [ ] Formatting is correct
- [ ] FROM address is support@jstudyroom.dev

#### 2. Payment Processing

Test payment scenarios:

- [ ] Successful payment
- [ ] Failed payment (invalid card)
- [ ] Payment with limit reached
- [ ] Payment verification
- [ ] Document addition after payment
- [ ] Email confirmation sent
- [ ] Payment appears in admin dashboard

#### 3. Share Access Control

Test share scenarios:

- [ ] Share to specific email
- [ ] Access with correct email
- [ ] Access denied with wrong email
- [ ] Access without login (redirect)
- [ ] Expired share
- [ ] Revoked share

#### 4. My jstudyroom Limits

Test document limits:

- [ ] Add 5 free documents
- [ ] Try to add 6th free document (should fail)
- [ ] Add 5 paid documents
- [ ] Try to add 6th paid document (should fail)
- [ ] Try to add 11th document total (should fail)
- [ ] Return a document
- [ ] Add another document (should work)

#### 5. Role-Based Access

Test role restrictions:

- [ ] Member cannot access /admin
- [ ] Member cannot access /dashboard
- [ ] Platform User cannot access /member
- [ ] Platform User cannot access /admin
- [ ] Admin can access all sections
- [ ] Unauthenticated user redirected to login

#### 6. Theme Toggle

- [ ] Toggle to dark mode
- [ ] Verify all pages use dark theme
- [ ] Toggle to light mode
- [ ] Verify theme persists after refresh
- [ ] Check theme on all dashboards

### Performance Verification

#### 1. Page Load Times

Test with browser DevTools:

- [ ] Homepage: < 3 seconds
- [ ] Member dashboard: < 2 seconds
- [ ] Book Shop: < 2 seconds
- [ ] My jstudyroom: < 2 seconds
- [ ] Admin dashboard: < 2 seconds
- [ ] Document viewer: < 3 seconds

#### 2. API Response Times

Test with browser Network tab:

- [ ] /api/bookshop: < 1 second
- [ ] /api/member/my-jstudyroom: < 1 second
- [ ] /api/member/shared: < 1 second
- [ ] /api/admin/members: < 1 second
- [ ] /api/admin/payments: < 1 second

#### 3. Database Performance

Check in Supabase dashboard:

- [ ] Query response times < 100ms
- [ ] Connection pool usage < 50%
- [ ] No slow queries
- [ ] Indexes being used

---

## Monitoring

### Immediate Monitoring (First Hour)

#### 1. Error Logs

```bash
# In Vercel dashboard:
# 1. Go to "Logs" tab
# 2. Filter by "Errors"
# 3. Monitor for any 500 errors
# 4. Check error frequency
```

#### 2. Application Metrics

Monitor in Vercel:
- [ ] Request count
- [ ] Error rate (should be < 1%)
- [ ] Response time (should be < 2s)
- [ ] Build time

#### 3. Database Metrics

Monitor in Supabase:
- [ ] Active connections
- [ ] Query performance
- [ ] Storage usage
- [ ] API requests

#### 4. Email Delivery

Monitor in Resend:
- [ ] Emails sent
- [ ] Delivery rate (should be > 95%)
- [ ] Bounce rate (should be < 5%)
- [ ] Spam complaints (should be 0)

#### 5. Payment Processing

Monitor in Razorpay:
- [ ] Payment attempts
- [ ] Success rate (should be > 90%)
- [ ] Failed payments
- [ ] Average transaction value

### Ongoing Monitoring (First 24 Hours)

#### Hourly Checks

- [ ] Error logs (check for new errors)
- [ ] User registrations (track growth)
- [ ] Payment transactions (verify processing)
- [ ] Email delivery (check delivery rate)
- [ ] Database performance (check slow queries)

#### Key Metrics to Track

1. **User Metrics**
   - New Member registrations
   - Email verification rate
   - Login success rate
   - Active users

2. **Book Shop Metrics**
   - Catalog views
   - Items added to My jstudyroom
   - Free vs paid document ratio
   - Popular categories

3. **Payment Metrics**
   - Payment attempts
   - Payment success rate
   - Average transaction value
   - Revenue

4. **Technical Metrics**
   - Error rate
   - Response times
   - Database query performance
   - Storage usage

### Alerts to Configure

Set up alerts for:

- [ ] Error rate > 5%
- [ ] Response time > 5 seconds
- [ ] Payment success rate < 80%
- [ ] Email delivery rate < 90%
- [ ] Database connection errors
- [ ] Storage usage > 80%

---

## Troubleshooting

### Common Issues

#### 1. Deployment Failed

**Symptoms:**
- Build fails in Vercel
- Deployment shows "Error"

**Solutions:**
1. Check build logs for errors
2. Verify all dependencies installed
3. Check TypeScript errors
4. Verify environment variables set
5. Try deploying again

#### 2. Database Connection Error

**Symptoms:**
- 500 errors on API calls
- "Cannot connect to database"

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check Supabase database is running
3. Verify connection pooling enabled
4. Check database credentials
5. Test connection with Prisma Studio

#### 3. Emails Not Sending

**Symptoms:**
- Verification emails not received
- No emails in Resend dashboard

**Solutions:**
1. Verify RESEND_API_KEY is set
2. Check RESEND_FROM_EMAIL is correct
3. Verify domain is verified in Resend
4. Check Resend dashboard for errors
5. Test email delivery manually

#### 4. Payments Failing

**Symptoms:**
- All payments fail
- Payment modal doesn't open

**Solutions:**
1. Verify Razorpay keys are correct (live mode)
2. Check NEXT_PUBLIC_RAZORPAY_KEY_ID is set
3. Verify Razorpay account is active
4. Test with Razorpay test card
5. Check Razorpay dashboard for errors

#### 5. Members Cannot Login

**Symptoms:**
- Login fails with correct credentials
- Redirected back to login

**Solutions:**
1. Verify NEXTAUTH_SECRET is set
2. Check NEXTAUTH_URL matches production URL
3. Verify database connection
4. Check if user exists in database
5. Try password reset

### Emergency Rollback

If critical issues occur:

1. **Immediate Rollback**
   ```bash
   # In Vercel dashboard:
   # 1. Go to Deployments
   # 2. Find previous stable deployment
   # 3. Click "Promote to Production"
   ```

2. **Notify Users**
   - Post status update
   - Send email if needed
   - Update social media

3. **Fix Issues**
   - Identify root cause
   - Fix in development
   - Test thoroughly
   - Redeploy

See [JSTUDYROOM_ROLLBACK_STRATEGY.md](./JSTUDYROOM_ROLLBACK_STRATEGY.md) for detailed rollback procedures.

---

## Post-Deployment Checklist

### Immediate (Within 1 Hour)

- [ ] All verification tests passed
- [ ] No critical errors in logs
- [ ] Email delivery working
- [ ] Payment processing working
- [ ] Database connections stable
- [ ] All dashboards accessible
- [ ] Theme toggle working

### First 24 Hours

- [ ] Monitor error logs
- [ ] Track user registrations
- [ ] Monitor payment success rate
- [ ] Check email delivery rate
- [ ] Review user feedback
- [ ] Respond to support requests
- [ ] Update documentation if needed

### First Week

- [ ] Analyze user behavior
- [ ] Review Book Shop performance
- [ ] Check payment conversion rate
- [ ] Monitor document limits
- [ ] Optimize slow queries
- [ ] Plan feature improvements
- [ ] Conduct team retrospective

---

## Success Criteria

Deployment is considered successful when:

- [ ] All critical flows work correctly
- [ ] Error rate < 1%
- [ ] Payment success rate > 90%
- [ ] Email delivery rate > 95%
- [ ] Page load times < 3 seconds
- [ ] No data loss or corruption
- [ ] All user roles function correctly
- [ ] No security vulnerabilities
- [ ] Monitoring and alerts active
- [ ] Team confident in deployment

---

## Support Contacts

- **Admin**: sivaramj83@gmail.com
- **Support**: support@jstudyroom.dev
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Resend Support**: https://resend.com/support
- **Razorpay Support**: https://razorpay.com/support

---

**Deployment Date**: ___________________  
**Deployed By**: ___________________  
**Version**: 1.0  
**Commit Hash**: ___________________  

---

**Last Updated:** November 2025  
**Version:** 1.0 (jstudyroom Platform)
