import { prisma } from '../lib/db';
import bcrypt from 'bcryptjs';

async function verifyPasswords() {
  console.log('🔍 Verifying Current Passwords...\n');

  const users = [
    { email: 'sivaramj83@gmail.com', password: 'Jsrk@9985' },
    { email: 'hariharanr@gmail.com', password: 'Admin@123' }
  ];

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    for (const testUser of users) {
      console.log(`\n📧 Checking: ${testUser.email}`);
      console.log('─'.repeat(50));

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          userRole: true,
          isActive: true,
          emailVerified: true
        }
      });

      if (!user) {
        console.log('❌ User not found in database\n');
        continue;
      }

      console.log(`✅ User found: ${user.name}`);
      console.log(`   - Role: ${user.userRole}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log(`   - Email Verified: ${user.emailVerified}`);
      console.log(`   - Password Hash: ${user.passwordHash.substring(0, 20)}...`);

      // Test password
      const isValid = await bcrypt.compare(testUser.password, user.passwordHash);
      console.log(`   - Password '${testUser.password}': ${isValid ? '✅ VALID' : '❌ INVALID'}`);

      if (!isValid) {
        console.log('\n⚠️  Password does not match! This will cause login failures.');
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Environment Check:');
    console.log('─'.repeat(50));
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`DIRECT_URL: ${process.env.DIRECT_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Not set'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPasswords();
