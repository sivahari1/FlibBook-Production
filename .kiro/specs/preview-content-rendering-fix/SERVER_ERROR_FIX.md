# Database Connection Fix

## Issue
The application cannot connect to Supabase database even though:
- ✅ Supabase dashboard shows database is healthy
- ✅ Network connection to Supabase works (port 5432 is reachable)
- ❌ Prisma client fails to connect

## Root Cause
The password in the DATABASE_URL might be incorrect or needs proper URL encoding.

## Solution

### Step 1: Get the Correct Connection String from Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `flipbook-production`
3. Click on **Settings** (gear icon) → **Database**
4. Under "Connection string", select **URI** format
5. Choose **Session pooler** method
6. Copy the connection string

### Step 2: Update Your .env.local File

Replace the DATABASE_URL and DIRECT_URL in your `.env.local` file with the correct values from Supabase.

The format should be:
```
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:[YOUR_PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.zuhrivibcgudgsejsljo:[YOUR_PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
```

### Step 3: Restart Your Dev Server

After updating the connection string:

```cmd
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Password Encoding

If your password contains special characters, they need to be URL-encoded:
- `!` → `%21`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `^` → `%5E`
- `&` → `%26`
- `*` → `%2A`

## Test the Connection

After updating, test the connection:

```cmd
npx tsx scripts/test-database-connection.ts
```

You should see: ✅ Connection successful!

## Alternative: Reset Database Password

If you don't remember the password:

1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset database password"
3. Copy the new password
4. Update your `.env.local` file with the new password (URL-encoded if needed)
5. Restart your dev server

## Current Status

- Network: ✅ Working (can reach Supabase servers)
- Database: ✅ Healthy (Supabase dashboard shows active)
- Connection String: ❌ Needs verification/update
