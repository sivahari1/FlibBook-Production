import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking admin user: sivaramj83@gmail.com\n');

  const user = await prisma.user.findUnique({
    where: { email: 'sivaramj83@gmail.com' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      userRole: true,
      isActive: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  if (!user) {
    console.log('❌ User NOT FOUND in database!');
    console.log('The user sivaramj83@gmail.com does not exist.');
  } else {
    console.log('✅ User FOUND in database:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('UserRole:', user.userRole);
    console.log('Active:', user.isActive);
    console.log('Email Verified:', user.emailVerified);
    console.log('Password Hash:', user.passwordHash ? 'EXISTS (length: ' + user.passwordHash.length + ')' : 'MISSING');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
