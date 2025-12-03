# Document Preview Error - Fix Guide

## Problem
You're seeing "Failed to Load Document" with a TurboPack/Prisma error when trying to preview documents.

## Root Cause
**Database Connection Failure** - The application cannot connect to your Supabase database at `aws-1-ap-south-1.pooler.supabase.com:5432`.

## Quick Fixes (Try in order)

### Fix 1: Wake Up Paused Database (Most Common)
Supabase free tier databases pause after 1 week of inactivity.

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Check if you see a "Resume" or "Restore" button
4. Click it and wait for the database to wake up (takes 1-2 minutes)
5. Refresh your application

### Fix 2: Check Network Connectivity

```powershell
# Test if you can reach Supabase
Test-NetConnection -ComputerName aws-1-ap-south-1.pooler.supabase.com -Port 5432
```

If this fails:
- Check your internet connection
- Check if your firewall is blocking port 5432
- Try from a different network

### Fix 3: Verify Environment Variables

1. Check your `.env` file exists and has correct values:

```bash
# Run this diagnostic
npx tsx scripts/diagnose-preview-error.ts
```

2. Make sure these are set correctly:
   - `DATABASE_URL` - Should point to your Supabase pooler
   - `DIRECT_URL` - Should point to your direct connection
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your anon key

3. Get correct values from Supabase:
   - Go to Project Settings → Database → Connection String
   - Copy the "Session Pooler" connection string for `DATABASE_URL`
   - Copy the "Direct Connection" string for `DIRECT_URL`

### Fix 4: Restart Development Server

```powershell
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

### Fix 5: Regenerate Prisma Client

```powershell
# Stop dev server first!
# Then run:
npx prisma generate
npm run dev
```

### Fix 6: Check Supabase Project Status

1. Go to https://supabase.com/dashboard
2. Check if your project shows any warnings or errors
3. Check the "Database" section for connection issues
4. Look at "Logs" for any database errors

## Testing the Fix

After applying fixes, test with:

```powershell
# Test database connection
npx tsx scripts/diagnose-preview-error.ts
```

You should see:
```
✅ Database connection successful
✅ Found X document(s)
```

Then try previewing a document again in your browser.

## Still Not Working?

If none of the above work, the issue might be:

1. **Supabase project deleted or expired**
   - Check if your project still exists in Supabase dashboard
   - Free tier projects are deleted after 1 week of inactivity

2. **Wrong database credentials**
   - Double-check your DATABASE_URL matches Supabase exactly
   - Make sure password is URL-encoded (special characters like ! @ # need encoding)

3. **Network/Firewall issues**
   - Try from a different network
   - Check corporate firewall settings
   - Try using a VPN

## Need More Help?

Run the full diagnostic:
```powershell
npx tsx scripts/diagnose-preview-error.ts
```

And share the output for further troubleshooting.
