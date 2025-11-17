/**
 * Set Existing Users as Admins
 * 
 * Updates existing users to ADMIN role and ensures they can login
 * 
 * Usage:
 *   npx tsx prisma/set-admins.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_EMAILS = [
  'sivaramj83@gmail.com',
  'jsrkrishna3@gmail.com'
]

async function main() {
  console.log('🔧 Setting users as admins...\n')

  for (const email of ADMIN_EMAILS) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        console.log(`⚠️  User not found: ${email}`)
        console.log(`   This user needs to be created first.\n`)
        continue
      }

      // Update user to ADMIN role
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          userRole: 'ADMIN',
          role: 'ADMIN', // Also update old role field for compatibility
          emailVerified: true, // Ensure email is verified
          isActive: true // Ensure account is active
        }
      })

      console.log(`✅ Updated ${email}:`)
      console.log(`   ID: ${updatedUser.id}`)
      console.log(`   Role: ${updatedUser.userRole}`)
      console.log(`   Email Verified: ${updatedUser.emailVerified}`)
      console.log(`   Active: ${updatedUser.isActive}`)
      console.log(`   Has Password: ${updatedUser.passwordHash ? 'Yes' : 'No'}\n`)
    } catch (error) {
      console.error(`❌ Error updating ${email}:`, error)
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
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
