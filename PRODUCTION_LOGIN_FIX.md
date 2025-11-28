# Production Login Fix

## Issue
Login works locally but fails in production with 401 error after deployment.

## Root Cause Analysis
✅ Database credentials are correct (verified locally)
✅ Passwords match in database (Jsrk@9985 and Admin@123)
✅ Users are active and email verified
❌ Production environment likely has missing or incorrect environment variables

## Most Likely Causes

### 1. Missing NEXTAUTH_SECRET in Production
The `NEXTAUTH_SECRET` must be set in Vercel environment variables and must be the same value used when the session was created.

### 2. Incorrect NEXTAUTH_URL
Must match your production domain exactly: `https://jstudyroom.dev`

### 3. Database Connection Issues
Production might be using wrong DATABASE_URL or DIRECT_URL

### 4. CORS/Cookie Issues
Secure cookies might not be working correctly in production

## Fix Steps

### Step 1: Verify Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Ensure these are set for **Production**:

```bash
# Database (CRITICAL)
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# NextAuth (CRITICAL)
NEXTAUTH_SECRET=[Your secret - must be same as before]
NEXTAUTH_URL=https://jstudyroom.dev

# App URL
NEXT_PUBLIC_APP_URL=https://jstudyroom.dev

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=support@jstudyroom.dev

# Cron
CRON_SECRET=[Your cron secret]
```

### Step 2: Check Database Connection in Production

The issue might be that production is trying to use the pooler URL which has been intermittently unreachable. Our code prefers DIRECT_URL, so make sure it's set.

### Step 3: Redeploy After Setting Variables

After updating environment variables in Vercel:
1. Go to Deployments tab
2. Click on the latest deployment
3. Click "Redeploy" button
4. Select "Use existing Build Cache" (faster)

### Step 4: Test Login Endpoint Directly

You can test the auth endpoint directly:

```bash
curl -X POST https://jstudyroom.dev/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sivaramj83@gmail.com",
    "password": "Jsrk@9985",
    "csrfToken": "xxx"
  }'
```

## Quick Verification Commands

### Check if environment variables are accessible in production:

Create a temporary API route to check (remove after testing):

```typescript
// app/api/debug/env/route.ts
export async function GET() {
  return Response.json({
    hasDatabase: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV
  });
}
```

Then visit: `https://jstudyroom.dev/api/debug/env`

## Common Issues

### Issue: "Invalid email or password" but credentials are correct
**Cause**: Database connection failing in production
**Fix**: Ensure DIRECT_URL is set and correct

### Issue: 401 Unauthorized
**Cause**: NEXTAUTH_SECRET mismatch or missing
**Fix**: Set NEXTAUTH_SECRET in Vercel to match your local .env

### Issue: Session not persisting
**Cause**: Cookie domain/secure settings
**Fix**: Ensure NEXTAUTH_URL matches your domain exactly

### Issue: CORS errors
**Cause**: Incorrect NEXT_PUBLIC_APP_URL
**Fix**: Set to https://jstudyroom.dev

## Immediate Action Required

1. **Go to Vercel Dashboard NOW**
2. **Check Environment Variables** (Settings → Environment Variables)
3. **Verify these are set for Production:**
   - DATABASE_URL ✓
   - DIRECT_URL ✓
   - NEXTAUTH_SECRET ✓
   - NEXTAUTH_URL ✓
4. **Redeploy if any were missing**

## Test Credentials

After fixing:
- Email: sivaramj83@gmail.com, Password: Jsrk@9985
- Email: hariharanr@gmail.com, Password: Admin@123

Both should work immediately after redeployment.
