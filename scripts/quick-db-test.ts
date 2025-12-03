// Quick database connectivity test
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickTest() {
  console.log('Testing database connection...\n');
  
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ SUCCESS! Database is connected and working.');
    console.log('   Query result:', result);
    
    // Try to count documents
    const count = await prisma.document.count();
    console.log(`\n✅ Found ${count} documents in database`);
    
    console.log('\n🎉 Your database is working! The preview error must be something else.');
    console.log('   Try:');
    console.log('   1. Clear browser cache');
    console.log('   2. Restart dev server');
    console.log('   3. Check browser console for errors');
    
  } catch (error: any) {
    console.log('❌ FAILED! Cannot connect to database.\n');
    console.log('Error:', error.message);
    console.log('\nMost likely causes:');
    console.log('1. Database is paused (Supabase free tier)');
    console.log('   → Go to supabase.com/dashboard and resume your project');
    console.log('2. Wrong DATABASE_URL in .env file');
    console.log('   → Check Project Settings → Database → Connection String');
    console.log('3. Network/firewall blocking connection');
    console.log('   → Try from different network or check firewall');
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
