import { prisma } from '../lib/db';

async function diagnoseRoleAccess() {
  console.log('🔍 Diagnosing Role Access Issue\n');
  console.log('=' .repeat(60));

  // Check the admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'sivaramj83@gmail.com' },
    select: {
      id: true,
      email: true,
      name: true,
      userRole: true,
      isActive: true,
    },
  });

  if (!adminUser) {
    console.log('❌ Admin user not found');
    return;
  }

  console.log('\n📋 Admin User Details:');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.name}`);
  console.log(`   Role: ${adminUser.userRole}`);
  console.log(`   Active: ${adminUser.isActive}`);

  // Check member users
  const memberUsers = await prisma.user.findMany({
    where: { userRole: 'MEMBER' },
    select: {
      id: true,
      email: true,
      name: true,
      userRole: true,
      isActive: true,
    },
    take: 5,
  });

  console.log(`\n👥 Member Users (${memberUsers.length} found):`);
  memberUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} - ${user.name} (Active: ${user.isActive})`);
  });

  console.log('\n🔐 Current Access Control Issues:');
  console.log('   ❌ Middleware allows ADMIN to access /member routes');
  console.log('   ❌ LoginForm allows ADMIN to login as any role');
  console.log('   ❌ Member dashboard shows admin data when admin accesses it');

  console.log('\n✅ Expected Behavior:');
  console.log('   ✓ ADMIN should ONLY access /admin routes');
  console.log('   ✓ MEMBER should ONLY access /member routes');
  console.log('   ✓ Login should reject role mismatch attempts');
  console.log('   ✓ Middleware should enforce strict role boundaries');

  console.log('\n' + '='.repeat(60));
}

diagnoseRoleAccess()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
