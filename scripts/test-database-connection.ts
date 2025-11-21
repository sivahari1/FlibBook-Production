import { PrismaClient } from '@prisma/client';

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables!');
    console.log('\n📝 Please create a .env.local file with:');
    console.log('DATABASE_URL="postgresql://postgres:[PASSWORD]@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres"');
    return;
  }
  
  console.log('✅ DATABASE_URL is set');
  console.log('📍 Connection string:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔌 Attempting to connect to database...');
    
    // Test 1: Simple connection test
    await prisma.$connect();
    console.log('✅ Connection established!');
    
    // Test 2: Query test
    console.log('\n📊 Testing query execution...');
    const userCount = await prisma.user.count();
    console.log(`✅ Query successful! Found ${userCount} users in database`);
    
    // Test 3: Check specific user
    console.log('\n👤 Checking for hariharnr@gmail.com...');
    const admin = await prisma.user.findUnique({
      where: { email: 'hariharnr@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
      }
    });
    
    if (admin) {
      console.log('✅ Admin user found:');
      console.log('   - Email:', admin.email);
      console.log('   - Name:', admin.name);
      console.log('   - Role:', admin.userRole);
      console.log('   - Active:', admin.isActive);
    } else {
      console.log('⚠️  Admin user not found');
    }
    
    console.log('\n🎉 All tests passed! Database connection is working correctly.');
    console.log('\n✅ You can now run: npm run dev');
    
  } catch (error: any) {
    console.error('\n❌ Connection failed!');
    console.error('\n📋 Error details:');
    console.error(error.message);
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if Supabase database is paused');
    console.log('   → Go to https://supabase.com/dashboard');
    console.log('   → Click "Resume" if database is paused');
    console.log('');
    console.log('2. Verify your DATABASE_URL in .env.local');
    console.log('   → Make sure password is correct');
    console.log('   → No extra spaces or quotes');
    console.log('');
    console.log('3. Try using connection pooler:');
    console.log('   DATABASE_URL="postgresql://postgres.PROJECT:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"');
    console.log('');
    console.log('4. Check firewall/network settings');
    console.log('   → Port 5432 should be open');
    console.log('   → Try disabling VPN if using one');
    
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
