/**
 * Create or Update Admin Users
 * 
 * Creates admin users if they don't exist, or updates existing users to ADMIN role
 * For new users, password is read from ADMIN_SEED_PASSWORD environment variable
 * For existing users, just updates the role without changing password
 * 
 * Usage:
 *   ADMIN_SEED_PASSWORD=your_password npx tsx prisma/create-or-update-admins.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_ACCOUNTS = [
  { email: 'sivaramj83@gmail.com', name: 'Siva Hari' },
  { email: 'jsrkrishna3@gmail.com', name: 'JSR Krishna' }
]

async function main() {
  console.log('🔧 Creating or updating admin users...\n')

  // Check for password in environment (only needed for new users)
  const password = process.env.ADMIN_SEED_PASSWORD
  let passwordHash: string | null = null

  if (password) {
    passwordHash = await bcrypt.hash(password, 12)
    console.log('✅ Password provided for new admin accounts\n')
  } else {
    console.log('⚠️  No ADMIN_SEED_PASSWORD provided - will only update existing users\n')
  }

  for (const adminAccount of ADMIN_ACCOUNTS) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: adminAccount.email }
      })

      if (existingUser) {
        console.log(`📝 Updating existing user: ${adminAccount.email}`)
        
        // Update to ADMIN role and ensure account is active
        const updatedUser = await prisma.user.update({
          where: { email: adminAccount.email },
          data: {
            userRole: 'ADMIN',
            role: 'ADMIN', // Also update old role field for compatibility
            emailVerified: true, // Ensure email is verified
            isActive: true // Ensure account is active
          }
        })

        console.log(`✅ Updated ${adminAccount.email}:`)
        console.log(`   ID: ${updatedUser.id}`)
        console.log(`   Role: ${updatedUser.userRole}`)
        console.log(`   Email Verified: ${updatedUser.emailVerified}`)
        console.log(`   Active: ${updatedUser.isActive}`)
        console.log(`   Has Password: ${updatedUser.passwordHash ? 'Yes' : 'No'}\n`)
      } else {
        // User doesn't exist - create new admin
        if (!passwordHash) {
          console.log(`⚠️  Cannot create ${adminAccount.email} - ADMIN_SEED_PASSWORD not provided`)
          console.log(`   Set ADMIN_SEED_PASSWORD environment variable to create new admin users\n`)
          continue
        }

        const newUser = await prisma.user.create({
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

        console.log(`✅ Created new admin user: ${newUser.email}`)
        console.log(`   ID: ${newUser.id}`)
        console.log(`   Role: ${newUser.userRole}`)
        console.log(`   Email Verified: ${newUser.emailVerified}`)
        console.log(`   Active: ${newUser.isActive}\n`)
      }
    } catch (error) {
      console.error(`❌ Error processing ${adminAccount.email}:`, error)
    }
  }

  console.log('\n📊 Summary:')
  const adminCount = await prisma.user.count({
    where: { userRole: 'ADMIN' }
  })
  console.log(`Total ADMIN users: ${adminCount}`)

  const allAdmins = await prisma.user.findMany({
    where: { userRole: 'ADMIN' },
    select: { email: true, name: true, emailVerified: true, isActive: true }
  })

  console.log('\nAll Admin Users:')
  allAdmins.forEach(admin => {
    console.log(`  - ${admin.email} (${admin.name || 'No name'}) - Verified: ${admin.emailVerified}, Active: ${admin.isActive}`)
  })

  console.log('\n✅ Done! You can now login with these admin accounts.')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
