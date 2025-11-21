import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHariharanAdmin() {
  try {
    console.log('🔍 Checking hariharnr@gmail.com admin account...\n');
    
    const user = await prisma.user.findUnique({
      where: { email: 'hariharnr@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
        emailVerified: true,
        passwordHash: true,
      }
    });
    
    if (!user) {
      console.error('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Name:', user.name);
    console.log('- Role:', user.userRole);
    console.log('- Active:', user.isActive);
    console.log('- Email Verified:', user.emailVerified);
    console.log('- Password Hash:', user.passwordHash.substring(0, 30) + '...');
    
    // Test database connection with a simple query
    console.log('\n🔍 Testing database connection...');
    const count = await prisma.user.count();
    console.log('✅ Database connection OK - Total users:', count);
    
    // Check if there are any access requests
    const pendingRequests = await prisma.accessRequest.count({ 
      where: { status: 'PENDING' } 
    });
    console.log('✅ Access requests query OK - Pending:', pendingRequests);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHariharanAdmin();
