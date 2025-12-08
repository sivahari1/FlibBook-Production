# Vercel Login Troubleshooting Guide

## Issue
Unable to login on Vercel deployment at jstudyroom.dev/login

## Console Errors Observed
- Multiple "Error: An error occurred in the Server Component" messages
- Failed to load resources (401 errors)
- Server component rendering errors

## Immediate Fixes to Check

### 1. Wait for Latest Deployment
The infinite loop fix we just pushed needs to deploy first:
- Check Vercel dashboard for deployment status
- Wait for the deployment with commit `e9ec3b6` to complete
- This should resolve the server component errors

### 2. Verify Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and ensure these are set:

**Critical for Login:**
```
NEXTAUTH_SECRET=<your-secret-from-local-env>
NEXTAUTH_URL=https://jstudyroom.dev
NEXT_PUBLIC_APP_URL=https://jstudyroom.dev
DATABASE_URL=<your-supabase-pooler-url>
```

**Also Required:**
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 3. Check NEXTAUTH_URL Configuration

The NEXTAUTH_URL MUST match your deployment URL exactly:
- ✅ Correct: `https://jstudyroom.dev`
- ❌ Wrong: `https://jstudyroom.dev/` (trailing slash)
- ❌ Wrong: `http://jstudyroom.dev` (http instead of https)
- ❌ Wrong: `https://your-project.vercel.app` (if using custom domain)

### 4. Verify Database Connection

The DATABASE_URL in Vercel must use the Session Pooler format:
```
postgresql://postgres.PROJECT_ID:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**Important:** 
- Use the POOLER URL (not direct connection)
- Ensure password is URL-encoded if it contains special characters
- Include all query parameters

### 5. Clear Browser Cache

After deployment completes:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
4. Try logging in again

## Step-by-Step Verification

### Step 1: Check Deployment Status
```bash
# In Vercel dashboard, verify:
# - Latest commit (e9ec3b6) is deployed
# - Build completed successfully
# - No build errors
```

### Step 2: Test Database Connection
Once deployed, visit:
```
https://jstudyroom.dev/api/health
```

Should return: `{"status":"ok"}`

### Step 3: Check Auth Configuration
Visit the login page and check console for specific errors:
```
https://jstudyroom.dev/login
```

### Step 4: Try Login
Use your credentials:
- Email: sivaramj83@gmail.com
- Password: <your-password>

## Common Error Messages & Solutions

### "Failed to load resource: 401"
**Cause:** Authentication middleware blocking requests
**Solution:** Verify NEXTAUTH_SECRET is set in Vercel

### "Server Component Error"
**Cause:** Infinite loop in component (should be fixed now)
**Solution:** Wait for latest deployment to complete

### "Configuration Error"
**Cause:** NEXTAUTH_URL mismatch
**Solution:** Ensure NEXTAUTH_URL exactly matches your domain

### "Database Connection Error"
**Cause:** Wrong DATABASE_URL format
**Solution:** Use Session Pooler URL with correct parameters

## Quick Fix Commands

### Redeploy with Environment Variables
In Vercel dashboard:
1. Go to Settings → Environment Variables
2. Verify all variables are set
3. Go to Deployments
4. Click "..." on latest deployment
5. Select "Redeploy"

### Force Clear Vercel Cache
```bash
# In your local terminal:
git commit --allow-empty -m "force redeploy"
git push origin main
```

## If Still Not Working

### Check Vercel Logs
1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Deployments"
4. Click on the latest deployment
5. Check "Build Logs" and "Function Logs" for errors

### Test Locally First
```bash
# Ensure it works locally:
npm run build
npm start

# Then try logging in at http://localhost:3000/login
```

### Verify User Exists in Database
The user might not exist in production database. Run this script locally:
```bash
npx tsx scripts/check-user-simple.ts
```

## Contact Information
If none of these work, the issue might be:
- Supabase RLS policies blocking access
- Database migration not run in production
- User account not created in production database

## Next Steps
1. Wait for current deployment to complete (check Vercel dashboard)
2. Clear browser cache completely
3. Try logging in again
4. If still failing, check Vercel function logs for specific error messages
