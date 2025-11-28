import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnectionWithRetry(maxRetries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔄 Connection attempt ${attempt}/${maxRetries}...`);
      
      // Test connection
      await prisma.$connect();
      console.log('✅ Connected to database');
      
      // Test query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Query executed successfully:', result);
      
      // Test user table
      const userCount = await prisma.user.count();
      console.log(`✅ User table accessible. Total users: ${userCount}`);
      
      console.log('\n✅ All connection tests passed!');
      return true;
      
    } catch (error: any) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.error('\n❌ All connection attempts failed');
        console.error('Full error:', error);
        return false;
      }
    }
  }
  
  return false;
}

async function main() {
  console.log('🔍 Testing Supabase connection with retry logic...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  
  const success = await testConnectionWithRetry();
  
  await prisma.$disconnect();
  process.exit(success ? 0 : 1);
}

main();
