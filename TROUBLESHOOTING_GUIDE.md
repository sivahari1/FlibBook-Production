# Troubleshooting Guide - FlipBook DRM Platform

This guide helps diagnose and resolve common issues with the admin-managed access control system.

## Table of Contents

1. [Access Request Issues](#access-request-issues)
2. [Authentication Problems](#authentication-problems)
3. [Admin Dashboard Issues](#admin-dashboard-issues)
4. [User Management Problems](#user-management-problems)
5. [Email Delivery Issues](#email-delivery-issues)
6. [Role-Based Access Problems](#role-based-access-problems)
7. [Database Issues](#database-issues)
8. [Deployment Issues](#deployment-issues)

---

## Access Request Issues

### Issue: Access request form not submitting

**Symptoms:**
- Form submission fails
- No confirmation message
- Error message displayed

**Possible Causes & Solutions:**

1. **Validation Errors**
   - Check that email is valid format
   - Ensure purpose field is filled (required)
   - Review error messages on form

2. **Rate Limiting**
   - Error: "Too many requests"
   - Wait 1 hour before submitting again
   - Check if multiple requests from same IP
   - Solution: Rate limit is 5 per hour per IP

3. **API Endpoint Error**
   - Check browser console for errors
   - Verify `/api/access-request` endpoint is accessible
   - Check application logs in Vercel
   - Verify database connection

4. **Network Issues**
   - Check internet connection
   - Try different browser
   - Disable browser extensions
   - Check if API is down

**Debug Steps:**
```bash
# Check if endpoint is accessible
curl -X POST https://your-domain.com/api/access-request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","purpose":"Testing"}'

# Check application logs
# In Vercel: Project → Logs → Filter by /api/access-request
```

### Issue: Admin not receiving access request emails

**Symptoms:**
- Access request submitted successfully
- No email received at support@jstudyroom.dev or sivaramj83@gmail.com

**Possible Causes & Solutions:**

1. **Resend Configuration**
   - Verify `RESEND_API_KEY` is set correctly
   - Check `RESEND_FROM_EMAIL=support@jstudyroom.dev`
   - Verify domain is verified in Resend dashboard
   - Check Resend dashboard for delivery logs

2. **Email in Spam**
   - Check spam/junk folders
   - Add support@jstudyroom.dev to contacts
   - Check email filters

3. **Email Sending Failed**
   - Check application logs for email errors
   - Verify Resend API key is valid
   - Check Resend account status
   - Verify email quota not exceeded

**Debug Steps:**
```bash
# Check environment variables
echo $RESEND_API_KEY
echo $RESEND_FROM_EMAIL

# Test email sending manually
# Use scripts/test-email-delivery.ts
npx tsx scripts/test-email-delivery.ts
```

---

## Authentication Problems

### Issue: Cannot log in as admin

**Symptoms:**
- Login fails with "Invalid credentials"
- Redirected back to login page

**Possible Causes & Solutions:**

1. **Wrong Credentials**
   - Verify email: sivaramj83@gmail.com
   - Check password matches `ADMIN_SEED_PASSWORD`
   - Password is case-sensitive

2. **Admin Account Not Created**
   - Run seed script: `npx tsx prisma/seed-admin.ts`
   - Check if admin exists in database
   - Verify `ADMIN_SEED_PASSWORD` environment variable is set

3. **Database Connection**
   - Verify `DATABASE_URL` is correct
   - Check Supabase project is running
   - Test database connection

4. **Password Hash Mismatch**
   - Re-run seed script to reset password
   - Ensure bcrypt is working correctly

**Debug Steps:**
```bash
# Verify admin account exists
npx prisma studio
# Navigate to User table, find sivaramj83@gmail.com

# Re-create admin account
npx tsx prisma/seed-admin.ts

# Check environment variable
echo $ADMIN_SEED_PASSWORD
```

### Issue: Logged in but redirected away from admin dashboard

**Symptoms:**
- Can log in successfully
- Redirected to `/dashboard` instead of `/admin`
- Cannot access `/admin` routes

**Possible Causes & Solutions:**

1. **Wrong Role**
   - User role is not ADMIN
   - Check role in database
   - Update role to ADMIN if needed

2. **Session Issue**
   - Clear browser cookies
   - Log out and log in again
   - Check if role is in JWT token

3. **Middleware Problem**
   - Check middleware.ts is working
   - Verify role check logic in lib/role-check.ts
   - Check application logs

**Debug Steps:**
```bash
# Check user role in database
npx prisma studio
# Find user, verify role = ADMIN

# Update role if needed (in Prisma Studio or via script)
# Or run SQL directly:
# UPDATE "User" SET role = 'ADMIN' WHERE email = 'sivaramj83@gmail.com';
```

---

## Admin Dashboard Issues

### Issue: Access requests not showing

**Symptoms:**
- Admin dashboard loads but no requests visible
- Empty table or "No requests found"

**Possible Causes & Solutions:**

1. **No Requests Submitted**
   - Verify requests exist in database
   - Check AccessRequest table in Prisma Studio
   - Submit test request from landing page

2. **Filter Applied**
   - Check status filter dropdown
   - Set to "All" to see all requests
   - Clear any search filters

3. **API Endpoint Error**
   - Check browser console for errors
   - Verify `/api/admin/access-requests` endpoint
   - Check application logs
   - Verify role verification is passing

4. **Database Query Issue**
   - Check database connection
   - Verify Prisma client is generated
   - Check for query errors in logs

**Debug Steps:**
```bash
# Check if requests exist
npx prisma studio
# Navigate to AccessRequest table

# Test API endpoint
curl -H "Cookie: your-session-cookie" \
  https://your-domain.com/api/admin/access-requests

# Check logs in Vercel dashboard
```

### Issue: Cannot approve access request

**Symptoms:**
- Click "Approve & Create User" but nothing happens
- Error message displayed
- User not created

**Possible Causes & Solutions:**

1. **Email Already Exists**
   - Check if user with that email already exists
   - Use different email or delete existing user
   - Error message should indicate duplicate

2. **Validation Error**
   - Ensure all required fields are filled
   - Check password is generated
   - Verify role is selected

3. **Database Error**
   - Check database connection
   - Verify Prisma schema is up to date
   - Check for constraint violations

4. **Email Sending Failed**
   - User may be created but email fails
   - Check Resend configuration
   - Check application logs

**Debug Steps:**
```bash
# Check if user exists
npx prisma studio
# Search User table by email

# Check application logs for specific error
# In Vercel: Project → Logs → Filter by /api/admin/users/create
```

---

## User Management Problems

### Issue: Cannot reset user password

**Symptoms:**
- Click "Reset Password" but fails
- No email sent to user
- Error message displayed

**Possible Causes & Solutions:**

1. **User Not Found**
   - Verify user exists in database
   - Check user ID is correct

2. **Email Sending Failed**
   - Password may be reset but email fails
   - Check Resend configuration
   - Verify user email address is valid
   - Check application logs

3. **Password Generation Failed**
   - Check lib/password-generator.ts
   - Verify crypto module is available
   - Check for errors in logs

4. **Database Update Failed**
   - Check database connection
   - Verify bcrypt is working
   - Check for update errors in logs

**Debug Steps:**
```bash
# Manually reset password in database
npx prisma studio
# Find user, update passwordHash with bcrypt hash

# Test password generation
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"

# Check logs for specific error
```

### Issue: User role change not taking effect

**Symptoms:**
- Change user role in admin dashboard
- User still has old permissions
- Role appears changed in database

**Possible Causes & Solutions:**

1. **Session Not Updated**
   - User needs to log out and log in again
   - JWT token contains old role
   - Session cache needs refresh

2. **Database Not Updated**
   - Verify role change saved in database
   - Check Prisma Studio
   - Look for update errors in logs

3. **Middleware Cache**
   - Clear application cache
   - Restart development server
   - Redeploy in production

**Debug Steps:**
```bash
# Verify role in database
npx prisma studio
# Check User table for correct role

# Have user log out and log in again
# Check JWT token contains new role (browser dev tools → Application → Cookies)
```

---

## Email Delivery Issues

### Issue: No emails being sent

**Symptoms:**
- Access request notifications not received
- Approval emails not received
- Password reset emails not received

**Possible Causes & Solutions:**

1. **Resend Not Configured**
   - Set `RESEND_API_KEY` environment variable
   - Set `RESEND_FROM_EMAIL=support@jstudyroom.dev`
   - Restart application after setting variables

2. **Invalid API Key**
   - Verify API key in Resend dashboard
   - Generate new API key if needed
   - Update environment variable

3. **Domain Not Verified**
   - In production, domain must be verified
   - Check Resend dashboard → Domains
   - Complete DNS verification
   - Use test domain for development

4. **Email Quota Exceeded**
   - Check Resend account limits
   - Upgrade plan if needed
   - Check for rate limiting

5. **Email Template Error**
   - Check email template rendering
   - Look for React Email errors in logs
   - Verify all template props are provided

**Debug Steps:**
```bash
# Test Resend configuration
npx tsx scripts/test-email-delivery.ts

# Check environment variables
echo $RESEND_API_KEY
echo $RESEND_FROM_EMAIL

# Check Resend dashboard
# Visit: https://resend.com/emails
# Look for failed deliveries

# Check application logs for email errors
# Search for "email" or "resend" in logs
```

### Issue: Emails going to spam

**Symptoms:**
- Emails are sent but land in spam folder
- Low deliverability rate

**Possible Causes & Solutions:**

1. **DNS Records Not Configured**
   - Add SPF record
   - Add DKIM record
   - Add DMARC record
   - Verify in Resend dashboard

2. **Using Test Domain**
   - Test domains have lower reputation
   - Use verified custom domain in production

3. **Email Content Issues**
   - Avoid spam trigger words
   - Include unsubscribe link (if applicable)
   - Use proper HTML structure
   - Include plain text version

**Debug Steps:**
```bash
# Check DNS records
nslookup -type=TXT jstudyroom.dev

# Test email spam score
# Use tools like mail-tester.com
# Send test email and check score

# Review email templates for spam triggers
```

---

## Role-Based Access Problems

### Issue: Platform user cannot upload documents

**Symptoms:**
- User logged in as PLATFORM_USER
- Upload button not visible or disabled
- Upload API returns 403 error

**Possible Causes & Solutions:**

1. **Wrong Role**
   - Verify user role is PLATFORM_USER or ADMIN
   - Check database for correct role
   - Update role if needed

2. **Session Issue**
   - User needs to log out and log in
   - JWT token may have wrong role
   - Clear cookies and re-authenticate

3. **API Endpoint Protection**
   - Check role verification in API route
   - Verify middleware is working
   - Check application logs

**Debug Steps:**
```bash
# Check user role
npx prisma studio
# Verify role = PLATFORM_USER or ADMIN

# Check JWT token
# Browser dev tools → Application → Cookies
# Decode JWT to see role claim

# Test API endpoint
curl -X POST https://your-domain.com/api/documents \
  -H "Cookie: your-session-cookie" \
  -F "file=@test.pdf"
```

### Issue: Reader user can access upload features

**Symptoms:**
- User with READER_USER role can see upload button
- Can access features they shouldn't

**Possible Causes & Solutions:**

1. **Client-Side Check Only**
   - UI may show features but API should block
   - Verify API endpoints have role checks
   - Check lib/role-check.ts is used

2. **Role Not Checked**
   - Add role verification to API routes
   - Update middleware
   - Check all protected endpoints

3. **Session Has Wrong Role**
   - Verify JWT token has correct role
   - Check NextAuth configuration
   - User may need to re-login

**Debug Steps:**
```bash
# Verify role checks in API routes
grep -r "requirePlatformUser\|requireAdmin" app/api/

# Check middleware configuration
cat middleware.ts

# Test API endpoint with READER_USER session
# Should return 403 Forbidden
```

---

## Database Issues

### Issue: Prisma client errors

**Symptoms:**
- "PrismaClient is not configured" error
- Database queries fail
- Type errors with Prisma

**Possible Causes & Solutions:**

1. **Prisma Not Generated**
   - Run: `npx prisma generate`
   - Restart development server
   - Rebuild application

2. **Schema Out of Sync**
   - Run: `npx prisma db push`
   - Or: `npx prisma migrate dev`
   - Verify schema matches database

3. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Verify Supabase project is running
   - Test connection with Prisma Studio

**Debug Steps:**
```bash
# Regenerate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Test database connection
npx prisma studio

# Check environment variables
echo $DATABASE_URL
echo $DIRECT_URL
```

### Issue: Migration fails

**Symptoms:**
- `prisma db push` or `prisma migrate` fails
- Schema changes not applied
- Database errors

**Possible Causes & Solutions:**

1. **Conflicting Changes**
   - Database has data that conflicts with schema
   - May need to manually migrate data
   - Consider data loss implications

2. **Connection Issues**
   - Check database is accessible
   - Verify connection string
   - Check Supabase status

3. **Permission Issues**
   - Verify database user has permissions
   - Check Supabase role permissions
   - Use DIRECT_URL for migrations

**Debug Steps:**
```bash
# Check migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Apply migrations manually
npx prisma migrate deploy

# Check database directly
npx prisma studio
```

---

## Deployment Issues

### Issue: Environment variables not set in production

**Symptoms:**
- Application works locally but fails in production
- "Environment variable not found" errors
- Features not working in production

**Possible Causes & Solutions:**

1. **Variables Not Added to Vercel**
   - Go to Vercel project settings
   - Navigate to Environment Variables
   - Add all required variables
   - Redeploy application

2. **Wrong Variable Names**
   - Verify exact variable names
   - Check for typos
   - Match names from .env.example

3. **Variables Not Exposed**
   - Client-side variables need `NEXT_PUBLIC_` prefix
   - Server-side variables don't need prefix
   - Check which variables need to be public

**Debug Steps:**
```bash
# List required environment variables
cat .env.example

# Check Vercel environment variables
# Vercel Dashboard → Project → Settings → Environment Variables

# Redeploy after adding variables
vercel --prod
```

### Issue: Admin seed script not run in production

**Symptoms:**
- Cannot log in as admin in production
- Admin account doesn't exist

**Possible Causes & Solutions:**

1. **Script Not Executed**
   - Manually run: `npx tsx prisma/seed-admin.ts`
   - Or add to build process
   - Or run via Vercel CLI

2. **ADMIN_SEED_PASSWORD Not Set**
   - Add to Vercel environment variables
   - Use secure password
   - Redeploy after setting

3. **Database Not Accessible**
   - Check DATABASE_URL in production
   - Verify Supabase connection
   - Check firewall rules

**Debug Steps:**
```bash
# Run seed script in production
# Option 1: Via Vercel CLI
vercel env pull
npx tsx prisma/seed-admin.ts

# Option 2: Add to package.json postbuild
# "postbuild": "npx tsx prisma/seed-admin.ts"

# Verify admin exists
npx prisma studio
# Connect to production database
```

---

## General Debugging Tips

### Enable Debug Logging

Add to your code:
```typescript
console.log('[DEBUG]', 'Variable name:', variableValue);
```

Check logs in:
- Local: Terminal where `npm run dev` is running
- Production: Vercel Dashboard → Project → Logs

### Use Prisma Studio

```bash
npx prisma studio
```
- Visual database browser
- View and edit data directly
- Verify data integrity

### Check Browser Console

- Open browser dev tools (F12)
- Check Console tab for errors
- Check Network tab for failed requests
- Check Application tab for cookies/storage

### Test API Endpoints

```bash
# Use curl to test endpoints
curl -X GET https://your-domain.com/api/admin/access-requests \
  -H "Cookie: your-session-cookie"

# Or use Postman/Insomnia for more complex requests
```

### Review Application Logs

- Vercel: Project → Logs
- Filter by time, function, or search term
- Look for error stack traces
- Check for rate limit violations

---

## Getting Help

If you've tried these solutions and still have issues:

1. **Check Documentation**
   - README.md
   - ADMIN_USER_GUIDE.md
   - Design and requirements documents

2. **Review Code**
   - Check recent changes
   - Look for similar implementations
   - Review error messages carefully

3. **Check External Services**
   - Supabase status
   - Resend status
   - Vercel status

4. **Contact Support**
   - Provide error messages
   - Include steps to reproduce
   - Share relevant logs
   - Mention what you've already tried

---

**Last Updated:** November 2025
**Version:** 1.0


---

## Member Registration Issues

### Issue: Member registration fails

**Symptoms:**
- Registration form doesn't submit
- Error message displayed
- No verification email received

**Possible Causes & Solutions:**

1. **Email Already Exists**
   - Error: "Email already registered"
   - User may have already registered
   - Try password reset instead
   - Check if email is used by Platform User

2. **Validation Errors**
   - Password must be at least 8 characters
   - Email must be valid format
   - Name is optional but recommended
   - Review error messages on form

3. **Rate Limiting**
   - Registration endpoint is rate-limited
   - Wait before trying again
   - Check application logs for rate limit errors

4. **Email Service Issues**
   - Verification email not sent
   - Check Resend configuration
   - Verify RESEND_API_KEY is set
   - Check Resend dashboard for delivery status

### Issue: Verification email not received

**Symptoms:**
- Member registered but no email
- Cannot login without verification
- Stuck on verification page

**Possible Causes & Solutions:**

1. **Check Spam Folder**
   - Verification emails may be filtered
   - Check junk/spam folders
   - Add support@jstudyroom.dev to contacts

2. **Email Delivery Delay**
   - Emails can take a few minutes
   - Wait 5-10 minutes before resending
   - Check Resend dashboard for delivery status

3. **Resend Configuration**
   - Verify RESEND_API_KEY in environment variables
   - Check RESEND_FROM_EMAIL is support@jstudyroom.dev
   - Verify domain is verified in Resend (production)
   - Check Resend dashboard for errors

4. **Request New Verification Email**
   - Member can click "Resend Verification Email"
   - New token generated and sent
   - Previous tokens remain valid until expiration

### Issue: Verification link expired

**Symptoms:**
- Click verification link shows "Token expired"
- Cannot complete verification
- Stuck on verification page

**Solution:**
- Verification tokens expire after 24 hours
- Click "Resend Verification Email" on verification page
- Check email for new verification link
- Complete verification within 24 hours

---

## My jstudyroom Issues

### Issue: Cannot add document to My jstudyroom

**Symptoms:**
- "Add to My jstudyroom" button doesn't work
- Error message about limits
- Document not appearing in collection

**Possible Causes & Solutions:**

1. **Total Document Limit Reached (10 documents)**
   - Error: "You have reached the maximum of 10 documents"
   - Solution: Return a document to free up space
   - Check My jstudyroom to see current documents
   - Decide which document to return

2. **Free Document Limit Reached (5 free)**
   - Error: "You have reached the maximum of 5 free documents"
   - Solution: Return a free document OR add a paid document instead
   - Check document counts at top of My jstudyroom
   - Free documents count: X/5

3. **Paid Document Limit Reached (5 paid)**
   - Error: "You have reached the maximum of 5 paid documents"
   - Solution: Return a paid document OR add a free document instead
   - Check document counts at top of My jstudyroom
   - Paid documents count: Y/5

4. **Document Already in Collection**
   - Button is disabled
   - Check My jstudyroom - document may already be added
   - Cannot add same document twice

5. **Book Shop Item Not Published**
   - Admin may have unpublished the item
   - Contact admin for assistance
   - Check if item appears in Book Shop

### Issue: Cannot return document from My jstudyroom

**Symptoms:**
- "Return" button doesn't work
- Document still in collection
- Error message displayed

**Possible Causes & Solutions:**

1. **API Error**
   - Check browser console for errors
   - Try refreshing the page
   - Check application logs

2. **Database Connection Issue**
   - Verify database is accessible
   - Check Supabase status
   - Review application logs

3. **Permission Issue**
   - Verify Member is logged in
   - Check session is valid
   - Try logging out and back in

---

## Book Shop Issues

### Issue: Book Shop items not appearing

**Symptoms:**
- Empty Book Shop catalog
- Some items missing
- Search returns no results

**Possible Causes & Solutions:**

1. **No Published Items**
   - Admin may not have published any items
   - Only published items appear in catalog
   - Contact admin to publish items

2. **Filter Applied**
   - Check category filter dropdown
   - Reset to "All Categories"
   - Clear search box

3. **API Error**
   - Check browser console for errors
   - Verify `/api/bookshop` endpoint is accessible
   - Check application logs

4. **Database Issue**
   - Verify BookShopItem records exist
   - Check database connection
   - Review Prisma logs

### Issue: Cannot purchase paid document

**Symptoms:**
- Payment modal doesn't open
- Payment fails
- Document not added after payment

**Possible Causes & Solutions:**

1. **Paid Document Limit Reached**
   - Error: "You have reached the maximum of 5 paid documents"
   - Solution: Return a paid document first
   - Check My jstudyroom paid count: Y/5

2. **Total Document Limit Reached**
   - Error: "You have reached the maximum of 10 documents"
   - Solution: Return any document to free up space
   - Check My jstudyroom total count: Z/10

3. **Razorpay Configuration Issue**
   - Payment modal opens but fails
   - Check RAZORPAY_KEY_ID is set
   - Verify NEXT_PUBLIC_RAZORPAY_KEY_ID is set
   - Check Razorpay account is active

4. **Payment Gateway Error**
   - Payment fails at Razorpay
   - Check payment method is valid
   - Verify sufficient funds
   - Try different payment method
   - Check Razorpay dashboard for errors

5. **Payment Verification Failed**
   - Payment completed but document not added
   - Check payment status in admin Payments section
   - Verify payment signature validation
   - Check application logs for verification errors
   - Contact admin for manual resolution

---

## Share Access Issues

### Issue: Member cannot access shared document

**Symptoms:**
- "Access Denied" message
- Redirected to login
- Share link doesn't work

**Possible Causes & Solutions:**

1. **Not Logged In**
   - Member must be logged in to access shares
   - Redirect to login page
   - Return to share link after login

2. **Email Mismatch**
   - Error: "This document was shared with a different email address"
   - Document shared to specific email
   - Member must login with that email
   - Or ask sender to share with current email

3. **Share Link Expired**
   - Share may have expiration date
   - Check with sender
   - Request new share link

4. **Share Link Revoked**
   - Sender may have revoked the share
   - Contact sender for new share
   - Check if share is still active

5. **Invalid Share Key**
   - Share link may be incorrect
   - Verify full URL is correct
   - Request new share link from sender

---

## Payment Tracking Issues (Admin)

### Issue: Payments not appearing in admin dashboard

**Symptoms:**
- Empty payments table
- Recent payments missing
- Filter not working

**Possible Causes & Solutions:**

1. **No Payments Yet**
   - No Members have purchased documents
   - Wait for first purchase
   - Test with a purchase

2. **Filter Applied**
   - Check status filter dropdown
   - Reset to "All"
   - Clear any search filters

3. **API Error**
   - Check browser console for errors
   - Verify `/api/admin/payments` endpoint
   - Check application logs

4. **Database Issue**
   - Verify Payment records exist
   - Check database connection
   - Review Prisma logs

### Issue: Payment status stuck on "pending"

**Symptoms:**
- Payment shows as pending for long time
- Member completed payment but status not updated
- Document not added to My jstudyroom

**Possible Causes & Solutions:**

1. **Payment Verification Failed**
   - Check application logs for verification errors
   - Verify Razorpay signature validation
   - Check RAZORPAY_KEY_SECRET is correct

2. **Webhook Not Received**
   - Razorpay webhook may not have fired
   - Check Razorpay dashboard for webhook logs
   - Manually verify payment in Razorpay
   - Update payment status manually if needed

3. **API Timeout**
   - Payment verification may have timed out
   - Check Vercel function logs
   - Verify payment in Razorpay dashboard
   - Manually add document if payment successful

4. **Manual Resolution**
   - Verify payment in Razorpay dashboard
   - If payment successful, manually:
     - Update Payment record status to "success"
     - Add document to Member's My jstudyroom
     - Increment Member's paidDocumentCount
     - Send confirmation email to Member

---

## Member Management Issues (Admin)

### Issue: Cannot view Member details

**Symptoms:**
- Click on Member row doesn't work
- Member details page shows error
- Empty details displayed

**Possible Causes & Solutions:**

1. **API Error**
   - Check browser console for errors
   - Verify `/api/admin/members/[id]` endpoint
   - Check application logs

2. **Database Issue**
   - Verify Member record exists
   - Check database connection
   - Review Prisma logs

3. **Permission Issue**
   - Verify admin is logged in
   - Check admin role in session
   - Try logging out and back in

### Issue: Cannot reset Member password

**Symptoms:**
- Reset password button doesn't work
- No email sent to Member
- Error message displayed

**Possible Causes & Solutions:**

1. **Email Service Issue**
   - Check Resend configuration
   - Verify RESEND_API_KEY is set
   - Check Resend dashboard for delivery status

2. **API Error**
   - Check browser console for errors
   - Verify reset password endpoint
   - Check application logs

3. **Member Email Invalid**
   - Verify Member's email address is correct
   - Update Member email if needed
   - Try reset again

---

## General Troubleshooting Steps

### For Members

1. **Clear browser cache and cookies**
2. **Try a different browser**
3. **Check internet connection**
4. **Verify you're using the correct email**
5. **Check spam folder for emails**
6. **Try logging out and back in**
7. **Contact support: support@jstudyroom.dev**

### For Admins

1. **Check application logs in Vercel**
2. **Review database in Prisma Studio**
3. **Check Resend dashboard for email delivery**
4. **Verify Razorpay dashboard for payments**
5. **Check environment variables are set**
6. **Review Supabase logs**
7. **Test in incognito/private browsing**

### Diagnostic Tools

- **Browser Console** - Check for JavaScript errors
- **Network Tab** - Monitor API requests and responses
- **Vercel Logs** - View server-side errors and logs
- **Prisma Studio** - Inspect database records
- **Resend Dashboard** - Check email delivery status
- **Razorpay Dashboard** - Monitor payment transactions
- **Supabase Dashboard** - Check database and storage

---

**Last Updated:** November 2025
**Version:** 2.0 (jstudyroom Platform)
