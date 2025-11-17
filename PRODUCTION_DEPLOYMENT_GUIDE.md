# Production Deployment Guide - Admin-Managed Access Control

This guide provides step-by-step instructions for deploying the admin-managed access control system to production.

## Prerequisites

Before starting deployment:

- ✅ All code changes committed to Git
- ✅ Supabase project created and configured
- ✅ Resend account created with verified domain
- ✅ Vercel account connected to GitHub repository
- ✅ All environment variables prepared
- ✅ Admin password chosen (secure, 16+ characters)

---

## Step 1: Verify Local Setup

Before deploying to production, ensure everything works locally.

### 1.1 Install Dependencies

```bash
npm install
```

### 1.2 Configure Local Environment

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your values
# IMPORTANT: Set ADMIN_SEED_PASSWORD
```

### 1.3 Generate Prisma Client

```bash
npx prisma generate
```

### 1.4 Push Database Schema

```bash
npx prisma db push
```

### 1.5 Create Admin Account Locally

```bash
npx tsx prisma/seed-admin.ts
```

Expected output:
```
✅ Admin user created successfully
Email: sivaramj83@gmail.com
Role: ADMIN
```

### 1.6 Update Existing Users (if applicable)

```bash
npx tsx prisma/update-existing-users.ts
```

### 1.7 Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000` and verify:
- Landing page displays correctly
- Access request form works
- Admin can log in at `/login`
- Admin dashboard accessible at `/admin`
- Can approve access requests
- Emails are sent (check Resend dashboard)

---

## Step 2: Prepare Production Environment

### 2.1 Set Up Supabase for Production

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create new one for production)
3. Navigate to **Settings** → **Database**
4. Copy connection strings:
   - **Connection pooling** (for DATABASE_URL)
   - **Direct connection** (for DIRECT_URL)
5. Navigate to **Settings** → **API**
6. Copy API keys:
   - Project URL
   - Anon/Public key
   - Service role key

### 2.2 Configure Resend for Production

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add domain: `jstudyroom.dev`
3. Configure DNS records (in your domain registrar):

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record:**
```
Type: TXT
Name: resend._domainkey
Value: [Copy from Resend dashboard]
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:support@jstudyroom.dev
```

4. Wait for DNS propagation (can take up to 48 hours)
5. Verify domain in Resend dashboard
6. Generate production API key

### 2.3 Generate Secrets

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate Cron secret
openssl rand -hex 32

# Choose secure admin password (16+ characters)
# Use password manager to generate and store
```

---

## Step 3: Configure Vercel

### 3.1 Connect Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### 3.2 Configure Build Settings

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 3.3 Add Environment Variables

Go to **Settings** → **Environment Variables** and add:

#### Database Variables
```
DATABASE_URL=postgresql://user:password@host:5432/database?pgbouncer=true
DIRECT_URL=postgresql://user:password@host:5432/database
```

#### NextAuth Variables
```
NEXTAUTH_SECRET=[generated-secret-from-step-2.3]
NEXTAUTH_URL=https://your-domain.vercel.app
```

#### Admin Variables
```
ADMIN_SEED_PASSWORD=[your-secure-admin-password]
```

#### Resend Variables
```
RESEND_API_KEY=[your-production-api-key]
RESEND_FROM_EMAIL=support@jstudyroom.dev
```

#### Supabase Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

#### Cron Variables
```
CRON_SECRET=[generated-secret-from-step-2.3]
```

#### Razorpay Variables (Optional)
```
RAZORPAY_KEY_ID=[your-razorpay-key]
RAZORPAY_KEY_SECRET=[your-razorpay-secret]
NEXT_PUBLIC_RAZORPAY_KEY_ID=[your-razorpay-key]
```

#### App URL
```
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Important:** Set all variables for **Production** environment.

---

## Step 4: Deploy to Production

### 4.1 Commit and Push Code

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Deploy admin-managed access control system"

# Push to main branch
git push origin main
```

### 4.2 Trigger Deployment

Vercel will automatically deploy when you push to main branch.

Alternatively, deploy manually:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### 4.3 Monitor Deployment

1. Go to Vercel Dashboard → Your Project → Deployments
2. Watch the build logs
3. Wait for "Ready" status
4. Note the production URL

---

## Step 5: Run Database Migrations

### 5.1 Pull Production Environment Variables

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Pull production environment variables
vercel env pull .env.production
```

### 5.2 Run Migrations

