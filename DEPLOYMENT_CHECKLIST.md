# Deployment Checklist - Admin-Managed Access Control

This checklist ensures all components are properly configured before deploying the admin-managed access control system to production.

## Pre-Deployment Checklist

### 1. Environment Variables

#### Required Variables

- [ ] `DATABASE_URL` - Supabase connection pooling URL
- [ ] `DIRECT_URL` - Supabase direct connection URL (for migrations)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `NEXTAUTH_URL` - Production URL (e.g., https://your-domain.com)
- [ ] `NEXTAUTH_SECRET` - Secure random string (generate with `openssl rand -base64 32`)
- [ ] `ADMIN_SEED_PASSWORD` - **CRITICAL** - Secure password for admin account
- [ ] `RESEND_API_KEY` - Resend API key for email service
- [ ] `RESEND_FROM_EMAIL` - Must be `support@jstudyroom.dev`
- [ ] `CRON_SECRET` - Secure random string for cron jobs (generate with `openssl rand -hex 32`)
- [ ] `RAZORPAY_KEY_ID` - Razorpay API key
- [ ] `RAZORPAY_KEY_SECRET` - Razorpay secret key
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Razorpay public key

#### Verify Environment Variables

```bash
# Local verification
cat .env.local | grep -E "ADMIN_SEED_PASSWORD|RESEND_FROM_EMAIL|NEXTAUTH_SECRET"

# Production verification (Vercel)
# Go to: Vercel Dashboard → Project → Settings → Environment Variables
# Verify all variables are set for Production environment
```

### 2. Resend Email Configuration

- [ ] Resend account created
- [ ] API key generated and added to environment variables
- [ ] Domain `jstudyroom.dev` added to Resend
- [ ] DNS records configured:
  - [ ] SPF record added
  - [ ] DKIM record added
  - [ ] DMARC record added
- [ ] Domain verified in Resend dashboard
- [ ] Test email sent successfully
- [ ] `RESEND_FROM_EMAIL` set to `support@jstudyroom.dev`

#### Verify Resend Configuration

```bash
# Test email delivery
npx tsx scripts/test-email-delivery.ts

# Check DNS records
nslookup -type=TXT jstudyroom.dev
nslookup -type=TXT _dmarc.jstudyroom.dev

# Verify in Resend dashboard
# Visit: https://resend.com/domains
# Ensure domain shows "Verified" status
```

### 3. Database Migration Plan

- [ ] Review current database schema
- [ ] Backup production database (if exists)
- [ ] Review migration files in `prisma/migrations/`
- [ ] Test migrations on staging database
- [ ] Verify no data loss will occur
- [ ] Plan for rollback if needed

#### Database Migration Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes (development)
npx prisma db push

# Or apply migrations (production)
npx prisma migrate deploy

# Verify schema
npx prisma studio
```

### 4. Admin Account Setup

- [ ] `ADMIN_SEED_PASSWORD` environment variable set
- [ ] Password is strong and secure (16+ characters)
- [ ] Password stored securely (password manager)
- [ ] Seed script tested locally
- [ ] Plan to run seed script in production

#### Admin Seed Commands

```bash
# Run locally first to test
npx tsx prisma/seed-admin.ts

# Verify admin account created
npx prisma studio
# Check User table for sivaramj83@gmail.com with role ADMIN

# In production, run after deployment:
# Option 1: Via Vercel CLI
vercel env pull
npx tsx prisma/seed-admin.ts

# Option 2: Add to package.json (runs automatically)
# "postbuild": "npx tsx prisma/seed-admin.ts"
```

### 5. Existing Users Migration

- [ ] Review existing users in database
- [ ] Plan role assignment for existing users
- [ ] Test migration script locally
- [ ] Backup user data before migration
- [ ] Plan to run migration script in production

#### User Migration Commands

```bash
# Run locally first to test
npx tsx prisma/update-existing-users.ts

# Verify users updated
npx prisma studio
# Check User table - all users should have role set

# In production, run after deployment
vercel env pull
npx tsx prisma/update-existing-users.ts
```

### 6. Code Review

- [ ] All admin routes protected with role checks
- [ ] All admin API endpoints verify ADMIN role
- [ ] Document upload APIs check for PLATFORM_USER or ADMIN
- [ ] Reader users cannot access upload features
- [ ] Registration page disabled or redirects
- [ ] Landing page displays correctly
- [ ] Access request form works
- [ ] Email templates render correctly
- [ ] Password generation is secure
- [ ] Rate limiting configured
- [ ] Audit logging implemented

### 7. Testing

- [ ] Test access request submission
- [ ] Test admin login
- [ ] Test admin dashboard access
- [ ] Test access request approval workflow
- [ ] Test user creation
- [ ] Test email notifications
- [ ] Test password reset
- [ ] Test role-based routing
- [ ] Test PLATFORM_USER features
- [ ] Test READER_USER restrictions
- [ ] Test all three user roles end-to-end

### 8. Security Review

- [ ] All passwords hashed with bcrypt
- [ ] No plain passwords in logs
- [ ] JWT tokens include role
- [ ] Session cookies are HTTP-only
- [ ] HTTPS enforced in production
- [ ] Rate limiting on access request endpoint
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all forms
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (React)
- [ ] CSRF protection (NextAuth)
- [ ] Admin actions logged

---

## Deployment Steps

### Step 1: Prepare Codebase

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Deploy admin-managed access control"

# Push to main branch
git push origin main
```

### Step 2: Configure Vercel Environment Variables

1. Go to Vercel Dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add all required variables (see checklist above)
5. Ensure variables are set for "Production" environment
6. **Critical:** Set `ADMIN_SEED_PASSWORD` to a secure password

### Step 3: Deploy to Vercel

```bash
# Option 1: Automatic deployment (if connected to GitHub)
# Push to main branch triggers automatic deployment

# Option 2: Manual deployment via CLI
vercel --prod

# Wait for deployment to complete
# Note the deployment URL
```

### Step 4: Run Database Migrations

```bash
# Pull production environment variables
vercel env pull .env.production

# Run migrations
DATABASE_URL="your-production-url" npx prisma migrate deploy

# Or if using db push
DATABASE_URL="your-production-url" npx prisma db push
```

### Step 5: Create Admin Account

```bash
# Option 1: Run seed script manually
vercel env pull .env.production
npx tsx prisma/seed-admin.ts

# Option 2: If added to postbuild, it runs automatically during deployment

# Verify admin account exists
DATABASE_URL="your-production-url" npx prisma studio
# Check for sivaramj83@gmail.com with ADMIN role
```

### Step 6: Migrate Existing Users

```bash
# Only if you have existing users
vercel env pull .env.production
npx tsx prisma/update-existing-users.ts

# Verify all users have roles assigned
DATABASE_URL="your-production-url" npx prisma studio
```

### Step 7: Verify Deployment

- [ ] Visit production URL
- [ ] Landing page loads correctly
- [ ] Access request form is visible
- [ ] Submit test access request
- [ ] Check admin email for notification
- [ ] Login as admin at `/login`
- [ ] Access admin dashboard at `/admin`
- [ ] View access requests
- [ ] Approve test request and create user
- [ ] Check user email for approval notification
- [ ] Login as new user
- [ ] Verify role-based routing works
- [ ] Test document upload (if PLATFORM_USER)
- [ ] Test reader restrictions (if READER_USER)

---

## Post-Deployment Verification

### Immediate Checks (First 30 minutes)

- [ ] Admin can log in successfully
- [ ] Admin dashboard loads without errors
- [ ] Access requests are visible
- [ ] Can create new users
- [ ] Emails are being sent
- [ ] No errors in Vercel logs
- [ ] No errors in browser console
- [ ] All three user roles work correctly

### Short-term Monitoring (First 24 hours)

- [ ] Monitor Vercel logs for errors
- [ ] Check Resend dashboard for email delivery
- [ ] Monitor Supabase for database issues
- [ ] Check for any 403/401 errors
- [ ] Verify rate limiting is working
- [ ] Check audit logs for admin actions
- [ ] Monitor for any user-reported issues

### Long-term Monitoring (First Week)

- [ ] Review access request volume
- [ ] Check email deliverability rate
- [ ] Monitor database performance
- [ ] Review user feedback
- [ ] Check for any security issues
- [ ] Verify all features working as expected

---

## Rollback Plan

If critical issues are discovered after deployment:

### Quick Rollback (Vercel)

```bash
# Rollback to previous deployment
vercel rollback

# Or via Vercel Dashboard:
# Project → Deployments → Find previous deployment → Promote to Production
```

### Database Rollback

```bash
# If migrations were applied, you may need to rollback database
# WARNING: This may cause data loss

# Option 1: Restore from backup
# Use Supabase dashboard to restore from backup

# Option 2: Revert migrations
npx prisma migrate resolve --rolled-back <migration-name>

# Option 3: Manual SQL to revert schema changes
# Connect to database and run SQL to undo changes
```

### Emergency Fixes

If rollback is not possible:

1. **Disable Access Request Form**
   - Add feature flag to disable form
   - Show maintenance message

2. **Disable Admin Dashboard**
   - Add maintenance mode
   - Redirect to status page

3. **Hotfix Deployment**
   - Create hotfix branch
   - Apply minimal fix
   - Deploy immediately
   - Test thoroughly

---

## Troubleshooting Common Deployment Issues

### Issue: Admin cannot log in

**Solution:**
```bash
# Verify admin account exists
DATABASE_URL="production-url" npx prisma studio

# Re-run seed script
vercel env pull
npx tsx prisma/seed-admin.ts

# Verify ADMIN_SEED_PASSWORD is set in Vercel
```

### Issue: Emails not sending

**Solution:**
```bash
# Check environment variables
# Vercel Dashboard → Settings → Environment Variables
# Verify RESEND_API_KEY and RESEND_FROM_EMAIL

# Check Resend dashboard for errors
# Visit: https://resend.com/emails

# Verify domain is verified
# Visit: https://resend.com/domains
```

### Issue: Database connection fails

**Solution:**
```bash
# Verify DATABASE_URL in Vercel
# Check Supabase project status
# Verify connection pooling is enabled
# Check firewall rules in Supabase
```

### Issue: 403 errors on admin routes

**Solution:**
```bash
# Verify user role in database
DATABASE_URL="production-url" npx prisma studio
# Check role = ADMIN

# Clear cookies and log in again
# Check JWT token contains role
```

---

## Success Criteria

Deployment is successful when:

- ✅ Admin can log in and access dashboard
- ✅ Access requests can be submitted from landing page
- ✅ Admin receives email notifications for new requests
- ✅ Admin can approve requests and create users
- ✅ Users receive approval emails with credentials
- ✅ Users can log in with provided credentials
- ✅ Role-based routing works correctly
- ✅ PLATFORM_USER can upload and share documents
- ✅ READER_USER can only view shared documents
- ✅ No errors in production logs
- ✅ All emails are delivered successfully
- ✅ Registration page is disabled
- ✅ All security measures are active

---

## Contact Information

**Admin Email:** sivaramj83@gmail.com  
**Support Email:** support@jstudyroom.dev  
**Platform:** FlipBook DRM - jstudyroom platform

---

## Additional Resources

- **README.md** - General setup and features
- **ADMIN_USER_GUIDE.md** - How to use admin dashboard
- **TROUBLESHOOTING_GUIDE.md** - Common issues and solutions
- **SUPABASE_SETUP_GUIDE.md** - Database setup
- **Design Document** - `.kiro/specs/admin-managed-access/design.md`
- **Requirements Document** - `.kiro/specs/admin-managed-access/requirements.md`

---

**Last Updated:** November 2025  
**Version:** 1.0  
**Status:** Ready for Production Deployment
