import bcrypt from 'bcryptjs';

async function testPassword() {
  const password = 'Admin123!';
  const hashFromDB = '$2b$12$LIIiLpt/oyaGikgwW3nGEeKi0E0QpDCqUftJpvQCBzCy0mDBfQggK';
  
  console.log('\n🔐 Testing password hash...\n');
  console.log(`Password: ${password}`);
  console.log(`Hash from DB: ${hashFromDB}`);
  
  // Test if password matches the hash
  const isMatch = await bcrypt.compare(password, hashFromDB);
  console.log(`\nDoes password match? ${isMatch ? '✅ YES' : '❌ NO'}`);
  
  if (!isMatch) {
    console.log('\n⚠️  Password does NOT match! Generating new hash...\n');
    
    // Generate new hash with bcrypt rounds 10 (NextAuth default)
    const newHash10 = await bcrypt.hash(password, 10);
    console.log('New hash (rounds=10):');
    console.log(newHash10);
    
    // Test the new hash
    const newMatch = await bcrypt.compare(password, newHash10);
    console.log(`\nDoes new hash work? ${newMatch ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n📋 Run this SQL in Supabase:');
    console.log('═'.repeat(80));
    console.log(`
UPDATE users
SET "passwordHash" = '${newHash10}'
WHERE email = 'sivaramj83@gmail.com';
    `);
    console.log('═'.repeat(80));
  }
}

testPassword();
