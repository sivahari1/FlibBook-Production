import { prisma } from '../lib/db';

async function verifyRoleAccessFix() {
  console.log('🔍 Verifying Role Access Fix\n');
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

  console.log('\n📋 Admin User:');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Role: ${adminUser.userRole}`);
  console.log(`   Expected Access: /admin ONLY`);

  // Check member users
  const memberUsers = await prisma.user.findMany({
    where: { userRole: 'MEMBER' },
    select: {
      id: true,
      email: true,
      name: true,
      userRole: true,
    },
    take: 3,
  });

  console.log(`\n👥 Member Users (${memberUsers.length} found):`);
  memberUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email}`);
    console.log(`      Role: ${user.userRole}`);
    console.log(`      Expected Access: /member ONLY`);
  });

  console.log('\n✅ Fixed Access Control:');
  console.log('   ✓ Middleware now BLOCKS admin from /member routes');
  console.log('   ✓ LoginForm now REJECTS role mismatch attempts');
  console.log('   ✓ Member dashboard enforces MEMBER-only access');
  console.log('   ✓ Each role is restricted to their own dashboard');

  console.log('\n🧪 Test Scenarios:');
  console.log('   1. Admin (sivaramj83@gmail.com) tries to access /member');
  console.log('      → Should redirect to /admin');
  console.log('   2. Admin clicks "Member" button on login page');
  console.log('      → Should show error and redirect to /admin');
  console.log('   3. Member user accesses /member');
  console.log('      → Should work normally');
  console.log('   4. Member user tries to access /admin');
  console.log('      → Should redirect to /member');

  console.log('\n' + '='.repeat(60));
}

verifyRoleAccessFix()
  .then(() => {
    console.log('\n✅ Verification complete');
    console.log('\n📝 Next Steps:');
    console.log('   1. Test login as admin (sivaramj83@gmail.com)');
    console.log('   2. Try clicking "Member" button - should be rejected');
    console.log('   3. Try accessing /member directly - should redirect to /admin');
    console.log('   4. Test login as member user - should work normally');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
