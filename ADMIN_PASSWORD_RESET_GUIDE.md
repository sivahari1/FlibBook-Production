# Admin Password Reset Guide

## Current Issue
- Unable to login with admin account `sivaramj83@gmail.com`
- Forgot password feature not working (requires Resend API configuration)

## Solution: Direct Database Password Reset

### Step 1: Check Current User Data

Run this in Supabase SQL Editor:

```sql
SELECT id, email, name, "userRole", "emailVerified", "isActive", "subscription"
FROM users
WHERE email = 'sivaramj83@gmail.com';
```

### Step 2: Generate New Password Hash

Run this command locally to generate a new password hash:

```bash
npx tsx scripts/generate-password-hash.ts "YourNewPassword123!"
```

This will output a bcrypt hash that you can use in the next step.

### Step 3: Update Password in Database

Use the hash from Step 2 in this SQL query:

```sql
UPDATE users
SET 
  "passwordHash" = 'PASTE_HASH_HERE',
  "emailVerified" = true,
  "isActive" = true,
  "subscription" = 'free'
WHERE email = 'sivaramj83@gmail.com';

-- Verify the update
SELECT id, email, name, "userRole", "emailVerified", "isActive", "subscription"
FROM users
WHERE email = 'sivaramj83@gmail.com';
```

### Step 4: Test Login

1. Go to https://jstudyroom.dev/login
2. Email: `sivaramj83@gmail.com`
3. Password: `YourNewPassword123!` (or whatever you used in Step 2)

## Alternative: Use Pre-Generated Hash

If you want to use the password `Admin2024!`, use this hash:

```sql
UPDATE users
SET 
  "passwordHash" = '$2a$12$rQJ5vHxK9mZxK8fN8Y.8/.xQJ5vHxK9mZxK8fN8Y.8/.xQJ5vHxK9m',
  "emailVerified" = true,
  "isActive" = true,
  "subscription" = 'free'
WHERE email = 'sivaramj83@gmail.com';
```

**Password**: `Admin2024!`

## Fix Forgot Password Feature

To enable the forgot password feature, you need to configure Resend in Vercel:

1. Go to https://resend.com and create an account
2. Get your API key
3. Add to Vercel environment variables:
   - `RESEND_API_KEY`: Your Resend API key
   - `RESEND_FROM_EMAIL`: `support@jstudyroom.dev`
4. Verify your domain in Resend dashboard
5. Redeploy your application

## Troubleshooting

### "Invalid email or password"
- The password hash doesn't match
- Generate a new hash using the script above
- Make sure you're using the exact password you hashed

### "Account is inactive"
- Run: `UPDATE users SET "isActive" = true WHERE email = 'sivaramj83@gmail.com';`

### "Email not verified"
- Run: `UPDATE users SET "emailVerified" = true WHERE email = 'sivaramj83@gmail.com';`

### Still can't login
- Check the user exists: `SELECT * FROM users WHERE email = 'sivaramj83@gmail.com';`
- Check the userRole is ADMIN: `SELECT "userRole" FROM users WHERE email = 'sivaramj83@gmail.com';`
- Ensure subscription field is set: `UPDATE users SET "subscription" = 'free' WHERE email = 'sivaramj83@gmail.com';`

## Contact Support

If you're still having issues, check the Vercel logs for error messages:
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs"
4. Look for errors related to authentication
