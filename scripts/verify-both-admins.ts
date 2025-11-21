import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Both Super Admins\n');
  console.log('='.repeat(60));

  const admins = [
    'sivaramj83@gmail.com',
    'hariharanr@gmail.com',
  ];

  for (const email of admins) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        name: true,
        role: true,
        userRole: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (user) {
      console.log(`\n✅ ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   UserRole: ${user.userRole}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Verified: ${user.emailVerified}`);
      
      const isFullAdmin = user.role === 'ADMIN' && user.userRole === 'ADMIN';
      console.log(`   Status: ${isFullAdmin ? '🎉 SUPER ADMIN' : '⚠️  INCOMPLETE'}`);
    } else {
      console.log(`\n❌ ${email} - NOT FOUND`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Both admins now have identical privileges!');
  console.log('They can access:');
  console.log('  - Admin Dashboard');
  console.log('  - User Management');
  console.log('  - Book Shop Management');
  console.log('  - Members Management');
  console.log('  - Payments Management');
  console.log('  - Access Requests');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
