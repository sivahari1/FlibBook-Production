# 🔧 Fix Database Connection Issue

## Problem
Getting "Can't reach database server" error when trying to access admin dashboard locally.

## Root Cause
Your local environment cannot connect to the Supabase database. This could be due to:
1. Missing or incorrect DATABASE_URL in `.env.local`
2. Supabase database is paused (free tier auto-pauses after inactivity)
3. Network/firewall issues blocking the connection
4. Using wrong connection string format

---

## ✅ Solution Steps

### Step 1: Check if Supabase Database is Active

1. Go to https://supabase.com/dashboard
2. Select your project: **FlipBook Production**
3. Check the database status at the top
4. If it says "Paused", click **"Resume"** or **"Restore"**
5. Wait 30-60 seconds for it to fully start

### Step 2: Get Fresh Connection Strings

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **"URI"** tab
4. Copy the connection string (it will look like):
   ```
   postgresql://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres
   ```
5. **IMPORTANT**: Replace `[YOUR_PASSWORD]` with your actual database password

### Step 3: Update Your .env.local File

Create or update `.env.local` in your project root:

```bash
# Database - Use Supabase Connection Pooler for better reliability
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:[YOUR_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct URL for migrations
DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Resend Email
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="support@jstudyroom.dev"

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Cron Secret
CRON_SECRET="your-cron-secret"

# Razorpay (Optional)
RAZORPAY_KEY_ID="your-key-id"
RAZORPAY_KEY_SECRET="your-key-secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="your-key-id"
```

**Replace these values:**
- `[YOUR_PASSWORD]` - Your Supabase database password
- All other `your-*` placeholders with actual values from Supabase/Resend/Razorpay

### Step 4: Test the Connection

Run this command to test if the database connection works:

```bash
npx tsx scripts/check-hariharan-admin.ts
```

**Expected Output:**
```
✅ User found:
- ID: xxx
- Email: hariharnr@gmail.com
- Role: ADMIN
✅ Database connection OK
```

**If it still fails:**
- Double-check your password has no typos
- Make sure database is not paused in Supabase
- Try using the direct connection URL instead of pooler

### Step 5: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 6: Test Login

1. Go to http://localhost:3000/login
2. Login with:
   - Email: `hariharnr@gmail.com`
   - Password: `Admin@123`
3. Should redirect to `/admin` dashboard

---

## 🔍 Alternative: Use Connection Pooler

If direct connection doesn't work, try the Supabase Connection Pooler:

### Get Pooler URL:
1. Supabase Dashboard → **Settings** → **Database**
2. Find **Connection Pooling** section
3. Mode: **Transaction**
4. Copy the connection string

### Update .env.local:
```bash
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

---

## 🚨 Troubleshooting

### Issue: "Can't reach database server"
**Solutions:**
1. Check if Supabase database is paused → Resume it
2. Verify password is correct (no extra spaces)
3. Check if your IP is allowed (Supabase → Settings → Database → Connection Pooling)
4. Try using VPN if corporate firewall is blocking

### Issue: "Invalid password"
**Solutions:**
1. Reset database password in Supabase Dashboard
2. Update `.env.local` with new password
3. Restart dev server

### Issue: "Connection timeout"
**Solutions:**
1. Check your internet connection
2. Try using connection pooler instead of direct connection
3. Check if port 5432 or 6543 is blocked by firewall

### Issue: Still not working locally
**Workaround:**
- Use Vercel deployment instead: https://jstudyroom.dev
- Vercel has direct access to Supabase and should work fine
- You can still manage everything from production

---

## 📋 Quick Checklist

- [ ] Supabase database is active (not paused)
- [ ] Copied correct connection string from Supabase
- [ ] Replaced `[YOUR_PASSWORD]` with actual password
- [ ] Created/updated `.env.local` file
- [ ] Tested connection with `npx tsx scripts/check-hariharan-admin.ts`
- [ ] Restarted development server
- [ ] Tested login at http://localhost:3000/login

---

## 🎯 Expected Result

After following these steps:
- ✅ Database connection works
- ✅ Can login with `hariharnr@gmail.com`
- ✅ Admin dashboard loads without errors
- ✅ Can see statistics and manage users

---

## 💡 Pro Tips

1. **Use Connection Pooler** for better reliability and performance
2. **Keep .env.local secure** - never commit it to Git
3. **Test on Vercel** if local issues persist
4. **Check Supabase logs** for connection errors
5. **Use strong passwords** for database access

---

## Need Help?

If you're still having issues:
1. Check Supabase status page: https://status.supabase.com
2. Review Supabase logs in Dashboard → Logs
3. Try accessing from Vercel production instead
4. Contact Supabase support if database won't resume
