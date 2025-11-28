import { prisma } from '../lib/db';
import bcrypt from 'bcryptjs';

async function resetPassword() {
  const email = 'sivaramj83@gmail.com';
  const newPassword = 'Siva@1234';

  console.log('🔄 Resetting password for production...\n');

  try {
    // Connect to database
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Hash the new password
    console.log('\n🔐 Hashing new password...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    console.log(`✅ Password hashed (length: ${passwordHash.length})`);

    // Update the password
    console.log('\n💾 Updating password in database...');
    await prisma.user.update({
      where: { email },
      data: { passwordHash }
    });

    console.log('✅ Password updated successfully!');

    // Verify the new password works
    console.log('\n🧪 Verifying new password...');
    const updatedUser = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true }
    });

    if (updatedUser) {
      const isValid = await bcrypt.compare(newPassword, updatedUser.passwordHash);
      console.log(`✅ Password verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log('\n✅ Password reset complete!');
    console.log(`\nYou can now login with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
