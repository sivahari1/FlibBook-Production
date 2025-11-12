/**
 * Script to mark all existing users as verified
 * Run this after deploying the email verification feature
 * to ensure existing users are not locked out
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markExistingUsersVerified() {
  try {
    console.log('Starting to mark existing users as verified...');

    // Update all users who don't have emailVerified set to true
    const result = await prisma.user.updateMany({
      where: {
        emailVerified: false,
      },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    console.log(`✓ Successfully marked ${result.count} users as verified`);
    
    // Get total user count for verification
    const totalUsers = await prisma.user.count();
    console.log(`Total users in database: ${totalUsers}`);
    
    // Verify all users are now verified
    const unverifiedCount = await prisma.user.count({
      where: {
        emailVerified: false,
      },
    });
    
    if (unverifiedCount === 0) {
      console.log('✓ All users are now verified');
    } else {
      console.warn(`⚠ Warning: ${unverifiedCount} users are still unverified`);
    }
  } catch (error) {
    console.error('Error marking users as verified:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

markExistingUsersVerified();
