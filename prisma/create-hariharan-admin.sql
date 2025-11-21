-- Create admin user: hariharanr@gmail.com
-- Default password: Admin@123
-- Password hash generated with bcrypt (10 rounds)

-- First, check if user exists and delete if present
DELETE FROM "User" WHERE email = 'hariharanr@gmail.com';

-- Insert the new admin user
INSERT INTO "User" (
  id,
  email,
  password,
  name,
  role,
  "emailVerified",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'hariharanr@gmail.com',
  '$2a$10$YourHashedPasswordHere', -- This needs to be replaced with actual bcrypt hash
  'Hariharan R',
  'ADMIN',
  true,
  true,
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT id, email, name, role, "emailVerified", "isActive" 
FROM "User" 
WHERE email = 'hariharanr@gmail.com';
