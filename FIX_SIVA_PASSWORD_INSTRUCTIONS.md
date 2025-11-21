# Fix Password for sivaramj83@gmail.com

## Problem
Login failing for `sivaramj83@gmail.com` with password `Jsrk@9985` on both local and Vercel.

## Solution
The password hash needs to be regenerated with the correct bcrypt algorithm (12 rounds).

## Steps to Fix

### Option 1: Using Supabase SQL Editor (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click on "SQL Editor" in the left sidebar

2. **Run the SQL Script**
   - Copy the entire content from `prisma/fix-siva-password-FINAL.sql`
   - Paste it into the SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify the Results**
   - You should see 3 result sets:
     - Current user status (before update)
     - Update confirmation
     - New user status (after update)
   - Check that `hash_length` is 60 characters
   - Check that `new_hash_preview` starts with `$2b$12$`

4. **Test Login**
   - Go to your application login page
   - Email: `sivaramj83@gmail.com`
   - Password: `Jsrk@9985`
   - Should work on both local and Vercel

### Option 2: Using Direct SQL (Alternative)

If you prefer to run just the UPDATE statement:

```sql
UPDATE users
SET "passwordHash" = '$2b$12$tfuSdLdklWEGGsge16p8l.Hy.lgr6mQjMyiH3wRnoSifkk4I1cqmu'
WHERE email = 'sivaramj83@gmail.com';
```

## Login Credentials After Fix

- **Email:** sivaramj83@gmail.com
- **Password:** Jsrk@9985
- **Role:** ADMIN
- **Status:** Active

## Technical Details

- **Hash Algorithm:** bcrypt
- **Rounds:** 12 (same as application default)
- **Hash Format:** $2b$12$...
- **Hash Length:** 60 characters
- **Generated Hash:** `$2b$12$tfuSdLdklWEGGsge16p8l.Hy.lgr6mQjMyiH3wRnoSifkk4I1cqmu`

## Verification

The hash has been tested and verified:
- ✅ Hash generation successful
- ✅ Password verification successful
- ✅ Compatible with application's bcrypt.compare()
- ✅ Uses same rounds (12) as auth.ts

## Why This Works

1. **Consistent Hashing:** Uses the same bcrypt algorithm and rounds as the application
2. **Proper Format:** Hash is in the correct $2b$ format
3. **Verified:** Hash has been tested with bcrypt.compare() before deployment
4. **Database Compatible:** Works with PostgreSQL/Supabase

## Troubleshooting

If login still fails after running the SQL:

1. **Clear Browser Cache**
   - Clear cookies and cache
   - Try in incognito/private mode

2. **Check Database**
   ```sql
   SELECT email, "userRole", "isActive", "emailVerified", 
          LEFT("passwordHash", 30) as hash_preview
   FROM users
   WHERE email = 'sivaramj83@gmail.com';
   ```
   - Verify `isActive` is `true`
   - Verify `emailVerified` is `true`
   - Verify hash starts with `$2b$12$`

3. **Check Application Logs**
   - Look for authentication errors
   - Check if bcrypt.compare() is being called
   - Verify no rate limiting issues

4. **Verify Environment**
   - Ensure DATABASE_URL is correct in .env
   - Ensure Vercel environment variables are set
   - Check that the application is using the latest deployment

## Files Created

- `scripts/generate-siva-hash.ts` - Generates the bcrypt hash
- `scripts/fix-siva-password.ts` - Automated fix script (requires DB connection)
- `prisma/fix-siva-password-FINAL.sql` - SQL script to run in Supabase
- `FIX_SIVA_PASSWORD_INSTRUCTIONS.md` - This file

## Next Steps

After fixing the password:

1. Test login on local environment
2. Test login on Vercel/production
3. Document the working credentials securely
4. Consider implementing password reset via email for future issues
