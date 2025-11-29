// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

// Verify environment configuration
console.log('🔍 Environment Configuration Check\n');

console.log('✅ DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : '❌ Missing');
console.log('✅ DIRECT_URL:', process.env.DIRECT_URL ? 'Set' : '❌ Missing');
console.log('✅ NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Missing');
console.log('✅ NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set (hidden)' : '❌ Missing');
console.log('✅ SUPABASE_URL:', process.env.SUPABASE_URL || '❌ Missing');
console.log('✅ SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set (hidden)' : '❌ Missing');
console.log('✅ SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set (hidden)' : '❌ Missing');

console.log('\n📋 Configuration Summary:');
console.log('- Environment:', process.env.NODE_ENV || 'development');
console.log('- NextAuth URL:', process.env.NEXTAUTH_URL);
console.log('- App URL:', process.env.NEXT_PUBLIC_APP_URL);

// Check if DATABASE_URL has correct format
if (process.env.DATABASE_URL) {
  const hasCorrectUsername = process.env.DATABASE_URL.includes('postgres.zuhrivibcgudgsejsljo');
  console.log('\n🔐 Database URL Check:');
  console.log(hasCorrectUsername ? '✅ Username format is correct' : '❌ Username format is incorrect');
}

// Check if DIRECT_URL has correct format
if (process.env.DIRECT_URL) {
  const hasCorrectUsername = process.env.DIRECT_URL.includes('postgres.zuhrivibcgudgsejsljo');
  console.log('\n🔐 Direct URL Check:');
  console.log(hasCorrectUsername ? '✅ Username format is correct' : '❌ Username format is incorrect');
}

console.log('\n✨ All checks complete!');
