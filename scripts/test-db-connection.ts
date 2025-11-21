import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
  } catch (error: any) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Your Supabase database might be paused (free tier)');
      console.log('2. Go to https://supabase.com/dashboard');
      console.log('3. Select your project and click "Resume" or "Restore"');
      console.log('4. Wait 1-2 minutes for the database to wake up');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
