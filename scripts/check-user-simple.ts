import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkUser() {
  try {
    console.log('🔍 Checking user: sivaramj83@gmail.com');
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'sivaramj83@gmail.com' }
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found!');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Active:', user.isActive);
    console.log('Has password hash:', !!user.passwordHash);
    
    // Test password
    const testPassword = 'Admin123!';
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`\n🔐 Password "${testPassword}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
