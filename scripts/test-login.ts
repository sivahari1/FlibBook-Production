import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  console.log('🔍 Testing Login Functionality\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');
    
    // Get all users
    console.log('2. Fetching all users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        additionalRoles: true,
        isActive: true,
        emailVerified: true,
        passwordHash: true
      }
    });
    
    console.log(`✅ Found ${users.length} users:\n`);
    users.forEach(user => {
      console.log(`  - ${user.email}`);
      console.log(`    Name: ${user.name}`);
      console.log(`    Role: ${user.userRole}`);
      console.log(`    Additional Roles: ${user.additionalRoles?.join(', ') || 'None'}`);
      console.log(`    Active: ${user.isActive}`);
      console.log(`    Email Verified: ${user.emailVerified}`);
      console.log(`    Has Password: ${user.passwordHash ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Test password verification for each user
    console.log('3. Testing password verification...\n');
    
    const testPasswords = [
      { email: 'sivaroarj@gmail.com', password: 'Admin@123' },
      { email: 'hariharan@jstudyroom.dev', password: 'Admin@123' },
      { email: 'member@jstudyroom.dev', password: 'Member@123' }
    ];
    
    for (const test of testPasswords) {
      const user = users.find(u => u.email === test.email);
      if (user && user.passwordHash) {
        const isValid = await bcrypt.compare(test.password, user.passwordHash);
        console.log(`  ${test.email}:`);
        console.log(`    Password "${test.password}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      } else {
        console.log(`  ${test.email}: ⚠️  User not found or no password set`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
