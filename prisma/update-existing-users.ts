/**
 * Update Existing Users Script
 * 
 * Sets all existing users (except admin) to PLATFORM_USER role
 * This ensures backward compatibility after adding role-based access control
 * 
 * Usage:
 *   npx tsx prisma/update-existing-users.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'sivaramj83@gmail.com'

async function main() {
  console.log('🔄 Updating existing users to PLATFORM_USER role...')

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      userRole: true
    }
  })

  console.log(`Found ${users.length} users`)

  let updatedCount = 0
  let skippedCount = 0
  let adminCount = 0

  for (const user of users) {
    // Skip if already has a role set (not default READER_USER)
    if (user.userRole === 'ADMIN') {
      console.log(`  ⏭️  Skipping ${user.email} (already ADMIN)`)
      adminCount++
      continue
    }

    if (user.userRole === 'PLATFORM_USER') {
      console.log(`  ⏭️  Skipping ${user.email} (already PLATFORM_USER)`)
      skippedCount++
      continue
    }

    // Update to PLATFORM_USER (except admin email)
    if (user.email === ADMIN_EMAIL) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          userRole: 'ADMIN',
          role: 'ADMIN' // Also update old role field
        }
      })
      console.log(`  ✅ Updated ${user.email} to ADMIN`)
      adminCount++
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { userRole: 'PLATFORM_USER' }
      })
      console.log(`  ✅ Updated ${user.email} to PLATFORM_USER`)
      updatedCount++
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Total users: ${users.length}`)
  console.log(`   Updated to PLATFORM_USER: ${updatedCount}`)
  console.log(`   Admin users: ${adminCount}`)
  console.log(`   Already set (skipped): ${skippedCount}`)
  console.log('\n✅ Migration complete!')
}

main()
  .catch((error) => {
    console.error('❌ Error updating users:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
