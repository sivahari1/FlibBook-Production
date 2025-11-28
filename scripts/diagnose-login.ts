import { prisma } from '../lib/db.js';
import bcrypt from 'bcryptjs';

async function diagnoseLogin() {
  try {
    console.log('🔍 Diagnosing login issue...\n');

    // Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Check if user exists
    const email = 'sivaramj8@gmail.com';
    console.log(`2. Looking for user: ${email}`);
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
        userRole: true,
        isActive: true,
        emailVerified: true,
        additionalRoles: true
      }
    });

    if (!user) {
      console.log('❌ User not found in database\n');
      console.log('Available users:');
      const allUsers = await prisma.user.findMany({
        select: { email: true, name: true, userRole: true }
      });
      console.table(allUsers);
      return;
    }

    console.log('✅ User found:');
    console.log({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userRole: user.userRole,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      additionalRoles: user.additionalRoles,
      hasPasswordHash: !!user.passwordHash
    });
    console.log('');

    // Test password
    console.log('3. Testing password...');
    const testPassword = 'Siva@123'; // Replace with actual password
    
    if (!user.passwordHash) {
      console.log('❌ No password hash found for user\n');
      return;
    }

    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log(`Password valid: ${isValid ? '✅' : '❌'}\n`);

    if (!isValid) {
      console.log('💡 Try resetting the password with:');
      console.log(`   npx ts-node scripts/reset-password.ts ${email} NewPassword123\n`);
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('⚠️  User account is inactive\n');
    }

    // Check email verification
    if (!user.emailVerified) {
      console.log('⚠️  Email not verified (but login should still work)\n');
    }

    console.log('4. Summary:');
    console.log('- Database: ✅ Connected');
    console.log(`- User exists: ${user ? '✅' : '❌'}`);
    console.log(`- Password valid: ${isValid ? '✅' : '❌'}`);
    console.log(`- Account active: ${user.isActive ? '✅' : '❌'}`);
    console.log(`- Email verified: ${user.emailVerified ? '✅' : '⚠️  (optional)'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseLogin();
