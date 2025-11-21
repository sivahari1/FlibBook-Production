import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'sivaramj83@gmail.com';
  const newPassword = 'Admin123!';

  console.log('Resetting password for:', email);
  console.log('New password:', newPassword);

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  console.log('\nPassword hashed successfully');

  // Update the user
  const user = await prisma.user.update({
    where: { email },
    data: {
      passwordHash: hashedPassword,
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('\n✅ Password reset successful!');
  console.log('Email:', user.email);
  console.log('Name:', user.name);
  console.log('Role:', user.role);
  console.log('Active:', user.isActive);
  console.log('Email Verified:', user.emailVerified);

  // Verify the password works
  const isValid = await bcrypt.compare(newPassword, user.passwordHash);
  console.log('\n🔐 Password verification:', isValid ? '✅ VALID' : '❌ INVALID');

  console.log('\n📝 Login Credentials:');
  console.log('Email: sivaramj83@gmail.com');
  console.log('Password: Admin123!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
