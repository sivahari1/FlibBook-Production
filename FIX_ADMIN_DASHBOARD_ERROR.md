# Fix Admin Dashboard Error

## 🚀 Quick Fix (2 minutes)

1. Go to Supabase → SQL Editor
2. Copy and run the SQL from `prisma/fix-admin-dashboard.sql`
3. Refresh your admin dashboard
4. Click "My Documents" - it should work now!

---

## Problem
When clicking "My Documents" in the Admin page, you get a "Something went wrong" error.

## Root Cause
The admin user in the database might be missing required fields like:
- `subscription` (should be "free" by default)
- `storageUsed` (should be 0 by default)
- `emailVerified` (should be true for admin)
- `isActive` (should be true)

## Solution

### Solution: Fix via Supabase SQL Editor

Since the script requires local database access, use the SQL approach instead:

1. **Go to Supabase Dashboard**
   - Open your project at https://supabase.com
   - Click on "SQL Editor" in the left sidebar

2. **Run the Fix SQL**
   - Copy the contents of `prisma/fix-admin-dashboard.sql`
   - Or copy this SQL:

   ```sql
   -- Fix admin users with missing fields
   UPDATE users
   SET 
     subscription = COALESCE(subscription, 'free'),
     "storageUsed" = COALESCE("storageUsed", 0),
     "emailVerified" = true,
     "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()),
     "isActive" = true,
     "updatedAt" = NOW()
   WHERE "userRole" = 'ADMIN';
   ```

3. **Click "Run" to execute the SQL**

4. **Verify the fix:**
   ```sql
   SELECT 
     email, 
     "userRole", 
     subscription, 
     "storageUsed", 
     "emailVerified", 
     "isActive"
   FROM users
   WHERE "userRole" = 'ADMIN';
   ```

   You should see:
   - subscription = 'free'
   - storageUsed = 0
   - emailVerified = true
   - isActive = true

## What Was Fixed in the Code

I've also added better error handling to the dashboard page to prevent similar issues:

1. **Better error messages** - Now shows specific error details
2. **Null checks** - Handles missing `storageUsed` and `documents` fields
3. **Default values** - Uses safe defaults when fields are missing

## Testing

After applying the fix:

1. ✅ Log in as admin user
2. ✅ Click "My Documents" from admin dashboard
3. ✅ Should see the regular dashboard with upload/share features
4. ✅ Upload a document
5. ✅ Share a document with watermark
6. ✅ Preview a document

## Files Changed

- `app/dashboard/page.tsx` - Added error handling and null checks
- `prisma/fix-admin-user-fields.ts` - Script to fix admin user data

## Deployment

The code fixes have been pushed to GitHub. After running the database fix script, the admin dashboard should work perfectly.

---

**Status**: Ready to fix
**Priority**: High
**Estimated Time**: 2 minutes
