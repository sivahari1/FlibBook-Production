import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetSivaPassword() {
  console.log('🔧 Resetting Siva Account Password\n');
  
  try {
    await prisma.$connect();
    
    const email = 'sivaramj83@gmail.com';
    const newPassword = 'Admin@123';
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update the user
    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        isActive: true,
        emailVerified: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
        emailVerified: true
      }
    });
    
    console.log('✅ Password reset successful!\n');
    console.log('User Details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.userRole}`);
    console.log(`  Active: ${user.isActive}`);
    console.log(`  Email Verified: ${user.emailVerified}`);
    console.log(`\n  New Password: ${newPassword}`);
    
    // Verify the password works
    const verifyUser = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true }
    });
    
    if (verifyUser) {
      const isValid = await bcrypt.compare(newPassword, verifyUser.passwordHash);
      console.log(`\n✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetSivaPassword();
