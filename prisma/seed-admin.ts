/**
 * Admin User Seed Script
 * 
 * Creates the admin user account for sivaramj83@gmail.com
 * Password is read from ADMIN_SEED_PASSWORD environment variable
 * 
 * Usage:
 *   ADMIN_SEED_PASSWORD=your_password npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_ACCOUNTS = [
  { email: 'sivaramj83@gmail.com', name: 'Admin' },
  { email: 'jsrkrishna3@gmail.com', name: 'Admin' },
  { email: 'support@jstudyroom.dev', name: 'jstudyroom Support' }
]

async function main() {
  console.log('🌱 Seeding admin users...')

  // Check for password in environment
  const password = process.env.ADMIN_SEED_PASSWORD
  if (!password) {
    console.error('❌ Error: ADMIN_SEED_PASSWORD environment variable is required')
    console.error('Usage: ADMIN_SEED_PASSWORD=your_password npx tsx prisma/seed-admin.ts')
    process.exit(1)
  }

  // Hash the password once
  const passwordHash = await bcrypt.hash(password, 12)

  // Create or update each admin account
  for (const adminAccount of ADMIN_ACCOUNTS) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminAccount.email }
    })

    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${adminAccount.email}`)
      
      // Update to ensure they have ADMIN role
      if (existingAdmin.userRole !== 'ADMIN') {
        await prisma.user.update({
          where: { email: adminAccount.email },
          data: { userRole: 'ADMIN' }
        })
        console.log(`✅ Updated ${adminAccount.email} to ADMIN role`)
      } else {
        console.log(`✅ ${adminAccount.email} already has ADMIN role`)
      }
    } else {
      // Create admin user
      const admin = await prisma.user.create({
        data: {
          email: adminAccount.email,
          name: adminAccount.name,
          passwordHash,
          userRole: 'ADMIN',
          role: 'ADMIN', // Also set old role field for compatibility
          emailVerified: true,
          isActive: true,
          subscription: 'admin',
          notes: 'Platform administrator account'
        }
      })

      console.log(`✅ Admin user created successfully: ${admin.email}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   Role: ${admin.userRole}`)
      console.log(`   Email Verified: ${admin.emailVerified}`)
    }
  }
}

main()
  .catch((error) => {
    console.error('❌ Error seeding admin user:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
