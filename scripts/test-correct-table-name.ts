import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Create Prisma client with explicit connection
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testUser() {
  try {
    console.log('🔍 Testing Prisma connection with correct table name...\n');
    
    // Try to connect
    await prisma.$connect();
    console.log('✅ Prisma connected successfully!\n');
    
    // Try to count users
    const userCount = await prisma.user.count();
    console.log(`📊 Total users: ${userCount}\n`);
    
    // Try to find the specific user
    const user = await prisma.user.findUnique({
      where: { email: 'sivaramj83@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User sivaramj83@gmail.com not found');
      
      // List all users
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
      });
      console.log('\n📋 All users in database:');
      console.log(allUsers);
      return;
    }
    
    console.log('✅ User found!');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('UserRole:', user.userRole);
    console.log('Active:', user.isActive);
    console.log('Has password:', !!user.passwordHash);
    
    // Test password
    if (user.passwordHash) {
      const testPassword = 'Admin123!';
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`\n🔐 Password test for "${testPassword}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (isValid) {
        console.log('\n🎉 SUCCESS! You can now login with:');
        console.log('Email: sivaramj83@gmail.com');
        console.log('Password: Admin123!');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUser();
