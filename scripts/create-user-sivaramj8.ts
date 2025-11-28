import { prisma } from '../lib/db.js';
import bcrypt from 'bcryptjs';

async function createUser() {
  try {
    console.log('Creating user with email: sivaramj8@gmail.com\n');

    const email = 'sivaramj8@gmail.com';
    const password = 'Siva@123'; // Change this to your preferred password
    const name = 'Siva Hari';

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      console.log('❌ User already exists with this email\n');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        userRole: 'ADMIN',
        role: 'ADMIN',
        emailVerified: true,
        isActive: true,
        additionalRoles: []
      }
    });

    console.log('✅ User created successfully!\n');
    console.log('Login credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: ADMIN\n`);
    console.log('You can now login at http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
