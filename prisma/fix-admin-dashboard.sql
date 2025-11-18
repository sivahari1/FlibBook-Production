-- Fix Admin User Fields for Dashboard Access
-- Run this in Supabase SQL Editor

-- Step 1: Check current admin user status
SELECT 
  id,
  email, 
  "userRole", 
  subscription, 
  "storageUsed", 
  "emailVerified",
  "emailVerifiedAt",
  "isActive"
FROM users
WHERE "userRole" = 'ADMIN';

-- Step 2: Fix admin users with missing fields
UPDATE users
SET 
  subscription = COALESCE(subscription, 'free'),
  "storageUsed" = COALESCE("storageUsed", 0),
  "emailVerified" = true,
  "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()),
  "isActive" = true,
  "updatedAt" = NOW()
WHERE "userRole" = 'ADMIN';

-- Step 3: Verify the fix
SELECT 
  id,
  email, 
  "userRole", 
  subscription, 
  "storageUsed", 
  "emailVerified",
  "emailVerifiedAt",
  "isActive",
  "updatedAt"
FROM users
WHERE "userRole" = 'ADMIN';

-- Expected result:
-- - subscription should be 'free'
-- - storageUsed should be 0
-- - emailVerified should be true
-- - emailVerifiedAt should have a timestamp
-- - isActive should be true
