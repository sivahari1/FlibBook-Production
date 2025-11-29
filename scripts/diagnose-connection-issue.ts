import { PrismaClient } from '@prisma/client';

async function diagnoseConnection() {
  console.log('🔍 Diagnosing Database Connection...\n');
  
  // Test 1: Check environment variables
  console.log('1️⃣ Environment Variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✅ Set' : '❌ Missing');
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
  console.log('');
  
  // Test 2: Try to connect with Prisma
  console.log('2️⃣ Testing Prisma Connection...');
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
  
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
    
    // Test 3: Try a simple query
    console.log('\n3️⃣ Testing Database Query...');
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    // Test 4: Check if we can query a specific user
    console.log('\n4️⃣ Testing User Query...');
    const testUser = await prisma.user.findFirst({
      where: {
        email: 'sivaramj83@gmail.com'
      }
    });
    
    if (testUser) {
      console.log('✅ Found test user:', {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        isActive: testUser.isActive
      });
    } else {
      console.log('⚠️  Test user not found');
    }
    
  } catch (error: any) {
    console.error('❌ Connection Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Full Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseConnection();
