import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyPasswords() {
  console.log('🔐 Verifying Actual User Passwords\n');
  
  try {
    await prisma.$connect();
    
    const testCases = [
      { email: 'sivaramj83@gmail.com', passwords: ['Admin@123', 'FlipBook123!', 'Siva@123'] },
      { email: 'hariharanr@gmail.com', passwords: ['Admin@123', 'FlipBook123!', 'Hari@123'] }
    ];
    
    for (const testCase of testCases) {
      console.log(`Testing ${testCase.email}:`);
      
      const user = await prisma.user.findUnique({
        where: { email: testCase.email },
        select: { passwordHash: true, isActive: true, emailVerified: true }
      });
      
      if (!user) {
        console.log('  ❌ User not found\n');
        continue;
      }
      
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Email Verified: ${user.emailVerified}`);
      
      for (const password of testCase.passwords) {
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log(`  Password "${password}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPasswords();
