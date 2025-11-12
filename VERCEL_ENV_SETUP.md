# Vercel Environment Variables Setup

## Required Environment Variables

### 1. Database
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### 2. NextAuth Configuration
```
NEXTAUTH_URL=https://flib-book-production.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-here-minimum-32-characters
```

### 3. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Email Service (Resend) - Required
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Setup Steps:**
1. Create account at [resend.com](https://resend.com)
2. Get API key from dashboard
3. Add and verify your domain
4. Configure DNS records (SPF, DKIM, DMARC)
5. For testing, use: `onboarding@resend.dev`

### 5. Cron Job Security - Required
```
CRON_SECRET=your-secure-random-string-here
```

**Generate Secret:**
```bash
openssl rand -hex 32
```

### 6. Razorpay (Optional)
```
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-razorpay-key-id
```

## Vercel Deployment Steps

1. **Go to Vercel Dashboard**
   - Navigate to your project settings
   - Click on "Environment Variables"

2. **Add Each Variable**
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Environment: Production, Preview, Development

3. **Critical Settings**
   - ✅ `NEXTAUTH_URL` must be `https://flib-book-production.vercel.app`
   - ✅ `NEXTAUTH_SECRET` must be at least 32 characters
   - ✅ `RESEND_API_KEY` must be valid (test with development first)
   - ✅ `RESEND_FROM_EMAIL` must be verified domain or Resend test email
   - ✅ `CRON_SECRET` must be set for automated token cleanup
   - ✅ `NEXT_PUBLIC_*` variables are exposed to the browser
   - ✅ No quotes around values in Vercel UI

4. **After Adding Variables**
   - Redeploy the application
   - Check deployment logs for any errors

## Common Issues & Solutions

### Issue: "Application error: a client-side exception has occurred"

**Solutions:**
- ✅ Verify all `NEXT_PUBLIC_*` variables are set
- ✅ Check `NEXTAUTH_URL` matches your domain exactly
- ✅ Ensure `NEXTAUTH_SECRET` is set and long enough

### Issue: Database connection errors

**Solutions:**
- ✅ Verify `DATABASE_URL` format is correct
- ✅ Ensure database is accessible from Vercel
- ✅ Check if database requires SSL (add `?sslmode=require`)

### Issue: Authentication not working

**Solutions:**
- ✅ Verify `NEXTAUTH_URL` is exactly your domain
- ✅ Check `NEXTAUTH_SECRET` is set
- ✅ Ensure no trailing slashes in URLs

### Issue: Email verification not sending

**Solutions:**
- ✅ Verify `RESEND_API_KEY` is correct
- ✅ Check `RESEND_FROM_EMAIL` is verified in Resend dashboard
- ✅ Ensure DNS records are configured (SPF, DKIM, DMARC)
- ✅ Check Resend dashboard for delivery logs
- ✅ For testing, use `onboarding@resend.dev`

### Issue: Cron job not running

**Solutions:**
- ✅ Verify `CRON_SECRET` is set in Vercel
- ✅ Check `vercel.json` has cron configuration
- ✅ Ensure endpoint `/api/cron/cleanup-tokens` is accessible
- ✅ Check Vercel logs for cron execution

## Testing Deployment

After setting environment variables:

1. **Check Homepage**
   - Visit https://flib-book-production.vercel.app
   - Should load without errors

2. **Test Authentication**
   - Try to register a new account
   - Try to login
   - Check if dashboard loads

3. **Check API Routes**
   - Test `/api/health` (should return status)
   - Test `/api/documents` (should require auth)
   - Test `/api/auth/register`

## Environment Variable Validation

The app includes automatic validation:
- Server-side validation in `lib/env.ts`
- Client-side validation for public variables
- Error boundary to catch and display issues
- Health check endpoint at `/api/health`

## Security Notes

- Never commit `.env` files to git
- Use different secrets for production vs development
- Rotate secrets regularly
- Monitor Vercel logs for any exposed secrets
