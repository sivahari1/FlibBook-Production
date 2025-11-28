import { prisma } from '../lib/db';
import bcrypt from 'bcryptjs';

async function diagnoseLogin() {
  console.log('🔍 Diagnosing Production Login Issue...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');

    // Test 2: Check if user exists
    const testEmail = 'sivaramj83@gmail.com';
    console.log(`2️⃣ Checking if user exists: ${testEmail}`);
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        userRole: true,
        additionalRoles: true,
        isActive: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found in database\n');
      return;
    }

    console.log('✅ User found:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name}`);
    console.log(`   - Role: ${user.userRole}`);
    console.log(`   - Additional Roles: ${user.additionalRoles?.join(', ') || 'None'}`);
    console.log(`   - Active: ${user.isActive}`);
    console.log(`   - Email Verified: ${user.emailVerified}`);
    console.log(`   - Created: ${user.createdAt}`);
    console.log(`   - Password Hash Length: ${user.passwordHash?.length || 0}\n`);

    // Test 3: Check environment variables
    console.log('3️⃣ Checking environment variables...');
    console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - DIRECT_URL: ${process.env.DIRECT_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Missing'}`);
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}\n`);

    // Test 4: Test password verification
    console.log('4️⃣ Testing password verification...');
    const testPassword = 'Siva@1234'; // Default password
    try {
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`   - Password '${testPassword}': ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);
    } catch (error) {
      console.log(`   - ❌ Error verifying password: ${error}\n`);
    }

    // Test 5: Check session configuration
    console.log('5️⃣ Session Configuration:');
    console.log(`   - Cookie Name (Production): __Secure-next-auth.session-token`);
    console.log(`   - Cookie Name (Development): next-auth.session-token`);
    console.log(`   - Secure Cookies: ${process.env.NODE_ENV === 'production' ? 'Yes' : 'No'}`);
    console.log(`   - SameSite: lax\n`);

    console.log('✅ Diagnosis complete!');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseLogin();
