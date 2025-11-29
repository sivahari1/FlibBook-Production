# Database Connection - URGENT FIX

## The Real Problem

The login errors are caused by **database connection failure**:
```
Can't reach database server at `db.zuhrivibcgudgsejsljo.supabase.co:5432`
```

This means:
1. Your Supabase database is either:
   - Not running
   - Network/firewall blocking connection
   - Database paused (free tier auto-pauses after inactivity)
   - Wrong connection credentials

## Quick Fixes

### Option 1: Wake Up Supabase Database (Most Likely)

Supabase free tier databases pause after inactivity. To wake it up:

1. Go to: https://supabase.com/dashboard
2. Login to your account
3. Select your project: `zuhrivibcgudgsejsljo`
4. The database should wake up automatically
5. Wait 30 seconds, then try logging in again

### Option 2: Check Database Status

Run this to test the connection:
```bash
npx tsx scripts/test-database-connection.ts
```

### Option 3: Use Pooler URL (Recommended)

Your `.env.local` already has the pooler URL, but let's verify it's correct:

```env
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"
```

This should work even if the direct connection is blocked.

## Why This Causes Login Errors

1. User tries to login
2. NextAuth tries to query database for user
3. Database connection fails
4. NextAuth returns 401 Unauthorized
5. All subsequent API calls fail

## Immediate Action

**Do this NOW:**

1. Open https://supabase.com/dashboard in your browser
2. Click on your project
3. This will wake up the database
4. Wait 30 seconds
5. Refresh your login page
6. Try logging in again

## If Still Not Working

The database might be permanently down or deleted. Check:

1. **Supabase Dashboard** - Is the project still there?
2. **Project Status** - Is it paused or stopped?
3. **Billing** - Free tier has limits

## Alternative: Use Local Database

If Supabase is down, you can switch to a local PostgreSQL:

1. Install PostgreSQL locally
2. Update `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/flipbook"
   DIRECT_URL="postgresql://postgres:password@localhost:5432/flipbook"
   ```
3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```

## Summary

The login isn't broken - the database is unreachable. Wake up your Supabase database and it should work immediately.
