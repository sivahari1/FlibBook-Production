-- Delete Admin User: jsrkrishna3@gmail.com
-- ⚠️ WARNING: This will permanently delete the user and all associated data
-- Run this in Supabase SQL Editor

-- Step 1: Check the user before deletion
SELECT 
  id,
  email, 
  "userRole",
  "createdAt",
  (SELECT COUNT(*) FROM documents WHERE "userId" = users.id) as document_count
FROM users
WHERE email = 'jsrkrishna3@gmail.com';

-- Step 2: Delete the user (CASCADE will delete all related data)
-- Uncomment the line below to execute the deletion
-- DELETE FROM users WHERE email = 'jsrkrishna3@gmail.com';

-- Step 3: Verify deletion
-- SELECT email, "userRole" FROM users WHERE "userRole" = 'ADMIN';

-- Expected result after deletion:
-- Only sivaramj83@gmail.com should remain as ADMIN
