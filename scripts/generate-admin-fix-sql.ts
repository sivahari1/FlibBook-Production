import bcrypt from 'bcryptjs';

async function generateSQL() {
  const email = 'sivaramj83@gmail.com';
  const password = 'Admin123!';
  
  console.log('\n🔧 Generating SQL to fix admin login...\n');
  
  // Generate password hash
  const passwordHash = await bcrypt.hash(password, 12);
  
  console.log('Copy and paste this SQL into your Supabase SQL Editor:\n');
  console.log('═'.repeat(80));
  console.log(`
-- Fix Admin Login for ${email}
-- This will reset password to: ${password}

UPDATE users
SET 
  "passwordHash" = '${passwordHash}',
  "userRole" = 'ADMIN',
  "emailVerified" = true,
  "isActive" = true,
  "subscription" = 'free',
  "updatedAt" = NOW()
WHERE email = '${email}';

-- Verify the update
SELECT 
  id, 
  email, 
  "userRole", 
  "emailVerified", 
  "isActive", 
  subscription,
  "updatedAt"
FROM users
WHERE email = '${email}';
`);
  console.log('═'.repeat(80));
  console.log('\n✅ After running this SQL, you can login with:');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log('\n');
}

generateSQL();
