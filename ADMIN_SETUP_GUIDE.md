# Admin Account Setup Guide

## Issue
The admin accounts for `sivaramj83@gmail.com` and `jsrkrishna3@gmail.com` need to be created or updated to ADMIN role in the database.

## Solution Options

### Option 1: Create Admin Accounts (Recommended if users don't exist)

If the users don't exist in the database yet, run the seed script with a password:

```bash
# Set the admin password (use a secure password)
ADMIN_SEED_PASSWORD="YourSecurePassword123!" npx tsx prisma/create-or-update-admins.ts
```

This will:
- Create both admin accounts if they don't exist
- Set their role to ADMIN
- Mark emails as verified
- Set accounts as active
- Use the provided password for both accounts

### Option 2: Update Existing Users to Admin (If users already exist)

If the users already exist in the database with different roles, the script will automatically update them to ADMIN role without changing their passwords:

```bash
npx tsx prisma/create-or-update-admins.ts
```

### Option 3: Manual Database Update (If you have database access)

If you have direct access to the database (via Prisma Studio or SQL), you can manually update the users:

#### Using Prisma Studio:
```bash
npx prisma studio
```

Then:
1. Open the `User` table
2. Find the users by email
3. Update their `userRole` field to `ADMIN`
4. Update their `role` field to `ADMIN` (for compatibility)
5. Set `emailVerified` to `true`
6. Set `isActive` to `true`

#### Using SQL (Supabase SQL Editor):
```sql
-- Update sivaramj83@gmail.com to ADMIN
UPDATE "User"
SET 
  "userRole" = 'ADMIN',
  "role" = 'ADMIN',
  "emailVerified" = true,
  "isActive" = true
WHERE email = 'sivaramj83@gmail.com';

-- Update jsrkrishna3@gmail.com to ADMIN
UPDATE "User"
SET 
  "userRole" = 'ADMIN',
  "role" = 'ADMIN',
  "emailVerified" = true,
  "isActive" = true
WHERE email = 'jsrkrishna3@gmail.com';

-- Verify the updates
SELECT id, email, name, "userRole", "emailVerified", "isActive"
FROM "User"
WHERE "userRole" = 'ADMIN';
```

## Verification

After running any of the above options, verify the admin accounts:

```bash
npx tsx prisma/create-or-update-admins.ts
```

This will show you all admin users in the database.

## Login Issues

If you still can't login after setting up admin accounts, check:

### 1. Password Issues
- If you created new accounts, use the password you set in `ADMIN_SEED_PASSWORD`
- If you updated existing accounts, use their existing passwords
- Try password reset if you don't remember the password

### 2. Email Verification
- Ensure `emailVerified` is set to `true` in the database
- The script automatically sets this, but verify in Prisma Studio

### 3. Account Active Status
- Ensure `isActive` is set to `true` in the database
- The script automatically sets this, but verify in Prisma Studio

### 4. Role Check
- Ensure both `userRole` and `role` fields are set to `ADMIN`
- The script sets both for compatibility

## Password Reset for Admin Users

If you need to reset the password for an admin user:

### Option A: Use the forgot password flow
1. Go to `/login`
2. Click "Forgot Password?"
3. Enter the admin email
4. Check email for reset link
5. Set new password

### Option B: Manual password reset via script

Create a file `prisma/reset-admin-password.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error('Usage: npx tsx prisma/reset-admin-password.ts <email> <new-password>')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash }
  })

  console.log(`✅ Password updated for ${user.email}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Then run:
```bash
npx tsx prisma/reset-admin-password.ts sivaramj83@gmail.com "NewPassword123!"
npx tsx prisma/reset-admin-password.ts jsrkrishna3@gmail.com "NewPassword123!"
```

## Current Database Status

To check the current status of users in your database:

```bash
# Check all users
npx prisma studio

# Or use this script to list all users
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log('All users:');
  users.forEach(u => console.log(\`- \${u.email} (Role: \${u.userRole}, Verified: \${u.emailVerified}, Active: \${u.isActive})\`));
}).finally(() => prisma.\$disconnect());
"
```

## Troubleshooting

### "User not found" error
- The users don't exist in the database
- Run Option 1 with `ADMIN_SEED_PASSWORD` to create them

### "Invalid credentials" error
- Password is incorrect
- Use password reset flow or manual password reset

### "Email not verified" error
- Run the update script to set `emailVerified` to `true`
- Or manually update in database

### "Account is inactive" error
- Run the update script to set `isActive` to `true`
- Or manually update in database

### "Access denied" error after login
- User role is not ADMIN
- Run the update script to set role to ADMIN
- Or manually update in database

## Production Deployment

For production, ensure you:

1. Set `ADMIN_SEED_PASSWORD` in Vercel environment variables
2. Run the seed script after deploying:
   ```bash
   # In Vercel, this runs automatically if configured in package.json
   # Or run manually via Vercel CLI
   vercel env pull
   npx tsx prisma/create-or-update-admins.ts
   ```

3. Document the admin passwords securely
4. Consider using a password manager for admin credentials

## Security Notes

- Never commit passwords to git
- Use strong passwords for admin accounts
- Store admin passwords securely (password manager)
- Consider enabling 2FA for admin accounts (future enhancement)
- Regularly audit admin access logs
- Rotate admin passwords periodically

---

**Need Help?**

If you're still having issues:
1. Check the database directly via Prisma Studio: `npx prisma studio`
2. Review the User table for the admin emails
3. Verify the `userRole`, `emailVerified`, and `isActive` fields
4. Check application logs for authentication errors
5. Try the password reset flow

