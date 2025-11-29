import { prisma } from '../lib/db';

async function testPoolerConnection() {
  console.log('🔍 Testing database connection with session pooler...\n');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    // Test query
    console.log('2. Testing query execution...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query executed successfully:', result, '\n');
    
    // Test user table access
    console.log('3. Testing user table access...');
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database\n`);
    
    // Test specific user
    console.log('4. Testing user lookup...');
    const user = await prisma.user.findUnique({
      where: { email: 'sivaroarj@gmail.com' }
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Active: ${user.isActive}`);
    } else {
      console.log('❌ User not found');
    }
    
    console.log('\n✅ All tests passed! Database connection is working correctly.');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPoolerConnection();