```bash
# Apply migrations to production database
npx prisma migrate deploy

# Or if using db push
npx prisma db push
```

Expected output:
```
✅ Migrations applied successfully
```

### 5.3 Verify Schema

```bash
# Open Prisma Studio connected to production
npx prisma studio
```

Verify:
- User table has `role`, `pricePlan`, `notes`, `isActive` columns
- UserRole enum exists with ADMIN, PLATFORM_USER, READER_USER
- AccessRequest table exists with all required fields

---

## Step 6: Create Admin Account

### 6.1 Run Seed Script

```bash
# Ensure you have production environment variables
vercel env pull .env.production

# Run admin seed script
npx tsx prisma/seed-admin.ts
```

Expected output:
```
✅ Admin user created successfully
Email: sivaramj83@gmail.com
Role: ADMIN
```

If admin already exists:
```
ℹ️ Admin user already exists, skipping creation
```

### 6.2 Verify Admin Account

```bash
# Open Prisma Studio
npx prisma studio
```

1. Navigate to **User** table
2. Find user with email `sivaramj83@gmail.com`
3. Verify:
   - `role` = `ADMIN`
   - `passwordHash` is set
   - `isActive` = `true`

---

## Step 7: Migrate Existing Users (If Applicable)

If you have existing users from before the admin-managed access system:

### 7.1 Run Migration Script

```bash
# Ensure you have production environment variables
vercel env pull .env.production

# Run user migration script
npx tsx prisma/update-existing-users.ts
```

Expected output:
```
✅ Updated X users to PLATFORM_USER role
```

### 7.2 Verify Users

```bash
# Open Prisma Studio
npx prisma studio
```

1. Navigate to **User** table
2. Verify all users have a `role` assigned
3. Verify no users have `null` role

---

## Step 8: Verify Production Deployment

### 8.1 Test Landing Page

1. Visit your production URL
2. Verify landing page displays correctly
3. Check for any console errors (F12)

### 8.2 Test Access Request Submission

1. Fill out access request form
2. Submit request
3. Verify confirmation message
4. Check admin email (sivaramj83@gmail.com) for notification
5. Check support@jstudyroom.dev for notification

### 8.3 Test Admin Login

1. Navigate to `/login`
2. Enter admin credentials:
   - Email: `sivaramj83@gmail.com`
   - Password: [your ADMIN_SEED_PASSWORD]
3. Verify redirect to `/admin`
4. Verify admin dashboard loads

### 8.4 Test Access Request Management

1. In admin dashboard, click **"Access Requests"**
2. Verify the test request appears
3. Click on the request to view details
4. Click **"Approve & Create User"**
5. Fill in user details:
   - Role: PLATFORM_USER
   - Generate password
   - Add price plan
6. Click **"Create User"**
7. Verify success message
8. Copy the generated password

### 8.5 Test User Approval Email

1. Check the email address you used in the test request
2. Verify approval email was received
3. Check email contains:
   - Login credentials
   - Role information
   - Pricing details
   - Login URL

### 8.6 Test User Login

1. Log out from admin account
2. Navigate to `/login`
3. Enter new user credentials
4. Verify redirect to `/dashboard` (for PLATFORM_USER)
5. Verify dashboard loads correctly

### 8.7 Test Role-Based Features

**For PLATFORM_USER:**
- Verify can see upload button
- Test document upload
- Test document sharing
- Verify cannot access `/admin`

**For READER_USER (create one):**
- Verify redirected to `/reader`
- Verify cannot see upload features
- Verify can only view shared documents
- Verify cannot access `/admin`

### 8.8 Test Password Reset

1. In admin dashboard, go to **"Users"**
2. Find a user
3. Click **"Reset Password"**
4. Verify new password generated
5. Verify email sent to user
6. Test login with new password

---

## Step 9: Monitor Production

### 9.1 Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Monitor for errors
3. Filter by:
   - Time range: Last 1 hour
   - Status: Errors only

### 9.2 Check Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/emails)
2. Verify emails are being delivered
3. Check delivery rate
4. Look for any bounces or failures

### 9.3 Check Supabase Metrics

1. Go to Supabase Dashboard → Your Project
2. Navigate to **Database** → **Metrics**
3. Monitor:
   - Connection count
   - Query performance
   - Error rate

### 9.4 Set Up Monitoring Alerts

**Vercel:**
- Enable deployment notifications
- Set up error alerts

