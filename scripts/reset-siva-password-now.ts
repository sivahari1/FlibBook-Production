import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db';

async function resetPassword() {
  const email = 'sivaramj83@gmail.com';
  const newPassword = 'FlipBook123!';
  
  console.log('🔄 Resetting password for:', email);
  console.log('New password:', newPassword);
  console.log('');
  
  try {
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update the user
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        emailVerified: true,
        userRole: true
      }
    });
    
    console.log('✅ Password reset successful!');
    console.log('');
    console.log('User details:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Active:', user.isActive);
    console.log('   Email Verified:', user.emailVerified);
    console.log('   Role:', user.userRole);
    console.log('');
    console.log('✅ You can now login with:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Failed to reset password:', error);
    process.exit(1);
  }
}

resetPassword();
