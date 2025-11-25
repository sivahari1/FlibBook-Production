# 🚀 Quick Supabase Setup

## Problem Found
❌ **DATABASE_URL is not set in your `.env.local` file**

## Quick Fix (5 minutes)

### Step 1: Get Your Supabase Connection String

1. **Open Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/zuhrivibcgudgsejsljo
   ```

2. **Navigate to Database Settings**:
   - Click **Settings** (⚙️ icon in sidebar)
   - Click **Database**
   - Scroll to **Connection string** section

3. **Copy Connection String**:
   - Select **URI** tab
   - Click **Copy** button
   - It looks like:
   ```
   postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

4. **Replace `[PASSWORD]`** with your actual database password
   - If you don't know it, click "Reset database password"

### Step 2: Update .env.local

1. **Open `.env.local`** in your project root

2. **Add or update these lines**:
   ```env
   # Supabase Database Connection
   DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   
   # Optional: Direct connection for migrations
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"
   ```

3. **Save the file**

### Step 3: Test Connection

```bash
# Test the connection
npx tsx scripts/test-db-connection-simple.ts
```

Expected output:
```
✅ Database connection successful!
✅ Found X users in database
```

### Step 4: Restart Dev Server

```bash
# Stop current server (Ctrl+C in the terminal running npm run dev)
# Then restart:
npm run dev
```

## Example .env.local File

Here's what your `.env.local` should look like:

```env
# Database
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Resend (Email)
RESEND_API_KEY="re_..."

# Razorpay (Payments)
RAZORPAY_KEY_ID="rzp_..."
RAZORPAY_KEY_SECRET="..."

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="https://zuhrivibcgudgsejsljo.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

## Troubleshooting

### If Project is Paused

1. Go to: https://supabase.com/dashboard
2. Click on your project
3. Look for "Project paused" banner
4. Click **"Resume Project"**
5. Wait 1-2 minutes for activation
6. Then get connection string

### If Password Has Special Characters

URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `&` → `%26`
- `%` → `%25`

Example:
```
Password: MyP@ss#123
Encoded:  MyP%40ss%23123
```

### If Still Not Working

1. **Reset Database Password**:
   - Supabase Dashboard → Settings → Database
   - Click "Reset database password"
   - Use simple password (no special chars)
   - Update .env.local

2. **Check Supabase Status**:
   - Visit: https://status.supabase.com
   - Check if there are any outages

3. **Try Direct Connection**:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"
   ```

## After Connection Works

Once connected, you can:

1. ✅ Access admin dashboard: http://localhost:3000/admin
2. ✅ Run database migrations: `npx prisma migrate dev`
3. ✅ View database in Prisma Studio: `npx prisma studio`
4. ✅ Deploy to production with confidence

## Important Notes

- **Never commit `.env.local`** to git (it's in .gitignore)
- **Production uses different env vars** set in Vercel dashboard
- **Local DB issues don't affect production** - your live site works fine!

---

**Need Help?** Check `SUPABASE_CONNECTION_GUIDE.md` for detailed troubleshooting.
