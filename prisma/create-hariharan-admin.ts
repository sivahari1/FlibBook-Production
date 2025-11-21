import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'hariharanr@gmail.com';
  const password = 'Admin@123'; // Default password - CHANGE THIS AFTER FIRST LOGIN
  const name = 'Hariharan R';

  console.log('Creating admin user for:', email);

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Upsert the admin user
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      name,
      emailVerified: true,
      isActive: true,
      passwordHash: hashedPassword,
    },
    create: {
      email,
      passwordHash: hashedPassword,
      name,
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Admin user created/updated successfully!');
  console.log('Email:', admin.email);
  console.log('Name:', admin.name);
  console.log('Role:', admin.role);
  console.log('\n⚠️  Default Password: Admin@123');
  console.log('⚠️  IMPORTANT: Change this password after first login!\n');
}

main()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
