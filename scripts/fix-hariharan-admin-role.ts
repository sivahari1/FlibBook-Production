import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'hariharanr@gmail.com';

  console.log('Checking current status for:', email);

  // Check current status
  const currentUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      userRole: true,
      isActive: true,
      emailVerified: true,
    },
  });

  if (!currentUser) {
    console.log('❌ User not found!');
    return;
  }

  console.log('\n📋 Current Status:');
  console.log('Email:', currentUser.email);
  console.log('Name:', currentUser.name);
  console.log('Role:', currentUser.role);
  console.log('UserRole:', currentUser.userRole);
  console.log('Active:', currentUser.isActive);
  console.log('Email Verified:', currentUser.emailVerified);

  // Update to ADMIN
  console.log('\n🔄 Updating to ADMIN role...');

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      role: 'ADMIN',
      userRole: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log('\n✅ Update Complete!');
  console.log('Email:', updatedUser.email);
  console.log('Name:', updatedUser.name);
  console.log('Role:', updatedUser.role);
  console.log('UserRole:', updatedUser.userRole);
  console.log('Active:', updatedUser.isActive);
  console.log('Email Verified:', updatedUser.emailVerified);

  console.log('\n🎉 Hariharan R is now a SUPER ADMIN with full privileges!');
  console.log('Same as sivaramj83@gmail.com');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
