# Supabase Connection Guide

## Current Status
❌ **Database Unreachable**: `db.zuhrivibcgudgsejsljo.supabase.co:5432`

## Step-by-Step Fix

### Step 1: Check Supabase Project Status

1. **Visit Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Login with your account
   - Find your project: `zuhrivibcgudgsejsljo`

2. **Check Project Status**
   - Look for "Project paused" message
   - Free tier projects pause after 7 days of inactivity
   - If paused, click **"Resume Project"** or **"Restore Project"**

3. **Wait for Activation**
   - Project may take 1-2 minutes to resume
   - Status will change from "Paused" to "Active"

### Step 2: Get Fresh Connection String

1. **In Supabase Dashboard**:
   - Click on your project
   - Go to **Settings** (gear icon) → **Database**
   - Scroll to **Connection String** section
   - Select **"URI"** tab
   - Copy the connection string (it looks like):
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

2. **Important Notes**:
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - Use **Transaction mode** (port 6543) for better compatibility
   - Or use **Session mode** (port 5432) for direct connection

### Step 3: Update Your .env.local File

1. **Open `.env.local`** in your project root

2. **Update DATABASE_URL**:
   ```env
   # Replace with your fresh connection string from Supabase
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   
   # For direct connection (alternative):
   # DATABASE_URL="postgresql://postgres:[PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"
   ```

3. **Add Connection Pooling** (Recommended):
   ```env
   DIRECT_URL="postgresql://postgres:[PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

### Step 4: Test Connection

Run this command to test:
```bash
npx tsx scripts/test-db-connection-simple.ts
```

Expected output if successful:
```
✅ Database connection successful!
✅ Found X users in database
```

### Step 5: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

## Common Issues & Solutions

### Issue 1: "Can't reach database server"

**Causes**:
- Project is paused
- Wrong connection string
- Network/firewall blocking

**Solutions**:
1. Resume project in Supabase dashboard
2. Verify DATABASE_URL is correct
3. Try using pooler connection (port 6543)
4. Check if your network/firewall allows outbound connections to Supabase

### Issue 2: "Password authentication failed"

**Causes**:
- Wrong password in connection string
- Password contains special characters not URL-encoded

**Solutions**:
1. Reset database password in Supabase dashboard
2. URL-encode special characters in password:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `&` → `%26`

### Issue 3: "Too many connections"

**Causes**:
- Connection pool exhausted
- Not using connection pooling

**Solutions**:
1. Use pooler connection (port 6543)
2. Add `?pgbouncer=true` to connection string
3. Restart your Supabase project

### Issue 4: "SSL connection required"

**Causes**:
- Missing SSL parameters

**Solutions**:
Add to connection string:
```
?sslmode=require
```

## Alternative: Use Supabase CLI

If dashboard doesn't work, use CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref zuhrivibcgudgsejsljo

# Get connection string
supabase db remote get
```

## Production Note

**Important**: The database likely works fine in production (Vercel) because:
- Vercel is in the same region as Supabase
- No network restrictions
- Environment variables are set correctly

Your local connection issue doesn't affect production!

## Quick Test Commands

```bash
# Test basic connection
npx tsx scripts/test-db-connection-simple.ts

# Test with Prisma
npx prisma db pull

# View database in Prisma Studio
npx prisma studio
```

## Need Help?

If connection still fails after following these steps:

1. **Check Supabase Status**: https://status.supabase.com
2. **Verify Project Region**: Some regions may have connectivity issues
3. **Try Different Network**: Test from different WiFi/network
4. **Contact Supabase Support**: support@supabase.com

## Next Steps After Connection

Once connected:

1. ✅ Test admin route: http://localhost:3000/admin
2. ✅ Verify statistics load correctly
3. ✅ Deploy admin fix to production
4. ✅ Monitor for any issues

---

**Current Project**: `zuhrivibcgudgsejsljo`
**Database Host**: `db.zuhrivibcgudgsejsljo.supabase.co`
**Status**: Needs activation/configuration
