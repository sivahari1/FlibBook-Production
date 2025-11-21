# 🚀 QUICK FIX: sivaramj83@gmail.com Password

## ⚡ Fast Solution (2 minutes)

### Step 1: Open Supabase SQL Editor
Go to: https://supabase.com/dashboard → Your Project → SQL Editor

### Step 2: Run This SQL
```sql
UPDATE "User"
SET "passwordHash" = '$2b$12$tfuSdLdklWEGGsge16p8l.Hy.lgr6mQjMyiH3wRnoSifkk4I1cqmu'
WHERE email = 'sivaramj83@gmail.com';
```

### Step 3: Login
- **Email:** sivaramj83@gmail.com
- **Password:** Jsrk@9985

## ✅ Done!

The password will work on both local and Vercel immediately after running the SQL.

---

## 📋 What This Does

- Updates the password hash in the database
- Uses bcrypt with 12 rounds (same as your app)
- Hash is pre-verified and tested
- No code changes needed

## 🔍 Verify It Worked

Run this SQL to check:
```sql
SELECT email, "userRole", "isActive", LEFT("passwordHash", 30) as hash
FROM "User"
WHERE email = 'sivaramj83@gmail.com';
```

Should show:
- `userRole`: ADMIN
- `isActive`: true
- `hash`: $2b$12$tfuSdLdklWEGGsge16p8l...

---

For detailed instructions, see: `FIX_SIVA_PASSWORD_INSTRUCTIONS.md`
