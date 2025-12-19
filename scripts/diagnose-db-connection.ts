import { prisma } from '@/lib/db';

async function diagnoseDatabaseConnection() {
  console.log('🔍 Diagnosing database connection...');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Basic connection successful');
    
    // Test user count
    console.log('2. Testing user count query...');
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users`);
    
    // Test more complex query
    console.log('3. Testing complex query...');
    const userWithDocs = await prisma.user.findFirst({
      include: {
        documents: {
          take: 1
        }
      }
    });
    console.log(`✅ Complex query successful, found user: ${userWithDocs?.email || 'none'}`);
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes("Can't reach database server")) {
        console.log('\n💡 Troubleshooting suggestions:');
        console.log('1. Check if your Supabase project is paused');
        console.log('2. Verify your DATABASE_URL is correct');
        console.log('3. Check your internet connection');
        console.log('4. Try restarting the development server');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseDatabaseConnection();