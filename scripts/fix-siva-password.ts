import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function fixSivaPassword() {
  try {
    console.log('🔧 Fixing password for sivaramj83@gmail.com...');
    
    const email = 'sivaramj83@gmail.com';
    const newPassword = 'Jsrk@9985';
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
      }
    });
    
    if (!user) {
      console.error('❌ User not found:', email);
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      userRole: user.userRole,
      isActive: user.isActive
    });
    
    // Hash the new password with bcrypt (12 rounds - same as auth.ts)
    console.log('🔐 Hashing password with bcrypt (12 rounds)...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    console.log('Generated hash:', passwordHash);
    
    // Update the password
    await prisma.user.update({
      where: { email },
      data: { passwordHash }
    });
    
    console.log('✅ Password updated successfully!');
    
    // Verify the password works
    console.log('\n🧪 Verifying password...');
    const updatedUser = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true }
    });
    
    if (updatedUser) {
      const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
      if (isValid) {
        console.log('✅ Password verification successful!');
        console.log('\n📋 Login credentials:');
        console.log('Email:', email);
        console.log('Password:', newPassword);
      } else {
        console.error('❌ Password verification failed!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSivaPassword();
