# Production Login Troubleshooting Guide

## Current Status
- ✅ Login works locally with both users
- ❌ Login fails in production with 401 error
- ✅ Database credentials verified correct
- ✅ User passwords verified: Jsrk@9985 and Admin@123

## Step-by-Step Fix

### Step 1: Check Production Environment Variables

**Go to Vercel Dashboard:**
1. Open https://vercel.com
2. Select your project (jstudyroom)
3. Go to Settings → Environment Variables
4. Verify ALL these variables are set for **Production** environment:

```
DATABASE_URL
DIRECT_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
CRON_SECRET
```

### Step 2: Test Debug Endpoints (After Deployment)

After deploying the debug endpoints, visit these URLs:

**Environment Check:**
```
https://jstudyroom.dev/api/debug/env-check
```

Expected response:
```json
{
  "environment": {
    "nodeEnv": "production",
    "hasDatabase": true,
    "hasDirect": true,
    "hasNextAuthSecret": true,
    "nextAuthUrl": "https://jstudyroom.dev"
  }
}
```

**Database Test:**
```
https://jstudyroom.dev/api/debug/db-test
```

Expected response:
```json
{
  "success": true,
  "database": {
    "connected": true,
    "totalUsers": 2
  },
  "users": {
    "siva": { "exists": true, "active": true },
    "hari": { "exists": true, "active": true }
  }
}
```

### Step 3: Common Issues and Fixes

#### Issue 1: NEXTAUTH_SECRET Missing or Wrong
**Symptom:** 401 error, session not created
**Fix:**
1. Generate new secret: `openssl rand -base64 32`
2. Add to Vercel environment variables
3. Redeploy

#### Issue 2: NEXTAUTH_URL Incorrect
**Symptom:** Redirect loops, 401 errors
**Fix:**
1. Set to: `https://jstudyroom.dev` (no trailing slash)
2. Redeploy

#### Issue 3: Database Connection Failing
**Symptom:** 500 errors, "Database connection failed"
**Fix:**
1. Verify DIRECT_URL is set in Vercel
2. Check Supabase connection pooler is enabled
3. Test with `/api/debug/db-test`

#### Issue 4: Cookie Not Being Set
**Symptom:** Login appears successful but redirects back to login
**Fix:**
1. Ensure NEXTAUTH_URL matches your domain exactly
2. Check browser console for cookie errors
3. Verify secure cookies are enabled (automatic in production)

### Step 4: Deploy and Test

**Deploy the debug endpoints:**
```bash
git add .
git commit -m "Add production login debug endpoints"
git push
```

**Wait for deployment, then test:**
1. Visit `/api/debug/env-check` - verify all variables are set
2. Visit `/api/debug/db-test` - verify database connection works
3. Try logging in with: sivaramj83@gmail.com / Jsrk@9985
4. Check browser console for errors

### Step 5: Check Vercel Logs

**If login still fails:**
1. Go to Vercel Dashboard → Your Project
2. Click on Deployments
3. Click on the latest deployment
4. Click "View Function Logs"
5. Try to login and watch for errors in real-time

Look for:
- Database connection errors
- Authentication errors
- Missing environment variable warnings

### Step 6: Verify Database Connection String Format

**Correct format for Supabase:**

```bash
# Pooler (for DATABASE_URL)
postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (for DIRECT_URL) - PREFERRED
postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

**Get from Supabase:**
1. Go to Supabase Dashboard
2. Project Settings → Database
3. Copy "Connection string" (Direct connection)
4. Copy "Connection pooling" string (Pooler)

## Quick Checklist

Before asking for help, verify:

- [ ] All environment variables are set in Vercel for Production
- [ ] NEXTAUTH_URL is exactly: `https://jstudyroom.dev`
- [ ] DIRECT_URL is set and correct
- [ ] Redeployed after setting variables
- [ ] Tested `/api/debug/env-check` endpoint
- [ ] Tested `/api/debug/db-test` endpoint
- [ ] Checked Vercel function logs during login attempt
- [ ] Cleared browser cache and cookies
- [ ] Tried in incognito/private window

## Expected Behavior After Fix

1. Visit https://jstudyroom.dev/login
2. Enter: sivaramj83@gmail.com / Jsrk@9985
3. Click Login
4. Should redirect to appropriate dashboard based on role
5. Session should persist across page refreshes

## Remove Debug Endpoints After Fixing

Once login works, remove these files:
```bash
rm app/api/debug/env-check/route.ts
rm app/api/debug/db-test/route.ts
```

Then commit and deploy:
```bash
git add .
git commit -m "Remove debug endpoints"
git push
```

## Need More Help?

If issue persists after following all steps:
1. Share the output from `/api/debug/env-check`
2. Share the output from `/api/debug/db-test`
3. Share any errors from Vercel function logs
4. Share browser console errors during login attempt
