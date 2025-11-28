import { PrismaClient } from '@prisma/client';

// Test with DIRECT_URL instead of pooler
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function testDirectConnection() {
  try {
    console.log('🔍 Testing DIRECT connection to Supabase...');
    console.log('DIRECT_URL:', process.env.DIRECT_URL?.replace(/:[^:@]+@/, ':****@'));
    
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query executed successfully:', result);
    
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible. Total users: ${userCount}`);
    
    console.log('\n✅ Direct connection works!');
    return true;
    
  } catch (error: any) {
    console.error('❌ Direct connection failed:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testDirectConnection().then(success => {
  process.exit(success ? 0 : 1);
});
