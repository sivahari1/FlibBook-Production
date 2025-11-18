-- Reset Password for sivaramj83@gmail.com
-- This will set the password to: Admin123!
-- Run this in Supabase SQL Editor

-- Step 1: Check current user
SELECT 
  id,
  email,
  "userRole",
  "emailVerified",
  "isActive"
FROM users
WHERE email = 'sivaramj83@gmail.com';

-- Step 2: Update password
-- The hash below is for password: Admin123!
-- Generated using bcrypt with 10 rounds
UPDATE users
SET 
  "passwordHash" = '$2a$10$rZ5c3HqGJ8vN9xKp2YwHZeF6Q8mKJ5xN3wYvL7qR8tS9uA1bC2dEe',
  "emailVerified" = true,
  "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()),
  "isActive" = true,
  "updatedAt" = NOW()
WHERE email = 'sivaramj83@gmail.com';

-- Step 3: Verify the update
SELECT 
  email,
  "userRole",
  "emailVerified",
  "isActive",
  LENGTH("passwordHash") as password_hash_length
FROM users
WHERE email = 'sivaramj83@gmail.com';

-- Expected result:
-- - emailVerified should be true
-- - isActive should be true
-- - password_hash_length should be 60
