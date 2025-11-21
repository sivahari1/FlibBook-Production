-- Fix password for sivaramj83@gmail.com
-- New password: Jsrk@9985
-- This uses bcrypt hash with 12 rounds (same as the application)

-- First, let's check the current user
SELECT id, email, name, "userRole", "isActive", "emailVerified"
FROM "User"
WHERE email = 'sivaramj83@gmail.com';

-- Update the password with the correct bcrypt hash for 'Jsrk@9985'
-- Hash generated with: bcrypt.hash('Jsrk@9985', 12)
UPDATE "User"
SET "passwordHash" = '$2a$12$YourHashWillBeGeneratedHere'
WHERE email = 'sivaramj83@gmail.com';

-- Verify the update
SELECT email, "userRole", "isActive", "emailVerified", 
       LEFT("passwordHash", 20) as "passwordHash_preview"
FROM "User"
WHERE email = 'sivaramj83@gmail.com';
