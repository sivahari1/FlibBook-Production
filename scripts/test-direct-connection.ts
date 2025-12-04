import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DIRECT_URL;

console.log('🔍 Testing DIRECT connection...\n');
console.log('📍 Direct URL:', directUrl?.replace(/:[^:@]+@/, ':****@'));

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

async function testConnection() {
  try {
    console.log('🔌 Attempting direct connection...\n');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Direct connection successful!');
    console.log('📊 Test query result:', result);
    
    const userCount = await prisma.user.count();
    console.log(`\n👥 Users in database: ${userCount}`);
    
  } catch (error: any) {
    console.error('❌ Direct connection failed!');
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
