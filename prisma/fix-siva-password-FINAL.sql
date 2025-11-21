-- ============================================
-- FIX PASSWORD FOR sivaramj83@gmail.com
-- New Password: Jsrk@9985
-- Generated: 2025
-- ============================================

-- Step 1: Check current user status
SELECT 
    id, 
    email, 
    name, 
    "userRole", 
    "isActive", 
    "emailVerified",
    LEFT("passwordHash", 30) as "current_hash_preview"
FROM "User"
WHERE email = 'sivaramj83@gmail.com';

-- Step 2: Update password with correct bcrypt hash (12 rounds)
-- Password: Jsrk@9985
-- Hash verified and tested
UPDATE "User"
SET "passwordHash" = '$2b$12$tfuSdLdklWEGGsge16p8l.Hy.lgr6mQjMyiH3wRnoSifkk4I1cqmu'
WHERE email = 'sivaramj83@gmail.com';

-- Step 3: Verify the update
SELECT 
    email, 
    name,
    "userRole", 
    "isActive", 
    "emailVerified",
    LEFT("passwordHash", 30) as "new_hash_preview",
    LENGTH("passwordHash") as "hash_length"
FROM "User"
WHERE email = 'sivaramj83@gmail.com';

-- ============================================
-- EXPECTED RESULT:
-- Email: sivaramj83@gmail.com
-- Password: Jsrk@9985
-- Hash should start with: $2b$12$tfuSdLdklWEGGsge16p8l
-- Hash length should be: 60 characters
-- ============================================
