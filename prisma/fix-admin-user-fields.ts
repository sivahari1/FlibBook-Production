import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminUserFields() {
  try {
    console.log('Fixing admin user fields...');

    // Find all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        userRole: 'ADMIN',
      },
    });

    console.log(`Found ${adminUsers.length} admin user(s)`);

    for (const admin of adminUsers) {
      console.log(`\nChecking admin: ${admin.email}`);
      
      const updates: any = {};
      
      // Check and fix subscription field
      if (!admin.subscription) {
        updates.subscription = 'free';
        console.log('  - Setting subscription to "free"');
      }
      
      // Check and fix storageUsed field
      if (admin.storageUsed === null || admin.storageUsed === undefined) {
        updates.storageUsed = BigInt(0);
        console.log('  - Setting storageUsed to 0');
      }
      
      // Check and fix emailVerified field
      if (!admin.emailVerified) {
        updates.emailVerified = true;
        updates.emailVerifiedAt = new Date();
        console.log('  - Setting emailVerified to true');
      }
      
      // Check and fix isActive field
      if (!admin.isActive) {
        updates.isActive = true;
        console.log('  - Setting isActive to true');
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: admin.id },
          data: updates,
        });
        console.log('  ✓ Admin user updated successfully');
      } else {
        console.log('  ✓ Admin user already has all required fields');
      }
    }

    console.log('\n✅ All admin users have been checked and fixed!');
  } catch (error) {
    console.error('❌ Error fixing admin users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixAdminUserFields()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
