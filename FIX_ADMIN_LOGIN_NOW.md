# 🔧 Fix Admin Login - Quick Guide

## Problem
- Admin login with `sivaramj83@gmail.com` and password `Admin123!` is not working
- Forgot password functionality is also not working

## Root Cause
After adding admin features (upload, sharing, preview, bookshop management), the admin user account may have:
1. Incorrect password hash
2. `emailVerified` set to `false`
3. `userRole` not set to `ADMIN`
4. `isActive` set to `false`

## Solution

### Option 1: Use the Fix Admin Tool (Recommended)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open the fix admin page in your browser:**
   ```
   http://localhost:3000/fix-admin.html
   ```

3. **Fill in the form:**
   - Admin Email: `sivaramj83@gmail.com`
   - Secret Key: `fix-admin-login-2024`
   - New Password: `Admin123!` (or any password you want)

4. **Click "1. Diagnose Issues"** to see what's wrong

5. **Click "2. Fix Login & Reset Password"** to fix all issues

6. **Try logging in** at http://localhost:3000/login

### Option 2: Use Prisma Studio

1. **Open Prisma Studio:**
   ```bash
   npx prisma studio
   ```

2. **Navigate to the `User` model**

3. **Find the user with email `sivaramj83@gmail.com`**

4. **Update the following fields:**
   - `userRole`: `ADMIN`
   - `emailVerified`: `true`
   - `isActive`: `true`
   - `subscription`: `free`

5. **Generate a new password hash:**
   ```bash
   npx tsx scripts/generate-password-hash.ts "Admin123!"
   ```

6. **Copy the hash and update the `passwordHash` field in Prisma Studio**

### Option 3: Run SQL Directly

If you have access to your Supabase dashboard:

```sql
-- First, check the current state
SELECT id, email, "userRole", "emailVerified", "isActive", subscription
FROM users
WHERE email = 'sivaramj83@gmail.com';

-- Fix the user (you'll need to generate the password hash separately)
UPDATE users
SET 
  "userRole" = 'ADMIN',
  "emailVerified" = true,
  "isActive" = true,
  "subscription" = 'free'
WHERE email = 'sivaramj83@gmail.com';
```

## For Production (Vercel)

1. **Add the environment variable in Vercel:**
   - Go to your Vercel project settings
   - Add `ADMIN_FIX_SECRET` with value `fix-admin-login-2024`
   - Redeploy

2. **Access the fix page:**
   ```
   https://your-domain.vercel.app/fix-admin.html
   ```

3. **Follow the same steps as Option 1**

## Verify the Fix

After fixing, you should be able to:
1. ✅ Login with `sivaramj83@gmail.com` and `Admin123!`
2. ✅ Access `/admin` dashboard
3. ✅ Upload documents
4. ✅ Manage bookshop items
5. ✅ Share documents
6. ✅ Preview documents

## Security Note

⚠️ **Important:** After fixing the admin login, you should:
1. Remove or secure the `/api/admin/fix-login` endpoint
2. Remove the `ADMIN_FIX_SECRET` from your environment variables
3. Delete the `public/fix-admin.html` file

Or at minimum, change the `ADMIN_FIX_SECRET` to a strong random value that only you know.

## Troubleshooting

### "Unauthorized" error
- Make sure `ADMIN_FIX_SECRET` is set correctly in your `.env.local` file
- Restart your development server after adding the environment variable

### "User not found" error
- Double-check the email address
- The user might not exist in the database - you may need to create it first

### Still can't login after fixing
- Clear your browser cookies and cache
- Try in an incognito/private window
- Check the browser console for errors
- Check the server logs for authentication errors

## Need More Help?

If you're still having issues, check:
1. The server logs when you try to login
2. The browser console for any JavaScript errors
3. The network tab to see the API responses
4. Your database connection is working properly
