import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createDemoUsers() {
  console.log('Creating demo users for quick login...')

  try {
    // Demo Platform User
    const platformUserEmail = 'user@example.com'
    const platformUserExists = await prisma.user.findUnique({
      where: { email: platformUserEmail }
    })

    if (!platformUserExists) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      await prisma.user.create({
        data: {
          email: platformUserEmail,
          name: 'Demo Platform User',
          password: hashedPassword,
          userRole: 'PLATFORM_USER',
          emailVerified: true,
          isActive: true
        }
      })
      console.log('✅ Created Platform User:', platformUserEmail)
    } else {
      console.log('ℹ️  Platform User already exists:', platformUserEmail)
    }

    // Demo Member User
    const memberEmail = 'member@example.com'
    const memberExists = await prisma.user.findUnique({
      where: { email: memberEmail }
    })

    if (!memberExists) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      await prisma.user.create({
        data: {
          email: memberEmail,
          name: 'Demo Member User',
          password: hashedPassword,
          userRole: 'MEMBER',
          emailVerified: true,
          isActive: true
        }
      })
      console.log('✅ Created Member User:', memberEmail)
    } else {
      console.log('ℹ️  Member User already exists:', memberEmail)
    }

    // Demo Admin User
    const adminEmail = 'admin@example.com'
    const adminExists = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Demo Admin User',
          password: hashedPassword,
          userRole: 'ADMIN',
          emailVerified: true,
          isActive: true
        }
      })
      console.log('✅ Created Admin User:', adminEmail)
    } else {
      console.log('ℹ️  Admin User already exists:', adminEmail)
    }

    console.log('\n✅ Demo users setup complete!')
    console.log('\nDemo Credentials:')
    console.log('─────────────────────────────────────────')
    console.log('Platform User:')
    console.log('  Email: user@example.com')
    console.log('  Password: password123')
    console.log('\nMember User:')
    console.log('  Email: member@example.com')
    console.log('  Password: password123')
    console.log('\nAdmin User:')
    console.log('  Email: admin@example.com')
    console.log('  Password: admin123')
    console.log('─────────────────────────────────────────')

  } catch (error) {
    console.error('Error creating demo users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createDemoUsers()
  .catch((error) => {
    console.error('Failed to create demo users:', error)
    process.exit(1)
  })
