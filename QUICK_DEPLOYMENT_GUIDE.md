# 🚀 Quick Deployment Guide - jStudyRoom

## For Vercel Production Deployment

### Step 1: Update Vercel Environment Variables

Go to: **Vercel Dashboard → jstudyroom → Settings → Environment Variables**

Update these 4 critical variables:

```env
DATABASE_URL
postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require

DIRECT_URL
postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require

NEXTAUTH_URL
https://jstudyroom.dev

NEXTAUTH_SECRET
Qx13aG3EUedHk21Y4iX60Zqs0So3KmfqULb1MafTYIc=
```

**Important Notes:**
- ⚠️ Password must be URL-encoded: `FlipBook123%21` (not `FlipBook123!`)
- ⚠️ Port must be `5432` (not `6543`)
- ⚠️ Include `pgbouncer=true&sslmode=require` in DATABASE_URL

### Step 2: Deploy

```bash
git add .
git commit -m "fix: stabilize database connection and login"
git push origin main
```

Vercel will automatically deploy.

### Step 3: Verify

1. **Check Health:**
   ```
   https://jstudyroom.dev/api/health
   ```
   Should show: `"database": "connected"`

2. **Test Login:**
   ```
   https://jstudyroom.dev/login
   ```
   Try logging in with your credentials.

3. **Check Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Logs
   - Look for any errors

---

## For Local Development

### Quick Start

```bash
# 1. Clean restart
Remove-Item -Recurse -Force .next

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Test database connection
npx tsx scripts/diagnose-network.ts

# 5. Start dev server
npm run dev
```

### Test Login

Navigate to: `http://localhost:3001/login`

---

## Troubleshooting

### Login Fails with "Database temporarily unavailable"

**Check:**
1. Vercel environment variables are correct
2. Password is URL-encoded (`%21` not `!`)
3. Port is `5432` (not `6543`)
4. Supabase database is healthy (check Supabase dashboard)

### Prisma CLI Fails Locally

```bash
# Try with direct connection
npx prisma db pull

# If still fails, check:
# - Is port 5432 blocked by firewall?
# - Try using a VPN
# - Use Supabase Studio instead
```

### "Can't reach database server" Error

**This means:**
- Wrong connection string
- Network/firewall blocking port 5432
- Supabase database is down

**Fix:**
1. Verify DATABASE_URL format
2. Check Supabase dashboard
3. Test with: `npx tsx scripts/diagnose-network.ts`

---

## Success Checklist

- [ ] Vercel environment variables updated
- [ ] Deployed to production
- [ ] /api/health shows "database": "connected"
- [ ] Login works at https://jstudyroom.dev/login
- [ ] No errors in Vercel logs
- [ ] Local dev works with `npm run dev`

---

## Need Help?

1. Check `DATABASE_LOGIN_FIX_COMPLETE.md` for detailed documentation
2. Check `PRODUCTION_LOGIN_STABLE.md` for comprehensive guide
3. Run `npx tsx scripts/diagnose-network.ts` to test connectivity
4. Check Vercel logs for specific errors
5. Check Supabase dashboard for database health

---

**That's it! Your application should now work reliably in production.** 🎉
