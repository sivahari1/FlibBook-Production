import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to add additional roles to users
 * This allows users to have access to multiple dashboards
 * 
 * Usage:
 * npx ts-node scripts/add-additional-role.ts <email> <role>
 * 
 * Example:
 * npx ts-node scripts/add-additional-role.ts user@example.com MEMBER
 */

async function addAdditionalRole(email: string, role: UserRole) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        userRole: true,
        additionalRoles: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Check if role is the same as primary role
    if (user.userRole === role) {
      console.error(`❌ Cannot add ${role} as additional role - it's already the primary role`);
      process.exit(1);
    }

    // Check if role already exists in additional roles
    if (user.additionalRoles.includes(role)) {
      console.log(`ℹ️  User ${email} already has ${role} as an additional role`);
      process.exit(0);
    }

    // Add the role
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        additionalRoles: {
          push: role,
        },
      },
      select: {
        email: true,
        userRole: true,
        additionalRoles: true,
      },
    });

    console.log('✅ Successfully added additional role!');
    console.log('\nUser Details:');
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Primary Role: ${updatedUser.userRole}`);
    console.log(`Additional Roles: ${updatedUser.additionalRoles.join(', ') || 'None'}`);
    console.log('\n📊 Available Dashboards:');
    console.log(`- ${getRoleDashboard(updatedUser.userRole)} (Primary)`);
    updatedUser.additionalRoles.forEach(r => {
      console.log(`- ${getRoleDashboard(r)}`);
    });

  } catch (error) {
    console.error('❌ Error adding additional role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function getRoleDashboard(role: UserRole): string {
  const dashboards: Record<UserRole, string> = {
    ADMIN: '/admin - Admin Dashboard',
    PLATFORM_USER: '/dashboard - Platform Dashboard',
    MEMBER: '/member - Member Dashboard',
  };
  return dashboards[role] || 'Unknown';
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: npx ts-node scripts/add-additional-role.ts <email> <role>');
  console.error('\nAvailable roles: ADMIN, PLATFORM_USER, MEMBER');
  console.error('\nExample: npx ts-node scripts/add-additional-role.ts user@example.com MEMBER');
  process.exit(1);
}

const [email, roleStr] = args;

// Validate role
const validRoles: UserRole[] = ['ADMIN', 'PLATFORM_USER', 'MEMBER'];
if (!validRoles.includes(roleStr as UserRole)) {
  console.error(`❌ Invalid role: ${roleStr}`);
  console.error(`Available roles: ${validRoles.join(', ')}`);
  process.exit(1);
}

// Run the script
addAdditionalRole(email, roleStr as UserRole);
