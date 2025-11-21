import bcrypt from 'bcryptjs';

async function generateSQL() {
  const email = 'sivaramj83@gmail.com';
  const newPassword = 'Admin123!';
  
  console.log('🔐 Generating password reset SQL...\n');
  console.log('Email:', email);
  console.log('New Password:', newPassword);
  console.log('');
  
  // Generate bcrypt hash
  const hash = await bcrypt.hash(newPassword, 10);
  
  console.log('Generated Hash:', hash);
  console.log('');
  console.log('📋 Copy and run this SQL in your Supabase SQL Editor:\n');
  console.log('─'.repeat(80));
  console.log(`
-- Reset password for ${email}
UPDATE "users"
SET "passwordHash" = '${hash}',
    "updatedAt" = NOW()
WHERE email = '${email}';

-- Verify the update
SELECT email, name, role, "userRole", "isActive",
       LENGTH("passwordHash") as hash_length,
       "updatedAt"
FROM "users"
WHERE email = '${email}';
`);
  console.log('─'.repeat(80));
  console.log('\n✅ After running this SQL, you can login with:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${newPassword}`);
}

generateSQL();
