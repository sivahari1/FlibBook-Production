/**
 * Fix User Role for Dashboard Access
 * 
 * This script helps fix user roles to allow dashboard access for document management
 */

import { prisma } from '../lib/db';

async function fixUserRoleForDashboard() {
  try {
    console.log('🔍 Checking current user roles...\n');
    
    // Get all users with their current roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
        emailVerified: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    console.log('📋 Current Users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.userRole}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log('');
    });

    // Find users with MEMBER role who might need dashboard access
    const memberUsers = users.filter(user => user.userRole === 'MEMBER');
    
    if (memberUsers.length > 0) {
      console.log('🔧 Users with MEMBER role (redirected to jstudyroom):');
      memberUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} - Currently redirected to /member`);
      });
      
      console.log('\n💡 To fix dashboard access, you can:');
      console.log('1. Change user role to PLATFORM_USER for general dashboard access');
      console.log('2. Change user role to ADMIN for full admin + dashboard access');
      console.log('\nWould you like to update a user role? (This script is read-only for safety)');
      
      // Show the SQL commands to fix roles
      console.log('\n📝 SQL Commands to fix roles:');
      memberUsers.forEach(user => {
        console.log(`-- Change ${user.email} to PLATFORM_USER for dashboard access:`);
        console.log(`UPDATE "User" SET "userRole" = 'PLATFORM_USER' WHERE email = '${user.email}';`);
        console.log('');
        console.log(`-- OR change ${user.email} to ADMIN for full access:`);
        console.log(`UPDATE "User" SET "userRole" = 'ADMIN' WHERE email = '${user.email}';`);
        console.log('');
      });
    }

    // Check if there are any PLATFORM_USER or ADMIN users
    const dashboardUsers = users.filter(user => 
      user.userRole === 'PLATFORM_USER' || user.userRole === 'ADMIN'
    );
    
    if (dashboardUsers.length > 0) {
      console.log('✅ Users with dashboard access:');
      dashboardUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.userRole}) - Can access /dashboard`);
      });
    }

    console.log('\n📚 Role Explanation:');
    console.log('- MEMBER: Access to /member routes (jstudyroom, bookshop)');
    console.log('- PLATFORM_USER: Access to /dashboard routes (document management)');
    console.log('- ADMIN: Access to all routes (admin panel + dashboard + member)');
    console.log('- READER_USER: Access to /reader routes only');

  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixUserRoleForDashboard().catch(console.error);