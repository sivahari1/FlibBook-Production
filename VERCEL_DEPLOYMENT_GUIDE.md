# Vercel Deployment Guide - Complete Fix

## Problem Summary

The build was failing because `prisma.config.ts` was using an invalid import that doesn't exist in Prisma's API. This caused Prisma to skip loading environment variables from `process.env`, making `DATABASE_URL` and `DIRECT_URL` unavailable during build.

## Solution Applied

✅ **Deleted `prisma.config.ts`** - Prisma doesn't need this file. It reads configuration from:
- `prisma/schema.prisma` (schema definition)
- `process.env` (environment variables)

## Required Environment Variables in Vercel

You MUST set these in your Vercel Project Settings → Environment Variables:

### 1. Database (REQUIRED at BUILD TIME and RUNTIME)

```bash
# Session Pooler - for app runtime
DATABASE_URL="postgresql://postgres.PROJECT_ID:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1&pool_timeout=10"

# Direct Connection - for Prisma migrations (build time)
DIRECT_URL="postgresql://postgres.PROJECT_ID:PASSWORD@db.PROJECT_ID.supabase.co:5432/postgres"
```

**When needed:**
- `DATABASE_URL`: BUILD TIME (for `prisma generate`) + RUNTIME (for app queries)
- `DIRECT_URL`: BUILD TIME (for migrations if you run them) + RUNTIME (Prisma Client uses it)

**Important:** URL-encode special characters in passwords:
- `!` → `%21`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`

### 2. NextAuth (REQUIRED at RUNTIME)

```bash
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-key-here-min-32-chars"

# Your production URL
NEXTAUTH_URL="https://your-domain.vercel.app"
```

**When needed:** RUNTIME only

### 3. App URL (REQUIRED at RUNTIME)

```bash
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

**When needed:** RUNTIME (and exposed to browser via `NEXT_PUBLIC_` prefix)

### 4. Email Service - Resend (REQUIRED at RUNTIME)

```bash
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="support@jstudyroom.dev"
```

**When needed:** RUNTIME only

### 5. Supabase Storage (REQUIRED at RUNTIME)

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."
```

**When needed:** RUNTIME (first two exposed to browser)

### 6. Cron Job Security (REQUIRED at RUNTIME)

```bash
# Generate with: openssl rand -hex 32
CRON_SECRET="your-cron-secret-here"
```

**When needed:** RUNTIME only

### 7. Razorpay (OPTIONAL - for payments)

```bash
RAZORPAY_KEY_ID="rzp_live_xxx"
RAZORPAY_KEY_SECRET="xxx"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_live_xxx"
```

**When needed:** RUNTIME only (if using payments)

### 8. Admin Seed Password (OPTIONAL - for seeding)

```bash
ADMIN_SEED_PASSWORD="your-secure-admin-password"
```

**When needed:** Only if you run seed scripts manually

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. For each variable:
   - Enter the **Key** (e.g., `DATABASE_URL`)
   - Enter the **Value** (your actual connection string)
   - Select environments: **Production**, **Preview**, **Development** (check all three)
   - Click **Save**

## Local Development Setup

### Step 1: Pull Vercel Environment Variables

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (run in project root)
vercel link

# Pull environment variables
vercel env pull .env.local
```

This creates `.env.local` with all your Vercel environment variables.

### Step 2: Test Build Locally

```bash
# Test the Vercel build process locally
vercel build

# If successful, you'll see:
# ✓ Build Completed
```

### Step 3: Run Development Server

```bash
npm run dev
```

## Verification Checklist

Before deploying, verify:

- [ ] All required environment variables are set in Vercel
- [ ] `DATABASE_URL` uses the **pooler** connection string
- [ ] `DIRECT_URL` uses the **direct** connection string
- [ ] Special characters in passwords are URL-encoded
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] `NEXT_PUBLIC_APP_URL` matches your production domain
- [ ] `vercel build` succeeds locally

## Current Configuration Files

### ✅ `prisma/schema.prisma` (CORRECT - No changes needed)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

This correctly reads from environment variables.

### ✅ `package.json` (CORRECT - No changes needed)

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

The `postinstall` script runs `prisma generate` automatically when Vercel installs dependencies. This requires `DATABASE_URL` to be available.

## Troubleshooting

### If build still fails with "DATABASE_URL not found"

1. Double-check the environment variable name is exactly `DATABASE_URL` (case-sensitive)
2. Ensure it's enabled for all environments (Production, Preview, Development)
3. Try redeploying: `git commit --allow-empty -m "trigger rebuild" && git push`

### If you see "Connection pool timeout"

Your `DATABASE_URL` should include connection pooling parameters:
```
?pgbouncer=true&connection_limit=1&pool_timeout=10
```

### If migrations fail

Migrations need `DIRECT_URL` (not the pooler). Make sure it's set in Vercel.

## Summary of Changes Made

### Deleted Files
- ❌ `prisma.config.ts` (was causing the issue)

### No Changes Needed
- ✅ `prisma/schema.prisma` (already correct)
- ✅ `package.json` (already correct)
- ✅ `.env.example` (already documented)

## Next Steps

1. **Set all environment variables in Vercel** (see list above)
2. **Push the fix** (already done - commit e7690c5)
3. **Vercel will auto-deploy** - monitor the build logs
4. **Verify deployment** - check that the app loads and database connects

The build should now succeed! 🎉