**Resend:**
- Monitor email delivery rate
- Set up bounce notifications

**Supabase:**
- Monitor database performance
- Set up connection alerts

---

## Step 10: Post-Deployment Tasks

### 10.1 Update Documentation

- [ ] Update README with production URL
- [ ] Document any production-specific configurations
- [ ] Update admin user guide if needed

### 10.2 Communicate with Stakeholders

- [ ] Notify admin (sivaramj83@gmail.com) that system is live
- [ ] Provide admin credentials securely
- [ ] Share admin user guide
- [ ] Provide support contact information

### 10.3 Create Backup Plan

- [ ] Document rollback procedure
- [ ] Set up database backups in Supabase
- [ ] Test backup restoration process
- [ ] Document emergency contacts

### 10.4 Security Review

- [ ] Verify all admin routes are protected
- [ ] Check that registration is disabled
- [ ] Verify rate limiting is active
- [ ] Review audit logs
- [ ] Check for any exposed secrets

---

## Troubleshooting Deployment Issues

### Issue: Build Fails on Vercel

**Check:**
- Build logs in Vercel dashboard
- TypeScript errors
- Missing dependencies
- Environment variables

**Solution:**
```bash
# Test build locally
npm run build

# Fix any errors
# Commit and push
git add .
git commit -m "Fix build errors"
git push origin main
```

### Issue: Admin Cannot Log In

**Check:**
- Admin account exists in database
- ADMIN_SEED_PASSWORD is set correctly
- Password matches what was used in seed script

**Solution:**
```bash
# Re-run seed script
vercel env pull .env.production
npx tsx prisma/seed-admin.ts

# Or manually reset password in Prisma Studio
```

### Issue: Emails Not Sending

**Check:**
- RESEND_API_KEY is set in Vercel
- RESEND_FROM_EMAIL is support@jstudyroom.dev
- Domain is verified in Resend
- Check Resend dashboard for errors

**Solution:**
```bash
# Test email locally
npx tsx scripts/test-email-delivery.ts

# Check Resend logs
# Visit: https://resend.com/emails
```

### Issue: Database Connection Fails

**Check:**
- DATABASE_URL is correct
- Supabase project is running
- Connection pooling is enabled
- Firewall rules allow connections

**Solution:**
```bash
# Test connection
npx prisma studio

# Verify connection string
echo $DATABASE_URL
```

### Issue: 403 Errors on Admin Routes

**Check:**
- User role is ADMIN in database
- JWT token includes role
- Middleware is working

**Solution:**
```bash
# Verify role in database
npx prisma studio
# Check User table, ensure role = ADMIN

# Clear cookies and log in again
```

---

## Rollback Procedure

If critical issues occur after deployment:

### Quick Rollback

1. Go to Vercel Dashboard → Your Project → Deployments
2. Find the previous working deployment
3. Click **"..."** → **"Promote to Production"**
4. Confirm rollback

### Database Rollback

If database migrations need to be reverted:

```bash
# Restore from Supabase backup
# Go to Supabase Dashboard → Database → Backups
# Select backup and restore

# Or manually revert migrations
npx prisma migrate resolve --rolled-back [migration-name]
```

---

## Success Checklist

Deployment is successful when:

- ✅ Production site is accessible
- ✅ Landing page displays correctly
- ✅ Access request form works
- ✅ Admin can log in
- ✅ Admin dashboard is accessible
- ✅ Can approve access requests
- ✅ Can create users
- ✅ Emails are being sent and delivered
- ✅ Users can log in with provided credentials
- ✅ Role-based routing works
- ✅ PLATFORM_USER can upload documents
- ✅ READER_USER has restricted access
- ✅ No errors in production logs
- ✅ All security measures are active

---

## Next Steps

After successful deployment:

1. **Monitor for 24 hours** - Watch logs and metrics closely
2. **Test all features** - Comprehensive testing with real users
3. **Gather feedback** - Collect user feedback on new system
4. **Optimize performance** - Address any performance issues
5. **Update documentation** - Keep docs current with any changes

---

## Support

For deployment issues:
- Check **TROUBLESHOOTING_GUIDE.md**
- Review Vercel logs
- Check Supabase status
- Check Resend status
- Contact development team

---

**Deployment Date:** [To be filled]  
**Deployed By:** [To be filled]  
**Production URL:** [To be filled]  
**Status:** ✅ Deployed Successfully

---

**Last Updated:** November 2025  
**Version:** 1.0
