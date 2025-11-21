# ⚡ QUICK DATABASE FIX (2 Minutes)

## Step 1: Resume Supabase Database (30 seconds)

1. Open: https://supabase.com/dashboard
2. Select your project
3. If you see "Paused" → Click **"Resume"** or **"Restore"**
4. Wait 30 seconds

## Step 2: Get Your Database Password (30 seconds)

1. In Supabase Dashboard → **Settings** → **Database**
2. Find your database password (or reset it if forgotten)
3. Copy it

## Step 3: Update .env.local (30 seconds)

Create or edit `.env.local` in your project root:

```bash
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"
NEXTAUTH_SECRET="any-random-string-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Replace `[YOUR_PASSWORD]`** with your actual Supabase database password!

## Step 4: Test Connection (30 seconds)

```bash
npx tsx scripts/test-database-connection.ts
```

**Expected:** ✅ All tests passed!

**If failed:** Check password is correct, no typos

## Step 5: Start Server

```bash
npm run dev
```

## Step 6: Login

Go to: http://localhost:3000/login

- Email: `hariharnr@gmail.com`
- Password: `Admin@123`

---

## 🚨 Still Not Working?

### Option A: Use Production Instead
Just use your Vercel deployment: https://jstudyroom.dev
(It already has database access configured)

### Option B: Try Connection Pooler
Update `.env.local`:
```bash
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

---

## ✅ Done!

Once the test passes, your local environment is ready!
