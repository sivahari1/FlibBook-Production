import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'Jsrk@9985';
  
  console.log('🔐 Generating bcrypt hash for password:', password);
  console.log('Using 12 rounds (same as application)...\n');
  
  // Generate hash with 12 rounds (same as auth.ts)
  const hash = await bcrypt.hash(password, 12);
  
  console.log('✅ Generated Hash:');
  console.log(hash);
  console.log('\n📋 SQL Update Statement:');
  console.log(`UPDATE users`);
  console.log(`SET "passwordHash" = '${hash}'`);
  console.log(`WHERE email = 'sivaramj83@gmail.com';`);
  
  // Verify the hash works
  console.log('\n🧪 Verifying hash...');
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification result:', isValid ? '✅ VALID' : '❌ INVALID');
  
  console.log('\n📝 Instructions:');
  console.log('1. Copy the SQL UPDATE statement above');
  console.log('2. Go to Supabase Dashboard > SQL Editor');
  console.log('3. Paste and run the SQL statement');
  console.log('4. Try logging in with:');
  console.log('   Email: sivaramj83@gmail.com');
  console.log('   Password: Jsrk@9985');
}

generateHash();
